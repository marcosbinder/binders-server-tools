const { WebhookClient, EmbedBuilder } = require('discord.js');
const { isDeadWebhook, markDeadWebhook } = require('./logger.js');

let cachedClient = null;

function setLifecycleClient(client) {
    if (client) cachedClient = client;
}

function isUnknownWebhookError(err) {
    if (!err) return false;
    return err?.code === 10015 ||
           err?.status === 404 ||
           (typeof err?.message === 'string' && (err.message.includes('10015') || err.message.includes('Unknown Webhook')));
}

async function sendLifecycleLog(title, color, client = null) {
    const url = process.env.WEBHOOK_UPDATES_PV;
    if (!url || isDeadWebhook(url)) return;

    if (client) cachedClient = client;
    const activeClient = client || cachedClient;

    let resolvedColor = 0xAEA7BD;
    if (typeof color === 'number') {
        resolvedColor = color;
    } else if (typeof color === 'string') {
        const lower = color.toLowerCase();
        if (lower === 'green') resolvedColor = 0x57F287;
        else if (lower === 'red') resolvedColor = 0xED4245;
        else if (lower.startsWith('#') || lower.startsWith('0x')) {
            const parsed = parseInt(lower.replace('#', '').replace('0x', ''), 16);
            if (!isNaN(parsed)) resolvedColor = parsed;
        }
    }

    let webhookClient;
    try {
        webhookClient = new WebhookClient({ url });

        const avatarURL = typeof activeClient?.user?.displayAvatarURL === 'function'
            ? activeClient.user.displayAvatarURL()
            : undefined;

        const uptimeSec = Math.floor(process.uptime());
        const hours = Math.floor(uptimeSec / 3600);
        const minutes = Math.floor((uptimeSec % 3600) / 60);
        const seconds = uptimeSec % 60;
        const uptimeStr = `${hours}h ${minutes}m ${seconds}s`;
        const memUsedMb = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);

        const botLine = activeClient?.user
            ? `> **Bot:** **${activeClient.user.username}** (\`${activeClient.user.id}\`)`
            : `> **Aplicação:** **Binder's Server Tools**`;

        const descriptionLines = [
            `### 🚀 Status da Aplicação`,
            botLine,
            `> **Ambiente:** \`${process.env.NODE_ENV || 'production'}\` • **Node.js:** \`${process.version}\``,
            `> **Uptime:** \`${uptimeStr}\` • **Memória:** \`${memUsedMb}MB\``,
        ];

        if (activeClient?.guilds?.cache?.size) {
            descriptionLines.push(`> **Servidores Conectados:** \`${activeClient.guilds.cache.size}\``);
        }

        const embed = new EmbedBuilder()
            .setTitle(title)
            .setColor(resolvedColor)
            .setDescription(descriptionLines.join('\n'))
            .setTimestamp();

        if (avatarURL) {
            embed.setFooter({
                text: "Binder's Server Tools • Lifecycle Monitor",
                iconURL: avatarURL,
            });
        } else {
            embed.setFooter({
                text: "Binder's Server Tools • Lifecycle Monitor",
            });
        }
        
        await webhookClient.send({
            username: "Binder's Status",
            avatarURL,
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

module.exports = {
    sendLifecycleLog,
    setLifecycleClient,
};