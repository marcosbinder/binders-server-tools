/**
 * @file r14_ocr_music_top10.test.js
 * @description Automated test suite for /ocr command and /musica Top 10 chart enhancements
 */

const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { createMockClient, createMockInteraction } = require('../helpers/mockDiscord.js');
const db = require('../../src/database/db.js');
const config = require('../../src/config/index.js');

const ocrCommand = require('../../src/commands/ocr.js');
const { extractTextFromImage, OCR_DEFAULT_ENDPOINT } = require('../../src/utils/ocrService.js');

const musicaCommand = require('../../src/commands/musica.js');
const { fetchTop10Tracks, FALLBACK_TOP10, searchMusicWithFallback } = require('../../src/utils/musicProvider.js');

const TEST_USER_ID = '888999111222333444';

describe('Requirement R14: OCR Text Recognition & Music Top 10 Charts', () => {

    beforeEach(async () => {
        await db.updateUser(TEST_USER_ID, {
            tosVersion: config.currentTosVersion,
            language: 'lang_pt_br',
        });
    });

    // =========================================================================
    // 1. OCR Service & /ocr Command
    // =========================================================================
    describe('1. OCR Service & Command Execution', () => {
        test('/ocr command data registers valid options and localizations', () => {
            const data = ocrCommand.data.toJSON();
            assert.equal(data.name, 'ocr');
            assert.ok(data.description_localizations['pt-BR']);
            assert.ok(data.description_localizations['en-US']);

            const imagemOpt = data.options.find(o => o.name === 'imagem');
            assert.ok(imagemOpt, 'Must have imagem option');
            assert.equal(imagemOpt.type, 11); // Attachment

            const urlOpt = data.options.find(o => o.name === 'url');
            assert.ok(urlOpt, 'Must have url option');
            assert.equal(urlOpt.type, 3); // String
        });

        test('extractTextFromImage handles successful response from OCR API', async () => {
            const fakeFetch = async (url, opts) => {
                return {
                    ok: true,
                    json: async () => ({
                        ParsedResults: [
                            {
                                ParsedText: 'Binder Server Tools\nTexto de Teste Reconhecido com Sucesso\n12345',
                            },
                        ],
                        OCRExitCode: 1,
                        IsErroredOnProcessing: false,
                    }),
                };
            };

            const result = await extractTextFromImage('https://cdn.discordapp.com/attachments/123/456/test.png', {}, fakeFetch);
            assert.equal(result.success, true);
            assert.ok(result.text.includes('Binder Server Tools'));
            assert.equal(result.lines, 3);
            assert.equal(result.characters, 'Binder Server Tools\nTexto de Teste Reconhecido com Sucesso\n12345'.length);
            assert.equal(result.provider, 'OCR.space');
        });

        test('extractTextFromImage handles empty input and network failures gracefully', async () => {
            const emptyRes = await extractTextFromImage('');
            assert.equal(emptyRes.success, false);
            assert.ok(emptyRes.error);

            const failingFetch = async () => {
                throw new Error('ECONNREFUSED connection failed');
            };
            const failedRes = await extractTextFromImage('https://example.com/test.jpg', {}, failingFetch);
            assert.equal(failedRes.success, false);
            assert.ok(failedRes.error.includes('ECONNREFUSED'));
        });

        test('extractTextFromImage handles HTTP error response from OCR endpoint', async () => {
            const errorFetch = async () => ({
                ok: false,
                status: 503,
            });

            const result = await extractTextFromImage('https://example.com/test.png', {}, errorFetch);
            assert.equal(result.success, false);
            assert.ok(result.error.includes('HTTP 503'));
        });

        test('/ocr rejects execution when neither image nor url is provided', async () => {
            const client = createMockClient();
            const interaction = createMockInteraction({
                userId: TEST_USER_ID,
                commandName: 'ocr',
                options: {},
                locale: 'pt-BR',
            });

            await ocrCommand.execute(interaction, client);
            assert.equal(interaction._replies.length, 1);
            assert.ok(interaction._replies[0].content.includes('Você precisa fornecer uma **imagem**'));
        });

        test('/ocr rejects invalid file extensions on uploaded attachments', async () => {
            const client = createMockClient();
            const interaction = createMockInteraction({
                userId: TEST_USER_ID,
                commandName: 'ocr',
                options: {
                    imagem: {
                        name: 'virus.exe',
                        contentType: 'application/octet-stream',
                        url: 'https://cdn.discordapp.com/attachments/123/virus.exe',
                    },
                },
                locale: 'pt-BR',
            });

            await ocrCommand.execute(interaction, client);
            assert.equal(interaction._replies.length, 1);
            assert.ok(interaction._replies[0].content.includes('não parece ser uma imagem válida'));
        });

        test('/ocr rejects invalid image URLs', async () => {
            const client = createMockClient();
            const interaction = createMockInteraction({
                userId: TEST_USER_ID,
                commandName: 'ocr',
                options: {
                    url: 'not-a-valid-url',
                },
                locale: 'en-US',
            });

            await ocrCommand.execute(interaction, client);
            const res = interaction._getLastResponse();
            assert.ok(res, 'Response must be present');
            assert.ok(res.content.includes('não é válida') || res.content.includes('invalid or does not point'));
        });
    });

    // =========================================================================
    // 2. Music Top 10 Charts Feature
    // =========================================================================
    describe('2. Music Top 10 Charts Feature', () => {
        test('/musica command data registers busca and top10 options', () => {
            const data = musicaCommand.data.toJSON();
            assert.equal(data.name, 'musica');

            const buscaOpt = data.options.find(o => o.name === 'busca');
            assert.ok(buscaOpt, 'busca option must be present');
            assert.equal(buscaOpt.required, false, 'busca option should not be mandatory');

            const top10Opt = data.options.find(o => o.name === 'top10');
            assert.ok(top10Opt, 'top10 boolean option must be present');
            assert.equal(top10Opt.type, 5); // Boolean
        });

        test('fetchTop10Tracks returns parsed tracks from Deezer API', async () => {
            const mockDeezerFetch = async (url) => ({
                ok: true,
                json: async () => ({
                    data: [
                        { title: 'Track 1', artist: { name: 'Artist 1' }, album: { title: 'Album 1' }, duration: 180, link: 'https://deezer.com/1' },
                        { title: 'Track 2', artist: { name: 'Artist 2' }, album: { title: 'Album 2' }, duration: 210, link: 'https://deezer.com/2' },
                    ],
                }),
            });

            const res = await fetchTop10Tracks(mockDeezerFetch);
            assert.ok(res.tracks.length >= 2);
            assert.equal(res.tracks[0].title, 'Track 1');
            assert.equal(res.tracks[0].artist, 'Artist 1');
            assert.equal(res.tracks[0].position, 1);
            assert.ok(res.tracks[0].spotifyUrl.includes('Track%201'));
        });

        test('fetchTop10Tracks falls back to curated Spotify Top 10 on API outage', async () => {
            const brokenFetch = async () => {
                throw new Error('Deezer chart timeout');
            };

            const res = await fetchTop10Tracks(brokenFetch);
            assert.equal(res.tracks.length, 10);
            assert.ok(res.provider.includes('Spotify Global Charts'));
            assert.equal(res.tracks[0].title, FALLBACK_TOP10[0].title);
        });

        test('/musica executes Top 10 chart when top10: true is provided', async () => {
            const client = createMockClient();
            const interaction = createMockInteraction({
                userId: TEST_USER_ID,
                commandName: 'musica',
                options: {
                    top10: true,
                },
                locale: 'pt-BR',
            });

            await musicaCommand.execute(interaction, client);
            const res = interaction._getLastResponse();
            assert.ok(res, 'Response must be present');
            assert.ok(res.embeds && res.embeds.length > 0);
            assert.ok(res.embeds[0].data.title.includes('Top 10'));
            assert.ok(res.components && res.components.length > 0);
            assert.ok(res.components[0].components.some(b => b.data.label.includes('Spotify')));
        });

        test('/musica defaults to Top 10 when no options are provided', async () => {
            const client = createMockClient();
            const interaction = createMockInteraction({
                userId: TEST_USER_ID,
                commandName: 'musica',
                options: {},
                locale: 'pt-BR',
            });

            await musicaCommand.execute(interaction, client);
            const res = interaction._getLastResponse();
            assert.ok(res, 'Response must be present');
            assert.ok(res.embeds[0].data.title.includes('Top 10'));
        });

        test('/musica triggers Top 10 when query is top, top10, or chart', async () => {
            const client = createMockClient();
            const interaction = createMockInteraction({
                userId: TEST_USER_ID,
                commandName: 'musica',
                options: {
                    busca: 'top 10',
                },
                locale: 'en-US',
            });

            await musicaCommand.execute(interaction, client);
            const res = interaction._getLastResponse();
            assert.ok(res.embeds[0].data.title.includes('Top 10'));
        });
    });
});
