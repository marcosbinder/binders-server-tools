const test = require('node:test');
const assert = require('node:assert');
const { parseTimeString, scheduleReminder, activeTimeouts } = require('../../src/utils/reminderManager.js');
const { createReminder, getUserReminders, completeReminder, deleteReminder, updateUser } = require('../../src/database/db.js');
const reminderCmd = require('../../src/commands/reminder.js');

test("Requirement R10: Persistent Reminder System", async (t) => {
    updateUser('user_cmd_1', { tosVersion: 2 });
    await t.test("R10.1: Parses diverse time strings correctly", () => {
        assert.strictEqual(parseTimeString('10s'), 10000);
        assert.strictEqual(parseTimeString('5m'), 5 * 60 * 1000);
        assert.strictEqual(parseTimeString('2h'), 2 * 3600 * 1000);
        assert.strictEqual(parseTimeString('1d'), 86400 * 1000);
        assert.strictEqual(parseTimeString('1w'), 7 * 86400 * 1000);
        assert.strictEqual(parseTimeString('1d 2h'), (86400 + 2 * 3600) * 1000);
        assert.strictEqual(parseTimeString('25'), 25 * 60 * 1000);
        assert.strictEqual(parseTimeString('invalid'), null);
        assert.strictEqual(parseTimeString('1s'), null);
    });

    await t.test("R10.2: Database CRUD persists reminders and queries pending", async () => {
        const userId = 'user_rem_test_1';
        const reminder = await createReminder({
            id: 'rem_test_001',
            userId,
            guildId: 'guild_1',
            channelId: 'channel_1',
            message: 'Comprar pão',
            dueTimestamp: Date.now() + 60000,
        });

        assert.strictEqual(reminder.id, 'rem_test_001');

        const userRems = await getUserReminders(userId);
        assert.ok(userRems.some(r => r.id === 'rem_test_001'));

        await completeReminder('rem_test_001');
        const afterComplete = await getUserReminders(userId);
        assert.strictEqual(afterComplete.some(r => r.id === 'rem_test_001'), false);

        await deleteReminder('rem_test_001');
    });

    await t.test("R10.3: Reminder command creates and replies with relative timestamp", async () => {
        let repliedPayload = null;
        const mockInteraction = {
            user: { id: 'user_cmd_1' },
            guild: { id: 'guild_1' },
            channel: { id: 'channel_1' },
            options: {
                getSubcommand: () => 'criar',
                getString: (key) => key === 'tempo' ? '10m' : 'Estudar cálculo',
            },
            reply: async (p) => { repliedPayload = p; },
        };

        await reminderCmd.execute(mockInteraction, {});
        assert.ok(repliedPayload.embeds);
        const desc = repliedPayload.embeds[0].data?.description || repliedPayload.embeds[0].description || '';
        assert.ok(desc.includes('<t:'));
    });
});
