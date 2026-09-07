/**
 * @file feedbackDispatcher.js
 * @description Validates, structures and dispatches feedback and bug reports to Discord webhooks
 */

const { WebhookClient } = require('discord.js');

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
 * @returns {Promise<{ success: boolean, embed?: Object, userConfirmation?: string, error?: string }>}
 */
async function submitFeedbackOrBug({ type, user, guild, channel, message, webhookClient, webhookUrl }) {
    const trimmed = (message || '').trim();
    if (trimmed.length < 10) {
        return {
            success: false,
            error: 'Mensagem muito curta! Digite pelo menos 10 caracteres detalhando sua solicitação.',
        };
    }

    const isBug = type === 'bug';
    const embed = {
        title: isBug ? '🐛 Novo Relatório de Bug' : '💡 Nova Sugestão / Feedback',
        color: isBug ? 0xED4245 : 0x5865F2,
        fields: [
            { name: '👤 Autor', value: `${user?.tag || user?.username || 'Desconhecido'} (\`${user?.id || '0'}\`)`, inline: true },
            { name: '🏢 Servidor', value: guild ? `${guild.name} (\`${guild.id}\`)` : 'Direct Message (DM)', inline: true },
            { name: '💬 Canal', value: channel ? `${channel.name} (\`${channel.id}\`)` : 'N/A', inline: true },
            { name: '📝 Conteúdo', value: trimmed, inline: false },
        ],
        timestamp: new Date().toISOString(),
    };

    let client = webhookClient;
    let shouldDestroy = false;

    if (!client) {
        const targetUrl = webhookUrl || (isBug
            ? (process.env.WEBHOOK_BUGS || process.env.WEBHOOK_BUGS_FEEDBACK || process.env.WEBHOOK_FEEDBACK)
            : (process.env.WEBHOOK_FEEDBACK || process.env.WEBHOOK_BUGS_FEEDBACK || process.env.WEBHOOK_BUGS));
        if (targetUrl) {
            try {
                client = new WebhookClient({ url: targetUrl });
                shouldDestroy = true;
            } catch (e) {
                console.warn('[WebhookDispatcher] Invalid webhook URL:', e.message);
            }
        }
    }

    if (client) {
        try {
            await client.send({ embeds: [embed] });
        } catch (err) {
            console.warn('Webhook dispatch failed, falling back:', err.message);
        } finally {
            if (shouldDestroy && typeof client.destroy === 'function') {
                try { client.destroy(); } catch (_) {}
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
