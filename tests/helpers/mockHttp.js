// tests/helpers/mockHttp.js

/**
 * Creates standardized mock responses for external APIs (iTunes, Deezer, Spotify, Webhooks)
 */
function createMockHttp() {
    const defaultTracks = {
        'queen': {
            itunes: {
                resultCount: 1,
                results: [{
                    wrapperType: 'track',
                    kind: 'song',
                    artistId: 3296287,
                    collectionId: 1440650816,
                    trackId: 1440650817,
                    artistName: 'Queen',
                    collectionName: 'A Night at the Opera (Deluxe Edition)',
                    trackName: 'Bohemian Rhapsody',
                    previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview/bohemian.m4a',
                    artworkUrl100: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/100x100bb.jpg',
                    releaseDate: '1975-10-31T12:00:00Z',
                    trackTimeMillis: 354320,
                    primaryGenreName: 'Rock',
                    trackViewUrl: 'https://music.apple.com/us/album/bohemian-rhapsody/1440650816?i=1440650817',
                }]
            },
            deezer: {
                data: [{
                    id: 4091937401,
                    title: 'Bohemian Rhapsody',
                    duration: 354,
                    link: 'https://www.deezer.com/track/4091937401',
                    preview: 'https://cdnt-preview.dzcdn.net/api/1/1/5/bohemian.mp3',
                    artist: {
                        id: 412,
                        name: 'Queen',
                        picture_medium: 'https://cdn-images.dzcdn.net/images/artist/queen.jpg',
                    },
                    album: {
                        id: 5678,
                        title: 'A Night At The Opera',
                        cover_medium: 'https://cdn-images.dzcdn.net/images/cover/500x500.jpg',
                        cover_xl: 'https://cdn-images.dzcdn.net/images/cover/1000x1000.jpg',
                    }
                }],
                total: 1
            }
        },
        'daft punk': {
            itunes: {
                resultCount: 1,
                results: [{
                    artistName: 'Daft Punk',
                    collectionName: 'Random Access Memories',
                    trackName: 'Get Lucky (feat. Pharrell Williams & Nile Rodgers)',
                    previewUrl: 'https://audio-ssl.itunes.apple.com/getlucky.m4a',
                    artworkUrl100: 'https://is1-ssl.mzstatic.com/image/thumb/Music/100x100bb.jpg',
                    releaseDate: '2013-04-19T00:00:00Z',
                    trackTimeMillis: 369626,
                    primaryGenreName: 'Dance',
                    trackViewUrl: 'https://music.apple.com/us/album/get-lucky/636986507',
                }]
            },
            deezer: {
                data: [{
                    id: 67238735,
                    title: 'Get Lucky (feat. Pharrell Williams & Nile Rodgers)',
                    duration: 370,
                    link: 'https://www.deezer.com/track/67238735',
                    preview: 'https://cdnt-preview.dzcdn.net/api/1/1/5/getlucky.mp3',
                    artist: { name: 'Daft Punk' },
                    album: {
                        title: 'Random Access Memories',
                        cover_xl: 'https://cdn-images.dzcdn.net/images/cover/ram_1000x1000.jpg',
                    }
                }],
                total: 1
            }
        }
    };

    /**
     * Dispatcher to mock global fetch with customizable routes
     */
    function createMockFetch(options = {}) {
        const routes = options.routes || [];
        const capturedRequests = [];

        const mockFetchFn = async (url, fetchOptions = {}) => {
            const urlStr = String(url);
            capturedRequests.push({ url: urlStr, options: fetchOptions });

            if (options.shouldFailAll) {
                throw new Error('Network error: ENOTFOUND api.service.com');
            }

            if (options.shouldTimeoutAll) {
                const err = new Error('The operation was aborted due to timeout');
                err.name = 'AbortError';
                throw err;
            }

            // Custom route handlers
            for (const r of routes) {
                if (r.matcher(urlStr)) {
                    if (r.error) throw r.error;
                    if (r.timeout) {
                        const err = new Error('The operation was aborted due to timeout');
                        err.name = 'AbortError';
                        throw err;
                    }
                    return {
                        ok: r.status ? r.status >= 200 && r.status < 300 : true,
                        status: r.status || 200,
                        statusText: r.statusText || 'OK',
                        json: async () => r.json || {},
                        text: async () => (r.text !== undefined ? r.text : JSON.stringify(r.json || {})),
                        headers: new Map(Object.entries(r.headers || {})),
                    };
                }
            }

            // iTunes API handler
            if (urlStr.includes('itunes.apple.com/search')) {
                if (options.failITunes) {
                    return { ok: false, status: 500, json: async () => ({}) };
                }
                const urlObj = new URL(urlStr);
                const term = (urlObj.searchParams.get('term') || '').toLowerCase();
                const matched = Object.entries(defaultTracks).find(([k]) => term.includes(k));
                if (matched) {
                    return {
                        ok: true,
                        status: 200,
                        json: async () => matched[1].itunes,
                    };
                }
                return {
                    ok: true,
                    status: 200,
                    json: async () => ({ resultCount: 0, results: [] }),
                };
            }

            // Deezer API handler
            if (urlStr.includes('api.deezer.com/search')) {
                if (options.failDeezer) {
                    return { ok: false, status: 500, json: async () => ({}) };
                }
                const urlObj = new URL(urlStr);
                const q = (urlObj.searchParams.get('q') || '').toLowerCase();
                const matched = Object.entries(defaultTracks).find(([k]) => q.includes(k));
                if (matched) {
                    return {
                        ok: true,
                        status: 200,
                        json: async () => matched[1].deezer,
                    };
                }
                return {
                    ok: true,
                    status: 200,
                    json: async () => ({ data: [], total: 0 }),
                };
            }

            // Webhook handler
            if (urlStr.includes('discord.com/api/webhooks')) {
                if (options.failWebhooks) {
                    return { ok: false, status: 404, statusText: 'Not Found', json: async () => ({ code: 10015, message: 'Unknown Webhook' }) };
                }
                return {
                    ok: true,
                    status: 204,
                    json: async () => ({}),
                };
            }

            // Default fallback
            return {
                ok: true,
                status: 200,
                json: async () => ({}),
                text: async () => '',
            };
        };

        return {
            mockFetchFn,
            capturedRequests,
        };
    }

    /**
     * Creates a mock Discord WebhookClient
     */
    function createMockWebhookClient(options = {}) {
        const sentPayloads = [];
        return {
            sentPayloads,
            send: async (payload) => {
                if (options.shouldFail) {
                    throw new Error('DiscordAPIError[10015]: Unknown Webhook');
                }
                sentPayloads.push(payload);
                return { id: 'webhook_msg_987654', ...payload };
            },
            destroy: () => {},
        };
    }

    return {
        defaultTracks,
        createMockFetch,
        createMockWebhookClient,
    };
}

module.exports = createMockHttp();
