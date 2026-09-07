/**
 * @file interactionWebhookLogger.js
 * @description Buffered, rate-limit safe logger sending command executions to WEBHOOK_INTERACTIONS.
 * Strictly logs Slash Commands and Context Menus only (skips buttons, selects, modals, autocompletes).
 */

const { WebhookClient, EmbedBuilder } = require('discord.js');
const { isDeadWebhook, markDeadWebhook } = require('./logger.js');

const queue = [];
const MAX_QUEUE_SIZE = 500;
let isFlushing = false;
let flushTimer = null;
const FLUSH_INTERVAL_MS = 2500; // 2.5s between webhook batches to strictly protect against rate limits
let cachedClient = null;

function setClient(client) {
    if (client) cachedClient = client;
}

function isUnknownWebhookError(err) {
    if (!err) return false;
    return err.code === 10015 ||
           err.status === 404 ||
           (typeof err.message === 'string' && (err.message.includes('10015') || err.message.includes('Unknown Webhook')));
}

function shouldLogInteraction(interaction) {
    if (!interaction) return false;
    const isChat = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const isContext = typeof interaction.isContextMenuCommand === 'function' && interaction.isContextMenuCommand();
    return isChat || isContext;
}

function queueInteractionLog(interaction, status = 'SUCCESS', durationMs = 0, error = null) {
    // 1. Skip non-slash commands and non-context menus (buttons, selects, modals, autocompletes)
    if (!shouldLogInteraction(interaction)) {
        return false;
    }

    if (interaction.client) {
        cachedClient = interaction.client;
    }

    const webhookUrl = process.env.WEBHOOK_INTERACTIONS;
    if (!webhookUrl || isDeadWebhook(webhookUrl)) {
        return false;
    }

    if (queue.length >= MAX_QUEUE_SIZE) {
        queue.shift(); // Evict oldest entry when capacity ceiling is reached
    }

    queue.push({
        commandName: interaction.commandName || interaction.customId || 'desconhecido',
        userId: interaction.user?.id || '0',
        userTag: interaction.user?.tag || interaction.user?.username || 'Desconhecido',
        guildName: interaction.guild?.name || 'DM',
        guildId: interaction.guild?.id || null,
        status,
        durationMs,
        error: error ? (error.message || String(error)) : null,
        timestamp: Date.now(),
        avatarURL: interaction.client?.user?.displayAvatarURL?.() || undefined,
    });

    scheduleFlush();
    return true;
}

function scheduleFlush() {
    if (flushTimer || isFlushing) return;
    flushTimer = setTimeout(() => {
        flushTimer = null;
        flushQueue().catch(() => {});
    }, FLUSH_INTERVAL_MS);
    if (flushTimer.unref) flushTimer.unref();
}

async function flushQueue() {
    if (isFlushing || queue.length === 0) return;
    const webhookUrl = process.env.WEBHOOK_INTERACTIONS;
    if (!webhookUrl || isDeadWebhook(webhookUrl)) {
        queue.length = 0;
        return;
    }

    isFlushing = true;
    const batch = queue.splice(0, 10); // Take up to 10 entries per webhook message

    let webhookClient;
    try {
        webhookClient = new WebhookClient({ url: webhookUrl });

        const hasErrors = batch.some(b => b.status === 'ERROR' || b.status === 'FATAL_ERROR');
        const color = hasErrors ? 0xED4245 : 0xAEA7BD;

        const avatarURL = cachedClient?.user?.displayAvatarURL?.()
            || batch.find(b => b.avatarURL)?.avatarURL
            || undefined;

        const embed = new EmbedBuilder()
            .setTitle(`⚡ Registro de Comandos (${batch.length} ${batch.length === 1 ? 'execução' : 'execuções'})`)
            .setColor(color)
            .setTimestamp();

        if (avatarURL) {
            embed.setFooter({
                text: "Binder's Server Tools • Interaction Logger",
                iconURL: avatarURL,
            });
        } else {
            embed.setFooter({
                text: "Binder's Server Tools • Interaction Logger",
            });
        }

        const formattedEntries = batch.map(b => {
            const header = `### ⚡ Execução de Comando`;
            const cmd = `> **Comando:** \`/${b.commandName}\``;
            const usr = `> **Usuário:** **${b.userTag}** (\`${b.userId}\`)`;
            const loc = `> **Local:** ${b.guildId ? `**${b.guildName}** (\`${b.guildId}\`)` : 'Direct Message (DM)'}`;
            const dur = `> **Duração:** \`${b.durationMs}ms\` • **Status:** \`${b.status}\``;
            const lines = [header, cmd, usr, loc, dur];
            if (b.error) {
                const safeErr = b.error.length > 300 ? `${b.error.slice(0, 300)}...` : b.error;
                lines.push(`-# ⚠️ Erro: \`${safeErr}\``);
            }
            return lines.join('\n');
        });

        embed.setDescription(formattedEntries.join('\n\n').slice(0, 4000));

        await webhookClient.send({
            username: "Binder's Interactions",
            avatarURL,
            embeds: [embed],
        }).catch(err => {
            if (isUnknownWebhookError(err)) {
                markDeadWebhook(webhookUrl);
            }
        });
    } catch (err) {
        if (isUnknownWebhookError(err)) {
            markDeadWebhook(webhookUrl);
        } else if (!isDeadWebhook(webhookUrl)) {
            console.warn('[InteractionLogger] Erro ao enviar log de interação para webhook:', err.message);
        }
    } finally {
        if (webhookClient && typeof webhookClient.destroy === 'function') {
            try { webhookClient.destroy(); } catch (_) {}
        }
        isFlushing = false;
        if (queue.length > 0) {
            scheduleFlush();
        }
    }
}

function getQueueSize() {
    return queue.length;
}

function clearQueue() {
    queue.length = 0;
}

module.exports = {
    queueInteractionLog,
    flushQueue,
    getQueueSize,
    clearQueue,
    shouldLogInteraction,
    setClient,
};
