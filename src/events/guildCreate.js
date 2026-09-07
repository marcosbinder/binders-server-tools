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
            const createdValue = `<t:${createdSec}:F> (<t:${createdSec}:R>)`;

            let ownerTag = 'Desconhecido';
            const ownerMention = guild.ownerId ? `<@${guild.ownerId}>` : 'N/A';
            if (guild.ownerId && typeof guild.fetchOwner === 'function') {
                try {
                    const owner = await guild.fetchOwner().catch(() => null);
                    if (owner?.user) {
                        ownerTag = owner.user.tag || owner.user.username || 'Desconhecido';
                    }
                } catch (_) {}
            }

            const totalMembers = guild.memberCount ?? guild.members?.cache?.size ?? 0;
            let memberBreakdown = '';
            if (guild.members?.cache?.size) {
                const bots = guild.members.cache.filter(m => m.user?.bot).size;
                const humans = guild.members.cache.filter(m => !m.user?.bot).size;
                if (bots > 0 || humans > 0) {
                    memberBreakdown = ` (👤 \`${humans}\` humanos • 🤖 \`${bots}\` bots)`;
                }
            }

            const vanity = guild.vanityURLCode ? `https://discord.gg/${guild.vanityURLCode}` : null;
            const totalGuilds = client?.guilds?.cache?.size || 1;
            const totalUsers = client?.guilds?.cache?.reduce ? client.guilds.cache.reduce((acc, g) => acc + (g.memberCount || 0), 0) : null;
            const avatarURL = client?.user?.displayAvatarURL ? client.user.displayAvatarURL() : undefined;

            const descriptionLines = [
                `### 🏰 Informações do Servidor`,
                `> **Nome:** **${guild.name}**`,
                `> **ID:** \`${guild.id}\``,
                `> **Proprietário:** ${ownerMention} • **${ownerTag}** (\`${guild.ownerId || 'N/A'}\`)`,
                `> **Membros:** \`${totalMembers}\`${memberBreakdown}`,
                `> **Criado em:** ${createdValue}`,
            ];

            if (vanity) {
                descriptionLines.push(`> **Convite Personalizado:** ${vanity}`);
            }

            descriptionLines.push(
                ``,
                `### 📊 Estatísticas Globais do Bot`,
                `> **Total de Servidores:** \`${totalGuilds}\``
            );

            if (totalUsers) {
                descriptionLines.push(`> **Usuários Alcançados:** \`${totalUsers.toLocaleString('pt-BR')}\``);
            }

            const embed = new EmbedBuilder()
                .setTitle('📥 Entrada em Novo Servidor!')
                .setColor(0xAEA7BD)
                .setDescription(descriptionLines.join('\n'))
                .setTimestamp();

            if (iconUrl) {
                embed.setThumbnail(iconUrl);
            }

            if (avatarURL) {
                embed.setFooter({
                    text: `Binder's Server Tools • Servidor #${totalGuilds}`,
                    iconURL: avatarURL,
                });
            } else {
                embed.setFooter({
                    text: `Binder's Server Tools • Servidor #${totalGuilds}`,
                });
            }

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
