const { WebhookClient, EmbedBuilder } = require('discord.js');
const { isDeadWebhook, markDeadWebhook } = require('./logger.js');

function isUnknownWebhookError(err) {
    if (!err) return false;
    return err?.code === 10015 ||
           err?.status === 404 ||
           (typeof err?.message === 'string' && (err.message.includes('10015') || err.message.includes('Unknown Webhook')));
}

async function sendLifecycleLog(title, color) {
    const url = process.env.WEBHOOK_UPDATES_PV;
    if (!url || isDeadWebhook(url)) return;

    let webhookClient;
    try {
        webhookClient = new WebhookClient({ url });
        const embed = new EmbedBuilder()
            .setTitle(title)
            .setColor(color)
            .setTimestamp();
        
        await webhookClient.send({
            username: "Binder's Status",
            embeds: [embed],
        }).catch(err => {
            if (isUnknownWebhookError(err)) {
                markDeadWebhook(url);
                return;
            }
            if (!isDeadWebhook(url)) {
                console.error('[Lifecycle] Falha ao enviar log de status:', err?.message || err);
            }
        });
    } catch (error) {
        if (isUnknownWebhookError(error)) {
            markDeadWebhook(url);
        } else if (!isDeadWebhook(url)) {
            console.error('[Lifecycle] Falha ao enviar log de status:', error.message);
        }
    } finally {
        if (webhookClient && typeof webhookClient.destroy === 'function') {
            try { webhookClient.destroy(); } catch (_) {}
        }
    }
}

module.exports = { sendLifecycleLog };