/**
 * @file ready.js
 * @description Ready event handler initializing presence rotator and rate limiter garbage collection
 */

const { Events, ActivityType } = require('discord.js');
const { sendLifecycleLog } = require('../utils/lifecycleLogger.js');
const { initReminderManager } = require('../utils/reminderManager.js');
const { initStatusDashboard } = require('../utils/statusDashboard.js');
const rateLimiter = require('../utils/rateLimiter.js');

const statusList = [
    '🛠️ Use /ajuda para ver meus comandos!',
    '🎵 Busque faixas com /musica',
    '⏰ Agende lembretes com /reminder',
    '💬 Envie sugestões com /feedback',
    '🌐 dsc.gg/bindersdc',
];

module.exports = {
    name: Events.ClientReady,
    once: true,
    execute(client) {
        sendLifecycleLog('🟢 Bot Online!', 'Green', client);
        console.log(`[Logado] ${client.user.tag} (${client.user.id})`);

        // Initialize persistent reminder manager
        initReminderManager(client);

        // Initialize fixed status dashboard in updates channel
        initStatusDashboard(client);

        // Activity Status Rotator
        let statusIndex = 0;
        setInterval(() => {
            const status = statusList[statusIndex % statusList.length];
            client.user.setActivity(status, { type: ActivityType.Custom });
            statusIndex++;
        }, 30000);

        // Rate Limiter TTL cleanup every 60 seconds
        setInterval(() => {
            rateLimiter.cleanup(60000);
        }, 60000);
    },
};