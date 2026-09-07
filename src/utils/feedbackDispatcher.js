/**
 * @file feedbackDispatcher.js
 * @description Validates, structures and dispatches feedback and bug reports to Discord webhooks
 */

const { WebhookClient } = require('discord.js');
const { isDeadWebhook, markDeadWebhook } = require('./logger.js');

function isUnknownWebhookError(err) {
    if (!err) return false;
    return err.code === 10015 ||
           err.status === 404 ||
           (typeof err.message === 'string' && (err.message.includes('10015') || err.message.includes('Unknown Webhook')));
}

/**
 * Validates and dispatches user feedback or bug reports
 * @param {Object} params
 * @param {'feedback'|'bug'} params.type - Submission type
 * @param {Object} params.user - Discord user object { id, tag, username }
 * @param {Object|null} params.guild - Discord guild object { id, name } or null
 * @param {Object|null} params.channel - Discord channel object { id, name } or null
 * @param {string} params.message - Raw message content
 * @param {WebhookClient|null} [params.webhookClient] - Optional injected WebhookClient instance
 * @param {string} [params.webhookUrl] - Optional webhook URL fallback
 * @param {Object|null} [params.client] - Optional Discord Client instance for branding avatar
 * @returns {Promise<{ success: boolean, embed?: Object, userConfirmation?: string, error?: string }>}
 */
async function submitFeedbackOrBug({ type, user, guild, channel, message, webhookClient, webhookUrl, client }) {
    const trimmed = (message || '').trim();
    if (trimmed.length < 10) {
        return {
            success: false,
            error: 'Mensagem muito curta! Digite pelo menos 10 caracteres detalhando sua solicitação.',
        };
    }

    const isBug = type === 'bug';
    const discordClient = client || guild?.client || channel?.client || user?.client;
    const avatarURL = typeof discordClient?.user?.displayAvatarURL === 'function'
        ? discordClient.user.displayAvatarURL()
        : undefined;

    const userTag = user?.tag || user?.username || 'Desconhecido';
    const userId = user?.id || '0';

    const uptimeSec = Math.floor(process.uptime());
    const hours = Math.floor(uptimeSec / 3600);
    const minutes = Math.floor((uptimeSec % 3600) / 60);
    const seconds = uptimeSec % 60;
    const uptimeStr = `${hours}h ${minutes}m ${seconds}s`;
    const memUsed = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
    const memTotal = Math.round(process.memoryUsage().heapTotal / 1024 / 1024);

    const systemInfo = `> **Node.js:** \`${process.version}\` • **OS:** \`${process.platform} (${process.arch})\`\n> **Uptime:** \`${uptimeStr}\` • **Memória:** \`${memUsed}MB / ${memTotal}MB\`\n> **Ambiente:** \`${process.env.NODE_ENV || 'production'}\``;

    const embed = {
        title: isBug ? '🐛 Novo Relatório de Bug' : '💡 Nova Sugestão / Feedback',
        color: isBug ? 0xED4245 : 0xAEA7BD,
        fields: [
            { name: '👤 Autor', value: `**${userTag}** (\`${userId}\`)`, inline: true },
            { name: '🏢 Servidor', value: guild ? `**${guild.name}** (\`${guild.id}\`)` : 'Direct Message (DM)', inline: true },
            { name: '💬 Canal', value: channel ? `**#${channel.name}** (\`${channel.id}\`)` : (guild ? 'Canal não informado' : 'Direct Message (DM)'), inline: true },
            { name: '📝 Conteúdo', value: `>>> ${trimmed}`, inline: false },
            { name: '⚙️ Ambiente do Sistema', value: systemInfo, inline: false },
        ],
        footer: {
            text: `Binder's Server Tools • ${isBug ? 'Bug Tracker' : 'Feedback Hub'}`,
            icon_url: avatarURL,
        },
        timestamp: new Date().toISOString(),
    };

    let targetClient = webhookClient;
    let shouldDestroy = false;
    let activeWebhookUrl = webhookUrl;

    if (!targetClient) {
        activeWebhookUrl = webhookUrl || (isBug
            ? (process.env.WEBHOOK_BUGS || process.env.WEBHOOK_BUGS_FEEDBACK || process.env.WEBHOOK_FEEDBACK)
            : (process.env.WEBHOOK_FEEDBACK || process.env.WEBHOOK_BUGS_FEEDBACK || process.env.WEBHOOK_BUGS));
        if (activeWebhookUrl && !isDeadWebhook(activeWebhookUrl)) {
            try {
                targetClient = new WebhookClient({ url: activeWebhookUrl });
                shouldDestroy = true;
            } catch (e) {
                console.warn('[WebhookDispatcher] Invalid webhook URL:', e.message);
            }
        }
    }

    if (targetClient) {
        try {
            await targetClient.send({
                username: isBug ? "Binder's Bug Reports" : "Binder's Feedback",
                avatarURL,
                embeds: [embed],
            });
        } catch (err) {
            if (activeWebhookUrl && isUnknownWebhookError(err)) {
                markDeadWebhook(activeWebhookUrl);
            }
            console.warn('Webhook dispatch failed, falling back:', err.message);
        } finally {
            if (shouldDestroy && typeof targetClient.destroy === 'function') {
                try { targetClient.destroy(); } catch (_) {}
            }
        }
    }

    return {
        success: true,
        embed,
        userConfirmation: isBug
            ? 'Seu relatório de bug foi enviado com sucesso para a equipe de desenvolvimento! Obrigado.'
            : 'Sua sugestão foi enviada com sucesso para nossa equipe! Obrigado pelo feedback.',
    };
}

module.exports = {
    submitFeedbackOrBug,
};
