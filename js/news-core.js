// Vérification des nouveautés (films, séries, épisodes). Script CLASSIQUE (pas un module) :
// il est chargé par la page (index.html) ET par le service worker (importScripts).
// Aucune donnée personnelle n'est envoyée : seules des requêtes de catalogue (TMDB, TVmaze) partent.
(function (g) {
  'use strict';
  const TMDB = 'https://api.themoviedb.org/3';
  const IMG = 'https://image.tmdb.org/t/p/w342';
  const DAY = 86400000;
  const MAX_NOTIFY = 3, MAX_SEEN = 800, MAX_FOLLOWED = 20;

  // Libellés français (cochés par la personne) -> identifiants de genres TMDB.
  // Ces libellés sont aussi la liste autorisée dans firestore.rules : ne pas les modifier sans mettre les règles à jour.
  const MOVIE_GENRES = {
    'Action': [28], 'Aventure': [12], 'Animation': [16], 'Comédie': [35], 'Crime': [80],
    'Documentaire': [99], 'Drame': [18], 'Familial': [10751], 'Fantastique': [14], 'Histoire': [36],
    'Horreur': [27], 'Musique': [10402], 'Mystère': [9648], 'Romance': [10749],
    'Science-fiction': [878], 'Thriller': [53], 'Guerre': [10752], 'Western': [37]
  };
  const TV_GENRES = {
    'Action & aventure': [10759], 'Animation': [16], 'Comédie': [35], 'Crime': [80],
    'Documentaire': [99], 'Drame': [18], 'Familial': [10751, 10762], 'Mystère': [9648],
    'Science-fiction & fantastique': [10765], 'Guerre & politique': [10768], 'Western': [37]
  };

  const pad = n => String(n).padStart(2, '0');
  const isoDay = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const addDays = (d, n) => new Date(d.getTime() + n * DAY);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const norm = v => String(v == null ? '' : v).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  // ---------- Stockage IndexedDB (partagé page / service worker) ----------
  function openDb() {
    return new Promise((res, rej) => {
      try {
        const r = indexedDB.open('lisiere-news', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('kv');
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      } catch (e) { rej(e); }
    });
  }
  async function idb(mode, fn) {
    try {
      const db = await openDb();
      return await new Promise((res, rej) => {
        const tx = db.transaction('kv', mode), store = tx.objectStore('kv'), req = fn(store);
        tx.oncomplete = () => { db.close(); res(req ? req.result : undefined); };
        tx.onerror = tx.onabort = () => { db.close(); rej(tx.error); };
      });
    } catch { return undefined; }
  }
  const idbGet = k => idb('readonly', s => s.get(k));
  const idbSet = (k, v) => idb('readwrite', s => s.put(v, k));
  const idbDel = k => idb('readwrite', s => s.delete(k));

  // ---------- Réseau ----------
  async function getJSON(url, f) {
    const r = await (f || fetch)(url, { signal: AbortSignal.timeout(15000), credentials: 'omit', referrerPolicy: 'no-referrer' });
    if (!r.ok) throw Error('HTTP ' + r.status);
    return r.json();
  }
  function tmdbUrl(path, params, key) {
    const u = new URL(TMDB + path);
    u.search = new URLSearchParams({ api_key: key, language: 'fr-FR', include_adult: 'false', ...params });
    return u.href;
  }
  const idsFor = (labels, map) => [...new Set((labels || []).flatMap(l => map[l] || []))];
  function labelsFor(ids, map) {
    const out = [];
    for (const [label, list] of Object.entries(map)) if ((ids || []).some(i => list.includes(i))) out.push(label);
    return out;
  }

  function movieItem(m, when) {
    if (!m || !m.id || !m.title || !m.poster_path) return null;
    return {
      key: 'movie:' + m.id, kind: 'movie', source: 'TMDB', id: String(m.id), catalogId: 'movie:' + m.id,
      title: String(m.title).slice(0, 250), date: /^\d{4}-\d{2}-\d{2}$/.test(m.release_date || '') ? m.release_date : '',
      year: String(m.release_date || '').slice(0, 4), overview: String(m.overview || '').slice(0, 2000),
      poster: IMG + m.poster_path, genres: labelsFor(m.genre_ids, MOVIE_GENRES), vote: Number(m.vote_average) || 0,
      url: 'https://www.themoviedb.org/movie/' + m.id, when
    };
  }
  function tvItem(m, when) {
    if (!m || !m.id || !m.name || !m.poster_path) return null;
    return {
      key: 'tv:' + m.id, kind: 'series', source: 'TMDB', id: String(m.id), catalogId: 'tv:' + m.id,
      title: String(m.name).slice(0, 250), date: /^\d{4}-\d{2}-\d{2}$/.test(m.first_air_date || '') ? m.first_air_date : '',
      year: String(m.first_air_date || '').slice(0, 4), overview: String(m.overview || '').slice(0, 2000),
      poster: IMG + m.poster_path, genres: labelsFor(m.genre_ids, TV_GENRES), vote: Number(m.vote_average) || 0,
      url: 'https://www.themoviedb.org/tv/' + m.id, when
    };
  }

  // ---------- Épisodes des séries suivies ----------
  function evWhen(ts, now) {
    const diff = ts - now;
    if (diff < -36 * 3600000 || diff > 36 * 3600000) return '';
    return diff < -3600000 ? 'aired' : diff < 12 * 3600000 ? 'today' : 'tomorrow';
  }
  async function followedEpisodes(snap, f, pause) {
    const out = [], errors = [], now = Date.now();
    const list = (snap.followed || []).slice(0, MAX_FOLLOWED);
    for (const s of list) {
      try {
        if (s.src === 'tvmaze' && /^\d{1,9}$/.test(s.id)) {
          const d = await getJSON(`https://api.tvmaze.com/shows/${s.id}?embed[]=nextepisode&embed[]=previousepisode`, f);
          const next = d._embedded && d._embedded.nextepisode, prev = d._embedded && d._embedded.previousepisode;
          for (const e of [prev, next]) {
            if (!e || !e.id || !e.airstamp) continue;
            const ts = Date.parse(e.airstamp);
            if (isNaN(ts) || ts < now - 36 * 3600000 || ts > now + 30 * DAY) continue;
            out.push({ key: `ep:tvmaze:${s.id}:${e.id}`, kind: 'episode', show: s.title, season: e.season || 0, number: e.number || 0, date: String(e.airstamp).slice(0, 10), ts, when: evWhen(ts, now), premiere: e.number === 1 && e.season > 1, url: 'https://www.tvmaze.com/shows/' + s.id });
          }
        } else if (s.src === 'tmdb' && /^\d{1,9}$/.test(s.id) && snap.tmdbKey) {
          const d = await getJSON(tmdbUrl('/tv/' + s.id, {}, snap.tmdbKey), f);
          for (const e of [d.last_episode_to_air, d.next_episode_to_air]) {
            if (!e || !e.id || !/^\d{4}-\d{2}-\d{2}$/.test(e.air_date || '')) continue;
            const ts = Date.parse(e.air_date + 'T12:00:00Z');
            if (isNaN(ts) || ts < now - 36 * 3600000 || ts > now + 30 * DAY) continue;
            out.push({ key: `ep:tmdb:${s.id}:${e.id}`, kind: 'episode', show: s.title, season: e.season_number || 0, number: e.episode_number || 0, date: e.air_date, ts, when: evWhen(ts, now), premiere: e.episode_number === 1 && e.season_number > 1, url: 'https://www.themoviedb.org/tv/' + s.id });
          }
        }
      } catch { errors.push(s.src); }
      await pause(s.src === 'tvmaze' ? 700 : 150);
    }
    out.sort((a, b) => a.ts - b.ts);
    return { episodes: out, errors };
  }

  // ---------- Vérification complète ----------
  // snap : instantané préparé par la page (clé TMDB, genres effectifs, séries suivies, options).
  // seen : tableau des clés déjà vues, ou null à la toute première vérification (aucune notification, juste une base).
  async function run(snap, seen, opts) {
    const o = opts || {}, f = o.fetch, pause = o.sleep || sleep, today = o.today || new Date();
    const out = { feed: [], episodes: [], errors: [], notify: [], seen: [], needsKey: !snap.tmdbKey, at: Date.now() };
    const gM = idsFor(snap.genresMovie, MOVIE_GENRES).join('|'), gT = idsFor(snap.genresSeries, TV_GENRES).join('|');
    const region = snap.region || 'FR';
    if (snap.tmdbKey && snap.media !== false) {
      const t0 = isoDay(today), tPast = isoDay(addDays(today, -21)), tYest = isoDay(addDays(today, -1)), tFut = isoDay(addDays(today, 90)), tSeriesPast = isoDay(addDays(today, -30));
      const base = { sort_by: 'popularity.desc', region };
      const calls = [
        ['movie-recent', tmdbUrl('/discover/movie', { ...base, 'release_date.gte': tPast, 'release_date.lte': tYest, with_release_type: '2|3', ...(gM ? { with_genres: gM } : {}) }, snap.tmdbKey), r => (r.results || []).map(m => movieItem(m, 'recent'))],
        ['movie-upcoming', tmdbUrl('/discover/movie', { ...base, 'release_date.gte': t0, 'release_date.lte': tFut, with_release_type: '2|3', ...(gM ? { with_genres: gM } : {}) }, snap.tmdbKey), r => (r.results || []).map(m => movieItem(m, 'upcoming'))],
        ['tv-new', tmdbUrl('/discover/tv', { sort_by: 'popularity.desc', 'first_air_date.gte': tSeriesPast, 'first_air_date.lte': tFut, ...(gT ? { with_genres: gT } : {}) }, snap.tmdbKey), r => (r.results || []).map(m => tvItem(m, m.first_air_date && m.first_air_date > t0 ? 'upcoming' : 'recent'))]
      ];
      const settled = await Promise.allSettled(calls.map(([, url]) => getJSON(url, f)));
      settled.forEach((s, i) => {
        if (s.status === 'fulfilled') out.feed.push(...calls[i][2](s.value).filter(Boolean));
        else out.errors.push(calls[i][0]);
      });
    }
    // Séries suivies : seulement si l'option est active et qu'il y en a.
    if (snap.followed && snap.followed.length && snap.media !== false) {
      const r = await followedEpisodes(snap, f, pause);
      out.episodes = r.episodes; out.errors.push(...r.errors);
    }
    out.feed = [...new Map(out.feed.map(i => [i.key, i])).values()];
    // Retire ce que la personne possède déjà.
    const ownedKeys = new Set(snap.ownedKeys || []), ownedTitles = new Set(snap.ownedTitles || []);
    out.feed = out.feed.filter(i => !ownedKeys.has(i.catalogId) && !ownedTitles.has(norm(i.title) + '|' + i.year));
    // Correspondance avec les genres, tri : correspondances d'abord, puis popularité d'origine.
    const want = { movie: new Set(snap.genresMovie || []), series: new Set(snap.genresSeries || []) };
    for (const i of out.feed) i.match = i.genres.filter(x => want[i.kind].has(x));
    const order = new Map(out.feed.map((i, n) => [i.key, n]));
    out.feed.sort((a, b) => (b.match.length > 0) - (a.match.length > 0) || order.get(a.key) - order.get(b.key));

    // Notifications.
    const known = new Set(seen || []);
    const cand = [];
    if (seen) {
      for (const i of out.feed) {
        if (known.has(i.key) || !i.match.length) continue;
        if (i.kind === 'movie' && !snap.notifyMovies) continue;
        if (i.kind === 'series' && !snap.notifySeries) continue;
        const date = i.date ? ' · ' + frDate(i.date) : '';
        cand.push({ key: i.key, title: i.kind === 'movie' ? 'Nouveau film pour vous' : 'Nouvelle série pour vous', body: `${i.title}${date} (${i.match.join(', ')})`, url: './#reco' });
      }
    }
    // Épisodes des séries suivies : utiles même à la toute première vérification (aucune liste de base nécessaire).
    if (snap.notifyFollowed) {
      for (const e of out.episodes) {
        const ep = e.number ? `S${e.season} E${e.number}` : 'nouvel épisode';
        if (e.when && !known.has(e.key)) cand.push({ key: e.key, title: e.show, body: `${ep} ${e.when === 'aired' ? 'est disponible' : e.when === 'today' ? 'sort aujourd’hui' : 'sort demain'}`, url: './#reco' });
        const sk = e.key.replace(/^ep:/, 'season:');
        if (e.premiere && !e.when && !known.has(sk)) cand.push({ key: sk, title: e.show, body: `Saison ${e.season} annoncée pour le ${frDate(e.date)}`, url: './#reco' });
      }
    }
    const shown = cand.slice(0, MAX_NOTIFY);
    if (cand.length > MAX_NOTIFY) shown.push({ key: 'more:' + Date.now(), title: 'Lisière', body: `et ${cand.length - MAX_NOTIFY} autre(s) nouveauté(s) dans « Pour vous »`, url: './#reco' });
    out.notify = shown;
    // Mémoire des clés vues : on marque tout ce qui est apparu (même sans notification) pour ne pas répéter.
    const all = [...known];
    const add = k => { if (!known.has(k)) { known.add(k); all.push(k); } };
    out.feed.forEach(i => add(i.key));
    out.episodes.forEach(e => { add(e.key); add(e.key.replace(/^ep:/, 'season:')); });
    out.seen = all.slice(-MAX_SEEN);
    return out;
  }
  function frDate(iso) {
    const [y, m, d] = String(iso).split('-').map(Number);
    if (!y) return '';
    return new Date(y, m - 1, d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
  }

  // Vérification lancée par le système en arrière-plan (Android, application installée).
  async function backgroundCheck(reg) {
    const snap = await idbGet('snap');
    if (!snap || !snap.uid || !(snap.notifyMovies || snap.notifySeries || snap.notifyFollowed)) return;
    const seen = await idbGet('seen:' + snap.uid);
    const r = await run(snap, seen === undefined ? null : seen);
    await idbSet('seen:' + snap.uid, r.seen);
    await idbSet('feed:' + snap.uid, { at: r.at, feed: r.feed, episodes: r.episodes, errors: r.errors, needsKey: r.needsKey });
    for (const n of r.notify) {
      await reg.showNotification(n.title, { body: n.body, icon: './icons/icon-192.png', badge: './icons/icon-192.png', tag: n.key, data: { url: n.url } });
    }
  }

  g.LisiereNews = { MOVIE_GENRES, TV_GENRES, run, backgroundCheck, idbGet, idbSet, idbDel, frDate, norm };
})(typeof self !== 'undefined' ? self : this);
