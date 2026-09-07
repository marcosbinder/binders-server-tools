/**
 * @file musicProvider.js
 * @description Music metadata provider supporting iTunes, Deezer fallback, and Spotify link generation
 */

/**
 * Formats duration in milliseconds or raw seconds to m:ss
 * @param {number} valueInSecondsOrMs 
 * @returns {string}
 */
function formatDuration(valueInSecondsOrMs) {
    if (!valueInSecondsOrMs && valueInSecondsOrMs !== 0) return '0:00';
    const totalSeconds = valueInSecondsOrMs > 10000
        ? Math.floor(valueInSecondsOrMs / 1000)
        : Math.floor(valueInSecondsOrMs);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

/**
 * Upscales iTunes artwork to 1000x1000 high-res
 * @param {string|null} url 
 * @returns {string|null}
 */
function upscaleArtwork(url) {
    if (!url) return null;
    return url.replace(/\d+x\d+bb\.jpg$/, '1000x1000bb.jpg');
}

/**
 * Queries iTunes Search API
 * @param {string} query 
 * @param {typeof fetch} [fetchFn] 
 * @returns {Promise<Object|null>}
 */
async function searchITunes(query, fetchFn = globalThis.fetch) {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=1`;
    const res = await fetchFn(url);
    if (!res.ok) throw new Error(`iTunes API error: ${res.status}`);
    const data = await res.json();
    if (!data.results || data.results.length === 0) return null;
    const track = data.results[0];
    return {
        provider: 'iTunes / Apple Music',
        title: track.trackName,
        artist: track.artistName,
        album: track.collectionName,
        duration: formatDuration(track.trackTimeMillis),
        durationRaw: track.trackTimeMillis,
        releaseDate: track.releaseDate ? track.releaseDate.split('T')[0] : null,
        genre: track.primaryGenreName,
        artworkUrl: upscaleArtwork(track.artworkUrl100),
        previewUrl: track.previewUrl,
        url: track.trackViewUrl,
    };
}

/**
 * Queries Deezer Search API
 * @param {string} query 
 * @param {typeof fetch} [fetchFn] 
 * @returns {Promise<Object|null>}
 */
async function searchDeezer(query, fetchFn = globalThis.fetch) {
    const url = `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=1`;
    const res = await fetchFn(url);
    if (!res.ok) throw new Error(`Deezer API error: ${res.status}`);
    const data = await res.json();
    if (!data.data || data.data.length === 0) return null;
    const track = data.data[0];
    return {
        provider: 'Deezer',
        title: track.title,
        artist: track.artist?.name || 'Desconhecido',
        album: track.album?.title || 'Desconhecido',
        duration: formatDuration(track.duration),
        durationRaw: track.duration,
        releaseDate: null,
        genre: null,
        artworkUrl: track.album?.cover_xl || track.album?.cover_medium || track.album?.cover_big || null,
        previewUrl: track.preview,
        url: track.link,
    };
}

/**
 * Multi-provider search with fallback to Deezer and Spotify Search Link
 * @param {string} query 
 * @param {typeof fetch} [fetchFn] 
 * @returns {Promise<Object>}
 */
async function searchMusicWithFallback(query, fetchFn = globalThis.fetch) {
    // 1. Try iTunes
    try {
        const itunesResult = await searchITunes(query, fetchFn);
        if (itunesResult) return itunesResult;
    } catch (e) {
        // Fall through to Deezer
    }

    // 2. Try Deezer
    try {
        const deezerResult = await searchDeezer(query, fetchFn);
        if (deezerResult) return deezerResult;
    } catch (e) {
        // Fall through to Spotify link
    }

    // 3. Fallback Spotify search link
    return {
        provider: 'Spotify Search Link',
        title: query,
        artist: 'Unknown',
        album: 'N/A',
        duration: 'N/A',
        artworkUrl: null,
        previewUrl: null,
        url: `https://open.spotify.com/search/${encodeURIComponent(query)}`,
    };
}

const FALLBACK_TOP10 = [
    { position: 1, title: 'Die With A Smile', artist: 'Lady Gaga & Bruno Mars', duration: '4:11', spotifyUrl: 'https://open.spotify.com/search/Die%20With%20A%20Smile' },
    { position: 2, title: 'Birds of a Feather', artist: 'Billie Eilish', duration: '3:03', spotifyUrl: 'https://open.spotify.com/search/Birds%20of%20a%20Feather' },
    { position: 3, title: 'Espresso', artist: 'Sabrina Carpenter', duration: '2:55', spotifyUrl: 'https://open.spotify.com/search/Espresso%20Sabrina%20Carpenter' },
    { position: 4, title: 'Taste', artist: 'Sabrina Carpenter', duration: '2:37', spotifyUrl: 'https://open.spotify.com/search/Taste%20Sabrina%20Carpenter' },
    { position: 5, title: 'Good Luck, Babe!', artist: 'Chappell Roan', duration: '3:38', spotifyUrl: 'https://open.spotify.com/search/Good%20Luck%20Babe' },
    { position: 6, title: 'Not Like Us', artist: 'Kendrick Lamar', duration: '4:34', spotifyUrl: 'https://open.spotify.com/search/Not%20Like%20Us' },
    { position: 7, title: 'Beautiful Things', artist: 'Benson Boone', duration: '3:00', spotifyUrl: 'https://open.spotify.com/search/Beautiful%20Things' },
    { position: 8, title: 'Gata Only', artist: 'FloyyMenor & Cris Mj', duration: '3:42', spotifyUrl: 'https://open.spotify.com/search/Gata%20Only' },
    { position: 9, title: 'Please Please Please', artist: 'Sabrina Carpenter', duration: '3:06', spotifyUrl: 'https://open.spotify.com/search/Please%20Please%20Please' },
    { position: 10, title: 'Too Sweet', artist: 'Hozier', duration: '4:11', spotifyUrl: 'https://open.spotify.com/search/Too%20Sweet%20Hozier' },
];

/**
 * Fetches the Top 10 most played / trending songs globally via Deezer chart or curated Spotify fallback
 * @param {typeof fetch} [fetchFn] 
 * @returns {Promise<{ tracks: Array<Object>, provider: string, playlistUrl: string }>}
 */
async function fetchTop10Tracks(fetchFn = globalThis.fetch) {
    try {
        const url = 'https://api.deezer.com/chart/0/tracks?limit=10';
        const res = await fetchFn(url);
        if (res.ok) {
            const data = await res.json();
            if (data.data && Array.isArray(data.data) && data.data.length > 0) {
                const tracks = data.data.slice(0, 10).map((t, idx) => ({
                    position: idx + 1,
                    title: t.title,
                    artist: t.artist?.name || 'Desconhecido',
                    album: t.album?.title || 'Single',
                    duration: formatDuration(t.duration),
                    url: t.link,
                    spotifyUrl: `https://open.spotify.com/search/${encodeURIComponent(`${t.title} ${t.artist?.name || ''}`)}`,
                    artworkUrl: t.album?.cover_medium || t.album?.cover_xl || null,
                    previewUrl: t.preview || null,
                }));
                return {
                    provider: 'Deezer Top Global & Spotify Search',
                    tracks,
                    playlistUrl: 'https://open.spotify.com/playlist/37i9dQZEVXbMDoHDwVN2tF',
                };
            }
        }
    } catch (_) {}

    return {
        provider: 'Spotify Global Charts (Curated Fallback)',
        tracks: FALLBACK_TOP10.map(t => ({
            ...t,
            url: t.spotifyUrl,
            artworkUrl: null,
            previewUrl: null,
        })),
        playlistUrl: 'https://open.spotify.com/playlist/37i9dQZEVXbMDoHDwVN2tF',
    };
}

module.exports = {
    formatDuration,
    upscaleArtwork,
    searchITunes,
    searchDeezer,
    searchMusicWithFallback,
    fetchTop10Tracks,
    FALLBACK_TOP10,
};
