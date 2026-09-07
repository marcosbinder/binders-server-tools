/**
 * @file guildCreate.js
 * @description Event handler for GuildCreate event, dispatching join notifications to WEBHOOK_JOINS
 */

const { Events, WebhookClient, EmbedBuilder } = require('discord.js');
const { isDeadWebhook, markDeadWebhook } = require('../utils/logger.js');

function isUnknownWebhookError(err) {
    if (!err) return false;
    return err.code === 10015 ||
           err.status === 404 ||
           (typeof err.message === 'string' && (err.message.includes('10015') || err.message.includes('Unknown Webhook')));
}

module.exports = {
    name: Events.GuildCreate,
    once: false,
    async execute(guild, client) {
        if (!guild) return;

        console.log(`[GuildCreate] Entrou no servidor: ${guild.name} (${guild.id}) com ${guild.memberCount} membros.`);

        const webhookUrl = process.env.WEBHOOK_JOINS;
        if (!webhookUrl || isDeadWebhook(webhookUrl)) return;

        let webhookClient;
        try {
            webhookClient = new WebhookClient({ url: webhookUrl });

            const iconUrl = typeof guild.iconURL === 'function' ? guild.iconURL({ size: 1024 }) : null;
            const createdSec = guild.createdTimestamp ? Math.floor(guild.createdTimestamp / 1000) : Math.floor(Date.now() / 1000);

            const embed = new EmbedBuilder()
                .setTitle('📥 Entrada em Novo Servidor!')
                .setColor(0x57F287)
                .addFields(
                    { name: '🏢 Servidor', value: `**${guild.name}** (\`${guild.id}\`)`, inline: true },
                    { name: '👑 Proprietário', value: `<@${guild.ownerId}> (\`${guild.ownerId}\`)`, inline: true },
                    { name: '👥 Membros', value: `\`${guild.memberCount || 'Desconhecido'}\``, inline: true },
                    { name: '📅 Criado em', value: `<t:${createdSec}:F>`, inline: false }
                )
                .setTimestamp();

            if (iconUrl) {
                embed.setThumbnail(iconUrl);
            }

            const avatarURL = client?.user?.displayAvatarURL ? client.user.displayAvatarURL() : undefined;

            await webhookClient.send({
                username: "Binder's Joins",
                avatarURL,
                embeds: [embed],
            }).catch(sendError => {
                if (isUnknownWebhookError(sendError)) {
                    markDeadWebhook(webhookUrl);
                }
            });
        } catch (err) {
            if (isUnknownWebhookError(err)) {
                markDeadWebhook(webhookUrl);
            } else if (!isDeadWebhook(webhookUrl)) {
                console.warn('[GuildCreate] Erro ao enviar log para webhook:', err.message);
            }
        } finally {
            if (webhookClient && typeof webhookClient.destroy === 'function') {
                try { webhookClient.destroy(); } catch (_) {}
            }
        }
    },
};
