/**
 * @file reminderManager.js
 * @description Persistent reminder scheduler and time string parser
 */

const { getPendingReminders, completeReminder, createReminder, getUserReminders, deleteReminder, getUser } = require('../database/db.js');
const { getEmoji } = require('../config/emojis.js');
const colors = require('../config/colors.js');

const MAX_REMINDER_MS = 2147483647; // 2^31 - 1 ms (~24.85 days)
const MIN_REMINDER_MS = 5000;       // 5,000 ms (5 seconds)

function parseTimeString(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return null;
    const clean = timeStr.trim().toLowerCase();

    // Guard: reject strings that are too long or contain negative values/signs
    if (clean.length > 100 || clean.includes('-')) return null;

    const regex = /(\d+)\s*([smhdw]|segundos?|minutos?|horas?|dias?|semanas?|seconds?|minutes?|hours?|days?|weeks?)/g;
    let match;
    let totalMs = 0;
    let matchCount = 0;

    while ((match = regex.exec(clean)) !== null) {
        matchCount++;
        const val = parseInt(match[1], 10);
        const unit = match[2];

        if (isNaN(val) || val <= 0 || !Number.isFinite(val)) continue;

        if (unit.startsWith('s') && !unit.startsWith('sem')) {
            totalMs += val * 1000;
        } else if (unit === 'm' || unit.startsWith('min')) {
            totalMs += val * 60 * 1000;
        } else if (unit.startsWith('h')) {
            totalMs += val * 3600 * 1000;
        } else if (unit.startsWith('d')) {
            totalMs += val * 86400 * 1000;
        } else if (unit.startsWith('w') || unit.startsWith('sem')) {
            totalMs += val * 7 * 86400 * 1000;
        }
    }

    if (matchCount === 0 && /^\d+$/.test(clean)) {
        const num = parseInt(clean, 10);
        if (!isNaN(num) && num > 0 && Number.isFinite(num)) {
            totalMs = num * 60 * 1000;
        }
    }

    if (!Number.isFinite(totalMs) || totalMs < MIN_REMINDER_MS || totalMs > MAX_REMINDER_MS) {
        return null;
    }
    return totalMs;
}

const activeTimeouts = new Map();

/**
 * Cancels a scheduled reminder, clearing in-memory timer and database row
 * @param {string} id - Reminder ID
 * @returns {Promise<boolean>}
 */
async function cancelReminder(id) {
    if (!id) return false;
    let found = false;

    if (activeTimeouts.has(id)) {
        const timeout = activeTimeouts.get(id);
        if (timeout) clearTimeout(timeout);
        activeTimeouts.delete(id);
        found = true;
    }

    try {
        const pending = await getPendingReminders();
        if (pending && pending.some(r => r.id === id)) {
            found = true;
        }
    } catch {
        // ignore check errors
    }

    await deleteReminder(id);
    return found;
}

async function dispatchReminder(client, reminder) {
    if (!client || !reminder) return;

    // Clear active timeout reference and handle upon dispatch start for timer garbage collection
    if (activeTimeouts.has(reminder.id)) {
        const timer = activeTimeouts.get(reminder.id);
        clearTimeout(timer);
        activeTimeouts.delete(reminder.id);
    }
    await completeReminder(reminder.id).catch(() => null);

    let isPtBr = true;
    try {
        const userPref = await getUser(reminder.userId);
        if (userPref && userPref.language === 'lang_en_us') {
            isPtBr = false;
        }
    } catch {
        // default to pt-BR
    }

    try {
        const dispatchPromises = [];

        // 1. Enviar no canal do servidor em paralelo
        if (reminder.guildId && reminder.channelId && client.guilds) {
            const sendChannelPromise = (async () => {
                const guild = client.guilds.cache?.get(reminder.guildId) || (typeof client.guilds.fetch === 'function' ? await client.guilds.fetch(reminder.guildId) : null);
                if (!guild) throw new Error(`Guild ${reminder.guildId} not found`);
                const channel = guild.channels?.cache?.get(reminder.channelId) || (typeof guild.channels?.fetch === 'function' ? await guild.channels.fetch(reminder.channelId) : null);
                if (!channel || typeof channel.send !== 'function') throw new Error(`Channel ${reminder.channelId} not found or not sendable`);

                const channelFields = [
                    { name: isPtBr ? '💬 Mensagem' : '💬 Message', value: reminder.message, inline: false },
                ];
                if (reminder.guildId) {
                    channelFields.push({ name: isPtBr ? '🏠 Servidor' : '🏠 Server', value: guild.name || `ID: ${reminder.guildId}`, inline: true });
                }
                if (reminder.channelId) {
                    channelFields.push({ name: isPtBr ? '📢 Canal' : '📢 Channel', value: `<#${reminder.channelId}>`, inline: true });
                }

                return channel.send({
                    content: `${getEmoji('relogio')} <@${reminder.userId}>, ${isPtBr ? 'aqui está o seu lembrete!' : 'here is your reminder!'}`,
                    embeds: [{
                        title: `${getEmoji('relogio')} ${isPtBr ? 'Lembrete Disparado!' : 'Reminder Triggered!'}`,
                        description: reminder.message,
                        fields: channelFields,
                        color: colors.primary || 0xAEA7BD,
                        footer: { text: `Binder's Server Tools • ${isPtBr ? 'Lembretes' : 'Reminders'} • ID: ${reminder.id}` },
                        timestamp: new Date().toISOString()
                    }]
                });
            })();
            dispatchPromises.push(sendChannelPromise);
        }

        // 2. Enviar na DM do usuário ao mesmo tempo
        if (reminder.userId && client.users) {
            const sendDMPromise = (async () => {
                const user = client.users.cache?.get(reminder.userId) || (typeof client.users.fetch === 'function' ? await client.users.fetch(reminder.userId) : null);
                if (!user || typeof user.send !== 'function') throw new Error(`User ${reminder.userId} not found or not sendable`);

                const dmFields = [
                    { name: isPtBr ? '💬 Mensagem' : '💬 Message', value: reminder.message, inline: false },
                ];
                if (reminder.guildId) {
                    dmFields.push({ name: isPtBr ? '🏠 Servidor' : '🏠 Server', value: `ID: ${reminder.guildId}`, inline: true });
                }

                return user.send({
                    content: `${getEmoji('relogio')} ${isPtBr ? `Olá <@${reminder.userId}>, você pediu para ser lembrado:` : `Hello <@${reminder.userId}>, you asked to be reminded:`}`,
                    embeds: [{
                        title: `${getEmoji('relogio')} ${isPtBr ? 'Lembrete Disparado!' : 'Reminder Triggered!'}`,
                        description: reminder.message,
                        fields: dmFields,
                        color: colors.primary || 0xAEA7BD,
                        footer: { text: `Binder's Server Tools • ${isPtBr ? 'Lembretes' : 'Reminders'} • ID: ${reminder.id}` },
                        timestamp: new Date().toISOString()
                    }]
                });
            })();
            dispatchPromises.push(sendDMPromise);
        }

        // Authentic Promise.allSettled without catching/swallowing errors beforehand
        const results = await Promise.allSettled(dispatchPromises);
        const fulfilledCount = results.filter(r => r.status === 'fulfilled').length;

        // Only if both channel and DM fail, record or log the delivery failure
        if (dispatchPromises.length > 0 && fulfilledCount === 0) {
            const reasons = results.map(r => r.reason?.message || r.reason).join('; ');
            console.warn(`[ReminderManager] Falha total na entrega do lembrete ${reminder.id} (todas as ${dispatchPromises.length} tentativas falharam): ${reasons}`);
        }
    } catch (error) {
        console.error(`[ReminderManager] Falha ao despachar lembrete ${reminder.id}:`, error.message);
    }
}

function scheduleReminder(client, reminder) {
    if (!reminder || reminder.completed) return;
    if (activeTimeouts.has(reminder.id)) {
        clearTimeout(activeTimeouts.get(reminder.id));
    }

    const now = Date.now();
    const delay = Math.max(0, reminder.dueTimestamp - now);

    if (delay <= MAX_REMINDER_MS) {
        const timeout = setTimeout(() => {
            dispatchReminder(client, reminder);
        }, delay);
        if (typeof timeout.unref === 'function') timeout.unref();
        activeTimeouts.set(reminder.id, timeout);
    }
}

async function initReminderManager(client) {
    try {
        const pending = await getPendingReminders();
        const now = Date.now();

        for (const rem of pending) {
            if (rem.dueTimestamp <= now) {
                await dispatchReminder(client, rem);
            } else {
                scheduleReminder(client, rem);
            }
        }

        setInterval(async () => {
            try {
                const currentPending = await getPendingReminders();
                const curNow = Date.now();
                for (const rem of currentPending) {
                    if (rem.dueTimestamp <= curNow) {
                        await dispatchReminder(client, rem);
                    } else if (!activeTimeouts.has(rem.id)) {
                        scheduleReminder(client, rem);
                    }
                }
            } catch (err) {
                console.error('[ReminderManager] Erro no ciclo de verificação:', err.message);
            }
        }, 60000).unref();
    } catch (e) {
        console.error('[ReminderManager] Falha na inicialização:', e.message);
    }
}

module.exports = {
    parseTimeString,
    scheduleReminder,
    dispatchReminder,
    cancelReminder,
    initReminderManager,
    createReminder,
    getUserReminders,
    deleteReminder,
    activeTimeouts,
    MAX_REMINDER_MS,
    MIN_REMINDER_MS
};
