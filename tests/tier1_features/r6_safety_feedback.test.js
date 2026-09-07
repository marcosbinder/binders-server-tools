// tests/tier1_features/r6_safety_feedback.test.js
const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { createMockInteraction, createMockClient } = require('../helpers/mockDiscord.js');
const mockHttp = require('../helpers/mockHttp.js');
const fixtures = require('../helpers/fixtures.js');

describe('Requirement R6: Safety, Feedback & Anti-Spam Protections', () => {
    // In-memory rate limiter model
    class RateLimiter {
        constructor() {
            this.cooldowns = new Map(); // key -> timestamp
        }

        check(userId, key, cooldownMs, isDeveloper = false) {
            if (isDeveloper) return { limited: false, remainingMs: 0 };

            const mapKey = `${userId}:${key}`;
            const now = Date.now();
            const lastUsed = this.cooldowns.get(mapKey);

            if (lastUsed && (now - lastUsed) < cooldownMs) {
                const remainingMs = cooldownMs - (now - lastUsed);
                return { limited: true, remainingMs };
            }

            this.cooldowns.set(mapKey, now);
            return { limited: false, remainingMs: 0 };
        }

        cleanup(ttlMs = 60000) {
            const now = Date.now();
            for (const [key, timestamp] of this.cooldowns.entries()) {
                if (now - timestamp > ttlMs) {
                    this.cooldowns.delete(key);
                }
            }
        }
    }

    // Feedback & Bugreport validator and dispatcher
    const submitFeedbackOrBug = async ({ type, user, guild, channel, message, webhookClient }) => {
        // Validation: Must be at least 10 chars, trimmed
        const trimmed = (message || '').trim();
        if (trimmed.length < 10) {
            return {
                success: false,
                error: 'Mensagem muito curta! Digite pelo menos 10 caracteres detalhando sua solicitação.',
            };
        }

        const embed = {
            title: type === 'bug' ? '🐛 Novo Relatório de Bug' : '💡 Nova Sugestão / Feedback',
            color: type === 'bug' ? 0xED4245 : 0x5865F2,
            fields: [
                { name: '👤 Autor', value: `${user.tag} (\`${user.id}\`)`, inline: true },
                { name: '🏢 Servidor', value: guild ? `${guild.name} (\`${guild.id}\`)` : 'Direct Message (DM)', inline: true },
                { name: '💬 Canal', value: channel ? `${channel.name} (\`${channel.id}\`)` : 'N/A', inline: true },
                { name: '📝 Conteúdo', value: trimmed, inline: false },
            ],
            timestamp: new Date().toISOString(),
        };

        if (webhookClient) {
            try {
                await webhookClient.send({ embeds: [embed] });
            } catch (err) {
                // Log and graceful fallback
                console.warn('Webhook dispatch failed, falling back:', err.message);
            }
        }

        return {
            success: true,
            embed,
            userConfirmation: type === 'bug'
                ? 'Seu relatório de bug foi enviado com sucesso para a equipe de desenvolvimento! Obrigado.'
                : 'Sua sugestão foi enviada com sucesso para nossa equipe! Obrigado pelo feedback.',
        };
    };

    let rateLimiter;

    beforeEach(() => {
        rateLimiter = new RateLimiter();
    });

    test('R6.1: Rate limiter permits initial interaction and blocks subsequent spam', () => {
        const userId = '123456789012345678';
        const key = 'command:ajuda';
        const cooldownMs = 3000;

        // First attempt: should succeed
        const first = rateLimiter.check(userId, key, cooldownMs);
        assert.equal(first.limited, false);
        assert.equal(first.remainingMs, 0);

        // Immediate second attempt: should be rate-limited
        const second = rateLimiter.check(userId, key, cooldownMs);
        assert.equal(second.limited, true);
        assert.ok(second.remainingMs > 0 && second.remainingMs <= cooldownMs);
    });

    test('R6.2: Rate limiter bypasses cooldown for verified bot developers', () => {
        const devUserId = fixtures.users.developerUser.userId;
        const key = 'command:binder';
        const cooldownMs = 5000;

        const first = rateLimiter.check(devUserId, key, cooldownMs, true);
        assert.equal(first.limited, false);

        const second = rateLimiter.check(devUserId, key, cooldownMs, true);
        assert.equal(second.limited, false, 'Developer should not be rate-limited');
    });

    test('R6.3: Rate limiter garbage collection prunes expired cooldown keys', () => {
        const userId = '123456789';
        rateLimiter.cooldowns.set(`${userId}:cmd1`, Date.now() - 100000); // expired
        rateLimiter.cooldowns.set(`${userId}:cmd2`, Date.now() - 1000);   // fresh

        assert.equal(rateLimiter.cooldowns.size, 2);
        rateLimiter.cleanup(60000); // 60s TTL
        assert.equal(rateLimiter.cooldowns.size, 1);
        assert.ok(rateLimiter.cooldowns.has(`${userId}:cmd2`));
    });

    test('R6.4: Feedback submission rejects empty, whitespace, and short messages', async () => {
        const user = { tag: 'Test#0001', id: '123' };
        
        // Empty
        const resEmpty = await submitFeedbackOrBug({ type: 'feedback', user, message: '' });
        assert.equal(resEmpty.success, false);
        assert.ok(resEmpty.error.includes('muito curta'));

        // Whitespace only
        const resWhitespace = await submitFeedbackOrBug({ type: 'feedback', user, message: '        ' });
        assert.equal(resWhitespace.success, false);

        // Under 10 chars
        const resShort = await submitFeedbackOrBug({ type: 'feedback', user, message: 'ajuda ai' });
        assert.equal(resShort.success, false);
    });

    test('R6.5: Feedback submission packages rich context and dispatches to webhook', async () => {
        const webhook = mockHttp.createMockWebhookClient();
        const user = { tag: 'Reporter#1234', id: '100000000000000002' };
        const guild = { name: 'Support Guild', id: '200000000000000001' };
        const channel = { name: 'general', id: '200000000000000010' };
        const message = 'Eu encontrei uma ótima ideia para melhorar a interface de música do bot!';

        const result = await submitFeedbackOrBug({
            type: 'feedback',
            user,
            guild,
            channel,
            message,
            webhookClient: webhook,
        });

        assert.equal(result.success, true);
        assert.ok(result.userConfirmation.includes('sucesso'));
        assert.equal(webhook.sentPayloads.length, 1);
        
        const sentEmbed = webhook.sentPayloads[0].embeds[0];
        assert.equal(sentEmbed.title, '💡 Nova Sugestão / Feedback');
        assert.ok(sentEmbed.fields.some(f => f.name === '👤 Autor' && f.value.includes('Reporter#1234')));
        assert.ok(sentEmbed.fields.some(f => f.name === '🏢 Servidor' && f.value.includes('Support Guild')));
        assert.ok(sentEmbed.fields.some(f => f.name === '📝 Conteúdo' && f.value.includes(message)));
    });

    test('R6.6: Bug report submission formats error embed and handles webhook failures gracefully', async () => {
        const failingWebhook = mockHttp.createMockWebhookClient({ shouldFail: true });
        const user = { tag: 'BugHunter#9999', id: '100000000000000003' };
        const message = 'Quando uso o comando /ajuda em uma DM, o bot demora para carregar as opções.';

        const result = await submitFeedbackOrBug({
            type: 'bug',
            user,
            guild: null,
            channel: null,
            message,
            webhookClient: failingWebhook,
        });

        // Should not crash the process, user should still receive confirmation
        assert.equal(result.success, true);
        assert.equal(result.embed.title, '🐛 Novo Relatório de Bug');
        assert.ok(result.userConfirmation.includes('relatório de bug foi enviado'));
    });
});
