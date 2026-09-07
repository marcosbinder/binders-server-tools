// tests/stress/reminder_command_stress.test.js
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const reminderCommand = require('../../src/commands/reminder.js');
const { createMockInteraction, createMockClient } = require('../helpers/mockDiscord.js');
const db = require('../../src/database/db.js');

const config = require('../../src/config/config.js');

describe('EMPIRICAL CHALLENGER: Reminder Command Adversarial Stress', () => {

    test('reminder criar: returns informative error for negative time input', async () => {
        const userId = 'user_stress_neg_1';
        await db.updateUser(userId, { tosVersion: config.currentTosVersion });
        const interaction = createMockInteraction({
            userId,
            subcommand: 'criar',
            options: {
                tempo: '-10m',
                mensagem: 'Teste negativo'
            },
            locale: 'pt-BR'
        });

        await reminderCommand.execute(interaction, createMockClient());
        assert.equal(interaction._replies.length, 1);
        const reply = interaction._replies[0];
        assert.ok(reply.content.includes('Valores negativos não são permitidos'));
    });

    test('reminder criar: returns informative error for oversized string (>100 chars)', async () => {
        const userId = 'user_stress_over_1';
        await db.updateUser(userId, { tosVersion: config.currentTosVersion });
        const interaction = createMockInteraction({
            userId,
            subcommand: 'criar',
            options: {
                tempo: '10m '.repeat(27),
                mensagem: 'Teste longo'
            },
            locale: 'en-US'
        });

        await reminderCommand.execute(interaction, createMockClient());
        assert.equal(interaction._replies.length, 1);
        const reply = interaction._replies[0];
        assert.ok(reply.content.includes('too long'));
    });

    test('reminder criar: returns informative error for time < 5s', async () => {
        const userId = 'user_stress_min_1';
        await db.updateUser(userId, { tosVersion: config.currentTosVersion });
        const interaction = createMockInteraction({
            userId,
            subcommand: 'criar',
            options: {
                tempo: '3s',
                mensagem: 'Teste curto'
            },
            locale: 'pt-BR'
        });

        await reminderCommand.execute(interaction, createMockClient());
        assert.equal(interaction._replies.length, 1);
        const reply = interaction._replies[0];
        assert.ok(reply.content.includes('5 segundos'));
    });

    test('reminder criar: returns informative error for 32-bit overflow (> 24.85 days)', async () => {
        const userId = 'user_stress_max_1';
        await db.updateUser(userId, { tosVersion: config.currentTosVersion });
        const interaction = createMockInteraction({
            userId,
            subcommand: 'criar',
            options: {
                tempo: '25d',
                mensagem: 'Teste overflow'
            },
            locale: 'en-US'
        });

        await reminderCommand.execute(interaction, createMockClient());
        assert.equal(interaction._replies.length, 1);
        const reply = interaction._replies[0];
        assert.ok(reply.content.includes('24 days') || reply.content.includes('32-bit limit'));
    });

    test('reminder cancelar: returns error if reminder not found', async () => {
        const userId = 'user_test_cancel_err';
        await db.updateUser(userId, { tosVersion: config.currentTosVersion });
        const interaction = createMockInteraction({
            userId,
            subcommand: 'cancelar',
            options: {
                id: 'rem_non_existent'
            },
            locale: 'pt-BR'
        });

        await reminderCommand.execute(interaction, createMockClient());
        assert.equal(interaction._replies.length, 1);
        const reply = interaction._replies[0];
        assert.ok(reply.content.includes('Lembrete não encontrado') || reply.content.includes('não pertence a você'));
    });
});
