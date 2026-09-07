/**
 * @file statusDashboard.js
 * @description Fixed status dashboard updater in updates channel without spamming
 */

const { EmbedBuilder } = require('discord.js');

let dashboardMessageId = null;
let updateIntervalHandle = null;

function formatUptime(uptimeSeconds) {
    const days = Math.floor(uptimeSeconds / 86400);
    const hours = Math.floor((uptimeSeconds % 86400) / 3600);
    const mins = Math.floor((uptimeSeconds % 3600) / 60);
    const secs = uptimeSeconds % 60;
    return `${days}d ${hours}h ${mins}m ${secs}s`;
}

async function updateStatusDashboard(client) {
    if (!client || !client.channels) return null;
    const channelId = process.env.CHANNEL_UPDATES_ID || '1358542780275888501';

    try {
        const channel = client.channels.cache.get(channelId) || await client.channels.fetch(channelId).catch(() => null);
        if (!channel || typeof channel.send !== 'function') return null;

        const serverCount = client.guilds?.cache?.size ?? 0;
        const guildsArr = Array.from(client?.guilds?.cache?.values() || []);
        const userCount = guildsArr.reduce((acc, g) => acc + (g.memberCount || 0), 0);
        const ping = client.ws?.ping ?? 0;
        const uptimeStr = formatUptime(Math.floor(process.uptime()));
        const memMb = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);

        const nowSec = Math.floor(Date.now() / 1000);

        const embed = new EmbedBuilder()
            .setTitle('📊 Binder\'s Server Tools • Status Dashboard')
            .setDescription('Painel fixo de monitoramento operacional e saúde dos serviços integrados.')
            .setColor(0x57F287)
            .addFields(
                { name: '🟢 Status do Bot', value: '`100% Operacional`', inline: true },
                { name: '📶 Latência Gateway', value: `\`${ping}ms\``, inline: true },
                { name: '💾 Memória Heap', value: `\`${memMb} MB\``, inline: true },
                { name: '🏢 Servidores Ativos', value: `\`${serverCount.toLocaleString('pt-BR')}\``, inline: true },
                { name: '👥 Usuários Servidos', value: `\`${userCount.toLocaleString('pt-BR')}\``, inline: true },
                { name: '⏱️ Tempo Online', value: `\`${uptimeStr}\``, inline: true },
                { name: '🗄️ Banco de Dados', value: '`Supabase Cloud PostgreSQL (Ativo)`', inline: true },
                { name: '🔄 Atualizado', value: `<t:${nowSec}:R>`, inline: true }
            )
            .setFooter({ text: 'Binder\'s Server Tools • Status Fixo', iconURL: client.user?.displayAvatarURL ? client.user.displayAvatarURL() : undefined })
            .setTimestamp();

        // 1. Try previously stored messageId
        if (dashboardMessageId) {
            try {
                const existingMsg = await channel.messages.fetch(dashboardMessageId).catch(() => null);
                if (existingMsg) {
                    await existingMsg.edit({ embeds: [embed] });
                    return existingMsg;
                }
            } catch (_) {}
        }

        // 2. Search recent messages in channel to avoid creating duplicate messages
        try {
            const recentMessages = await channel.messages.fetch({ limit: 15 }).catch(() => null);
            if (recentMessages) {
                const msgList = Array.isArray(recentMessages) ? recentMessages : Array.from(recentMessages.values ? recentMessages.values() : []);
                const botMsg = msgList.find(m => {
                    const embedTitle = m.embeds?.[0]?.title || m.embeds?.[0]?.data?.title || '';
                    return m.author?.id === client.user.id && embedTitle.includes('Status Dashboard');
                });
                if (botMsg) {
                    dashboardMessageId = botMsg.id;
                    await botMsg.edit({ embeds: [embed] });
                    return botMsg;
                }
            }
        } catch (_) {}

        // 3. If no existing dashboard message found, send a new one
        const newMsg = await channel.send({ embeds: [embed] });
        dashboardMessageId = newMsg.id;
        return newMsg;
    } catch (err) {
        console.warn('[StatusDashboard] Aviso ao atualizar dashboard fixo:', err.message);
        return null;
    }
}

function initStatusDashboard(client, intervalMs = 300000) { // 5 minutes
    if (updateIntervalHandle) clearInterval(updateIntervalHandle);
    updateStatusDashboard(client).catch(() => null);
    updateIntervalHandle = setInterval(() => {
        updateStatusDashboard(client).catch(() => null);
    }, intervalMs);
    if (updateIntervalHandle.unref) updateIntervalHandle.unref();
}

function stopStatusDashboard() {
    if (updateIntervalHandle) {
        clearInterval(updateIntervalHandle);
        updateIntervalHandle = null;
    }
}

module.exports = {
    updateStatusDashboard,
    initStatusDashboard,
    stopStatusDashboard,
};
