// tests/tier1_features/r5_music_lookup.test.js
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const mockHttp = require('../helpers/mockHttp.js');

describe('Requirement R5: Music Information Lookup', () => {
    // Utility functions for Music Service contract
    const formatDuration = (valueInSecondsOrMs) => {
        const totalSeconds = valueInSecondsOrMs > 10000 ? Math.floor(valueInSecondsOrMs / 1000) : Math.floor(valueInSecondsOrMs);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    const upscaleArtwork = (url) => {
        if (!url) return null;
        return url.replace(/100x100bb\.jpg$/, '1000x1000bb.jpg');
    };

    const searchITunes = async (query, fetchFn = globalThis.fetch) => {
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
    };

    const searchDeezer = async (query, fetchFn = globalThis.fetch) => {
        const url = `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=1`;
        const res = await fetchFn(url);
        if (!res.ok) throw new Error(`Deezer API error: ${res.status}`);
        const data = await res.json();
        if (!data.data || data.data.length === 0) return null;
        const track = data.data[0];
        return {
            provider: 'Deezer',
            title: track.title,
            artist: track.artist.name,
            album: track.album.title,
            duration: formatDuration(track.duration),
            durationRaw: track.duration,
            releaseDate: null,
            genre: null,
            artworkUrl: track.album.cover_xl || track.album.cover_medium,
            previewUrl: track.preview,
            url: track.link,
        };
    };

    const searchMusicWithFallback = async (query, fetchFn = globalThis.fetch) => {
        // Try iTunes
        try {
            const itunesResult = await searchITunes(query, fetchFn);
            if (itunesResult) return itunesResult;
        } catch (e) {
            // Fall through to Deezer
        }

        // Try Deezer
        try {
            const deezerResult = await searchDeezer(query, fetchFn);
            if (deezerResult) return deezerResult;
        } catch (e) {
            // Fall through to Spotify Link
        }

        // Fallback
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
    };

    test('R5.1: Formats track duration correctly for milliseconds and raw seconds', () => {
        assert.equal(formatDuration(354320), '5:54', '354320ms should format to 5:54');
        assert.equal(formatDuration(65000), '1:05', '65000ms should format to 1:05');
        assert.equal(formatDuration(354), '5:54', '354 seconds should format to 5:54');
        assert.equal(formatDuration(9), '0:09', '9 seconds should format to 0:09');
    });

    test('R5.2: Upscales iTunes album artwork from 100x100 to 1000x1000 high-res', () => {
        const originalUrl = 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/100x100bb.jpg';
        const upscaled = upscaleArtwork(originalUrl);
        assert.equal(upscaled, 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/1000x1000bb.jpg');
    });

    test('R5.3: Successfully queries iTunes API for track metadata and audio preview', async () => {
        const { mockFetchFn } = mockHttp.createMockFetch();
        const track = await searchITunes('Queen Bohemian Rhapsody', mockFetchFn);

        assert.ok(track, 'Track should be found on iTunes');
        assert.equal(track.title, 'Bohemian Rhapsody');
        assert.equal(track.artist, 'Queen');
        assert.equal(track.album, 'A Night at the Opera (Deluxe Edition)');
        assert.equal(track.duration, '5:54');
        assert.equal(track.genre, 'Rock');
        assert.ok(track.artworkUrl.includes('1000x1000bb.jpg'));
        assert.ok(track.previewUrl.endsWith('.m4a'));
        assert.ok(track.url.startsWith('https://music.apple.com'));
    });

    test('R5.4: Successfully queries Deezer API for track metadata and cover artwork', async () => {
        const { mockFetchFn } = mockHttp.createMockFetch();
        const track = await searchDeezer('Queen Bohemian Rhapsody', mockFetchFn);

        assert.ok(track, 'Track should be found on Deezer');
        assert.equal(track.title, 'Bohemian Rhapsody');
        assert.equal(track.artist, 'Queen');
        assert.equal(track.album, 'A Night At The Opera');
        assert.equal(track.duration, '5:54');
        assert.ok(track.artworkUrl.includes('1000x1000'));
        assert.ok(track.previewUrl.endsWith('.mp3'));
        assert.ok(track.url.startsWith('https://www.deezer.com'));
    });

    test('R5.5: Multi-provider fallback cascades to Deezer when iTunes encounters an error', async () => {
        const { mockFetchFn } = mockHttp.createMockFetch({ failITunes: true });
        const track = await searchMusicWithFallback('Queen Bohemian Rhapsody', mockFetchFn);

        assert.ok(track, 'Fallback track should be found');
        assert.equal(track.provider, 'Deezer', 'Should have failed over to Deezer');
        assert.equal(track.title, 'Bohemian Rhapsody');
        assert.equal(track.artist, 'Queen');
    });

    test('R5.6: Generates Spotify search fallback link when all external search APIs fail', async () => {
        const { mockFetchFn } = mockHttp.createMockFetch({ failITunes: true, failDeezer: true });
        const track = await searchMusicWithFallback('Obscure Indie Song', mockFetchFn);

        assert.ok(track);
        assert.equal(track.provider, 'Spotify Search Link');
        assert.equal(track.url, 'https://open.spotify.com/search/Obscure%20Indie%20Song');
    });
});
