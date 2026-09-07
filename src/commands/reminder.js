/**
 * @file reminder.js
 * @description Slash command for creating, listing, and canceling persistent reminders
 */

const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const tosCheck = require('../utils/tosCheck.js');
const createEmbed = require('../utils/createEmbed.js');
const getLanguage = require('../utils/getLanguage.js');
const { parseTimeString, scheduleReminder, getUserReminders, cancelReminder, createReminder } = require('../utils/reminderManager.js');
const { getEmoji } = require('../config/emojis.js');
const colors = require('../config/colors.js');

function getReminderErrorMessage(timeStr, isPtBr) {
    if (!timeStr || typeof timeStr !== 'string') {
        return isPtBr
            ? `${getEmoji('errado')} Formato de tempo inválido. Exemplos válidos: \`10m\`, \`30m\`, \`2h\`, \`1d\`, \`1w\`, \`2d 4h\`.`
            : `${getEmoji('errado')} Invalid time format. Valid examples: \`10m\`, \`30m\`, \`2h\`, \`1d\`, \`1w\`, \`2d 4h\`.`;
    }
    const clean = timeStr.trim().toLowerCase();
    if (clean.length > 100) {
        return isPtBr
            ? `${getEmoji('errado')} O formato de tempo fornecido é muito longo (máximo 100 caracteres).`
            : `${getEmoji('errado')} The provided time format is too long (maximum 100 characters).`;
    }
    if (clean.includes('-')) {
        return isPtBr
            ? `${getEmoji('errado')} Valores negativos não são permitidos para agendamento de lembretes.`
            : `${getEmoji('errado')} Negative values are not allowed for scheduling reminders.`;
    }

    const regex = /(\d+)\s*([smhdw]|segundos?|minutos?|horas?|dias?|semanas?|seconds?|minutes?|hours?|days?|weeks?)/g;
    let match;
    let rawMs = 0;
    let matchCount = 0;

    while ((match = regex.exec(clean)) !== null) {
        matchCount++;
        const val = parseInt(match[1], 10);
        const unit = match[2];
        if (isNaN(val) || val <= 0) continue;
        if (unit.startsWith('s') && !unit.startsWith('sem')) rawMs += val * 1000;
        else if (unit === 'm' || unit.startsWith('min')) rawMs += val * 60 * 1000;
        else if (unit.startsWith('h')) rawMs += val * 3600 * 1000;
        else if (unit.startsWith('d')) rawMs += val * 86400 * 1000;
        else if (unit.startsWith('w') || unit.startsWith('sem')) rawMs += val * 7 * 86400 * 1000;
    }

    if (matchCount === 0 && /^\d+$/.test(clean)) {
        const num = parseInt(clean, 10);
        if (!isNaN(num) && num > 0) rawMs = num * 60 * 1000;
    }

    if (rawMs > 0 && rawMs < 5000) {
        return isPtBr
            ? `${getEmoji('errado')} O tempo mínimo para agendamento é de 5 segundos (\`5s\`).`
            : `${getEmoji('errado')} The minimum duration for a reminder is 5 seconds (\`5s\`).`;
    }

    if (rawMs > 2147483647) {
        return isPtBr
            ? `${getEmoji('errado')} O tempo máximo para um lembrete é de 24 dias (~24,8 dias / limite de 32 bits).`
            : `${getEmoji('errado')} The maximum duration for a reminder is 24 days (~24.8 days / 32-bit limit).`;
    }

    return isPtBr
        ? `${getEmoji('errado')} Formato de tempo inválido. Exemplos válidos: \`10m\`, \`30m\`, \`2h\`, \`1d\`, \`1w\`, \`2d 4h\`.`
        : `${getEmoji('errado')} Invalid time format. Valid examples: \`10m\`, \`30m\`, \`2h\`, \`1d\`, \`1w\`, \`2d 4h\`.`;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reminder')
        .setNameLocalizations({ 'en-US': 'reminder', 'pt-BR': 'lembrete' })
        .setDescription('Cria, lista ou gerencia lembretes personalizados.')
        .setDescriptionLocalizations({
            'en-US': 'Create, list, or manage personal persistent reminders.',
            'pt-BR': 'Cria, lista ou gerencia lembretes personalizados.',
        })
        .addSubcommand(sub =>
            sub
                .setName('criar')
                .setNameLocalizations({ 'en-US': 'create', 'pt-BR': 'criar' })
                .setDescription('Utilidades ❯ Agenda um novo lembrete.')
                .setDescriptionLocalizations({ 'en-US': 'Utilities ❯ Schedules a new reminder.', 'pt-BR': 'Utilidades ❯ Agenda um novo lembrete.' })
                .addStringOption(opt =>
                    opt
                        .setName('tempo')
                        .setNameLocalizations({ 'en-US': 'time' })
                        .setDescription('Tempo até o aviso (ex: 10m, 2h, 1d, 1w)')
                        .setRequired(true)
                )
                .addStringOption(opt =>
                    opt
                        .setName('mensagem')
                        .setNameLocalizations({ 'en-US': 'message' })
                        .setDescription('O que você quer que o bot te lembre?')
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub
                .setName('listar')
                .setNameLocalizations({ 'en-US': 'list', 'pt-BR': 'listar' })
                .setDescription('Utilidades ❯ Lista todos os seus lembretes pendentes.')
                .setDescriptionLocalizations({ 'en-US': 'Utilities ❯ Lists all your active pending reminders.', 'pt-BR': 'Utilidades ❯ Lista todos os seus lembretes pendentes.' })
        )
        .addSubcommand(sub =>
            sub
                .setName('cancelar')
                .setNameLocalizations({ 'en-US': 'cancel', 'pt-BR': 'cancelar' })
                .setDescription('Utilidades ❯ Cancela um lembrete pendente pelo ID.')
                .setDescriptionLocalizations({ 'en-US': 'Utilities ❯ Cancels a pending reminder by its ID.', 'pt-BR': 'Utilidades ❯ Cancela um lembrete pendente pelo ID.' })
                .addStringOption(opt =>
                    opt
                        .setName('id')
                        .setDescription('ID do lembrete a cancelar')
                        .setRequired(true)
                )
        ),

    async execute(interaction, client) {
        const canProceed = await tosCheck(interaction);
        if (!canProceed) return;

        const sub = interaction.options.getSubcommand();
        const lang = getLanguage(interaction);
        const isPtBr = lang === 'pt_BR';

        // CRIAR
        if (sub === 'criar') {
            const timeStr = interaction.options.getString('tempo') || interaction.options.getString('time');
            const message = interaction.options.getString('mensagem') || interaction.options.getString('message');
            const durationMs = parseTimeString(timeStr);

            if (!durationMs) {
                return interaction.reply({
                    content: getReminderErrorMessage(timeStr, isPtBr),
                    flags: [MessageFlags.Ephemeral],
                });
            }

            const dueTimestamp = Date.now() + durationMs;
            const reminderId = `rem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

            const reminderData = {
                id: reminderId,
                userId: interaction.user.id,
                guildId: interaction.guild?.id || null,
                channelId: interaction.channel?.id || null,
                message,
                dueTimestamp,
                createdAt: Date.now(),
                completed: 0,
            };

            await createReminder(reminderData);
            scheduleReminder(client, reminderData);

            const unixDue = Math.floor(dueTimestamp / 1000);
            const embed = await createEmbed(interaction, {
                title: isPtBr ? `${getEmoji('relogio')} Lembrete Agendado!` : `${getEmoji('relogio')} Reminder Scheduled!`,
                description: isPtBr
                    ? `Eu vou te lembrar sobre isso em **<t:${unixDue}:F>** (<t:${unixDue}:R>).`
                    : `I will remind you about this on **<t:${unixDue}:F>** (<t:${unixDue}:R>).`,
                fields: [
                    { name: isPtBr ? '📝 Mensagem' : '📝 Message', value: message, inline: false },
                    { name: '🆔 ID', value: '`' + reminderId + '`', inline: true },
                ],
                color: colors.warning || 0xFEE75C,
            });

            return interaction.reply({ embeds: [embed] });
        }

        // LISTAR
        if (sub === 'listar') {
            const userReminders = await getUserReminders(interaction.user.id);

            if (!userReminders || userReminders.length === 0) {
                return interaction.reply({
                    content: isPtBr ? `${getEmoji('carta')} Você não possui nenhum lembrete ativo no momento.` : `${getEmoji('carta')} You have no active pending reminders at this moment.`,
                    flags: [MessageFlags.Ephemeral],
                });
            }

            const fields = userReminders.slice(0, 10).map((r, i) => {
                const unix = Math.floor(r.dueTimestamp / 1000);
                return {
                    name: `${i + 1}. ID: \`${r.id}\``,
                    value: `**${isPtBr ? 'Data' : 'Due'}:** <t:${unix}:F> (<t:${unix}:R>)\n**${isPtBr ? 'Mensagem' : 'Message'}:** ${r.message.length > 80 ? r.message.substring(0, 77) + '...' : r.message}`,
                    inline: false,
                };
            });

            const embed = await createEmbed(interaction, {
                title: isPtBr ? `${getEmoji('relogio')} Seus Lembretes Ativos (${userReminders.length})` : `${getEmoji('relogio')} Your Active Reminders (${userReminders.length})`,
                fields,
                color: colors.primary || 0x5865F2,
            });

            return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
        }

        // CANCELAR
        if (sub === 'cancelar') {
            const targetId = interaction.options.getString('id');
            const userReminders = await getUserReminders(interaction.user.id);
            const found = userReminders.find(r => r.id === targetId);

            if (!found) {
                return interaction.reply({
                    content: isPtBr ? `${getEmoji('errado')} Lembrete não encontrado ou não pertence a você.` : `${getEmoji('errado')} Reminder not found or does not belong to you.`,
                    flags: [MessageFlags.Ephemeral],
                });
            }

            await cancelReminder(targetId);
            return interaction.reply({
                content: isPtBr ? `${getEmoji('confere')} O lembrete \`${targetId}\` foi cancelado com sucesso.` : `${getEmoji('confere')} Reminder \`${targetId}\` was successfully canceled.`,
                flags: [MessageFlags.Ephemeral],
            });
        }
    },
};
