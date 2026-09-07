/**
 * @file interactionHandler.js
 * @description Central Discord interaction router supporting Slash Commands, Context Menus, Components and Anti-Spam Rate Limiting
 */

const { Events, MessageFlags } = require('discord.js');
const { getUser, setLastKnownLocale, recordCommandUsage } = require('../../database/db.js');
const tosCheck = require('../utils/tosCheck.js');
const checkInteractionOwnership = require('../utils/interactionOwnership.js');
const interactionErrorHandler = require('../utils/interactionErrorHandler.js');
const devCommandHandler = require('../utils/devCommandHandler.js');
const rateLimiter = require('../utils/rateLimiter.js');
const getLanguage = require('../utils/getLanguage.js');
const Logger = require('../utils/logger.js');
const { queueInteractionLog, setClient } = require('../utils/interactionWebhookLogger.js');
const { getEmoji } = require('../config/emojis.js');
const { wrapComponentInteractionUpdate } = require('../utils/componentsV2.js');

module.exports = {
    name: Events.InteractionCreate,
    once: false,
    async execute(interaction, client) {
        if (client) setClient(client);
        // Ignore automated bot interactions
        if (interaction.user?.bot) return;

        // Autocomplete interactions do not support Message Components V2 replies (they use respond())
        if (typeof interaction.isAutocomplete === 'function' && interaction.isAutocomplete()) return;

        const startTime = Date.now();

        try {
            // Auto-detect and save last known locale if user preference is automatic
            const userData = getUser(interaction.user.id);
            if (userData.language === 'lang_auto' && interaction.locale) {
                setLastKnownLocale(interaction.user.id, interaction.locale);
            }

            const isDev = userData.isDeveloper === 1 || interaction.user.id === process.env.OWNER_ID;
            const lang = getLanguage(interaction);
            const isPtBr = lang === 'pt_BR';

            // 1. Slash Commands & Context Menu Commands
            const isChatOrContext = (typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand()) ||
                                    (typeof interaction.isContextMenuCommand === 'function' && interaction.isContextMenuCommand());
            if (isChatOrContext) {
                // Anti-Spam Rate Limit (3000ms cooldown)
                const rateCheck = rateLimiter.check(interaction.user.id, `cmd:${interaction.commandName}`, 3000, isDev);
                if (rateCheck.limited) {
                    const elapsed = Date.now() - startTime;
                    Logger.command(interaction, 'RATE_LIMITED', elapsed);
                    queueInteractionLog(interaction, 'RATE_LIMITED', elapsed);
                    const waitSec = (rateCheck.remainingMs / 1000).toFixed(1);
                    const limitMsg = isPtBr
                        ? `${getEmoji('tempo')} Calma aí! Você está enviando comandos rápido demais. Aguarde **${waitSec}s**.`
                        : `${getEmoji('tempo')} Hold on! You are using commands too quickly. Please wait **${waitSec}s**.`;
                    return interaction.reply({ content: limitMsg, flags: [MessageFlags.Ephemeral] });
                }

                const canProceed = await tosCheck(interaction);
                if (!canProceed) {
                    const elapsed = Date.now() - startTime;
                    Logger.command(interaction, 'TOS_PENDING', elapsed);
                    return;
                }

                const command = client.commands.get(interaction.commandName);
                if (!command) {
                    const elapsed = Date.now() - startTime;
                    const err = new Error(`Comando não encontrado: ${interaction.commandName}`);
                    Logger.error(`Comando não encontrado: ${interaction.commandName}`, err, { userId: interaction.user?.id, command: interaction.commandName });
                    Logger.command(interaction, 'NOT_FOUND', elapsed, err);
                    queueInteractionLog(interaction, 'NOT_FOUND', elapsed, err);
                    return interactionErrorHandler.execute(interaction, err);
                }

                // Checa se o comando está marcado em desenvolvimento
                if (command.inDevelopment) {
                    const elapsed = Date.now() - startTime;
                    Logger.command(interaction, 'IN_DEVELOPMENT', elapsed);
                    queueInteractionLog(interaction, 'IN_DEVELOPMENT', elapsed);
                    return devCommandHandler.execute(interaction);
                }

                try {
                    await command.execute(interaction, client);
                    const elapsed = Date.now() - startTime;
                    Logger.command(interaction, 'SUCCESS', elapsed);
                    queueInteractionLog(interaction, 'SUCCESS', elapsed);
                    if (typeof recordCommandUsage === 'function') {
                        recordCommandUsage(interaction.commandName, interaction.user?.id).catch(() => {});
                    }
                } catch (error) {
                    const elapsed = Date.now() - startTime;
                    Logger.error(`Erro no comando ${interaction.commandName}:`, error, { userId: interaction.user?.id, command: interaction.commandName });
                    Logger.command(interaction, 'ERROR', elapsed, error);
                    queueInteractionLog(interaction, 'ERROR', elapsed, error);
                    return interactionErrorHandler.execute(interaction, error);
                }
                return;
            }

            // 2. Buttons & Select Menus (String & Channel)
            const isComponent = (typeof interaction.isButton === 'function' && interaction.isButton()) ||
                                (typeof interaction.isStringSelectMenu === 'function' && interaction.isStringSelectMenu()) ||
                                (typeof interaction.isChannelSelectMenu === 'function' && interaction.isChannelSelectMenu());
            if (isComponent) {
                wrapComponentInteractionUpdate(interaction);

                // Anti-Spam Rate Limit (1500ms cooldown)
                const prefix = interaction.customId ? interaction.customId.split('_')[0] : 'component';
                const rateCheck = rateLimiter.check(interaction.user.id, `component:${prefix}`, 1500, isDev);
                if (rateCheck.limited) {
                    Logger.command(interaction, 'RATE_LIMITED', Date.now() - startTime);
                    const waitSec = (rateCheck.remainingMs / 1000).toFixed(1);
                    const limitMsg = isPtBr
                        ? `${getEmoji('tempo')} Calma aí! Aguarde **${waitSec}s** antes de clicar novamente.`
                        : `${getEmoji('tempo')} Hold on! Please wait **${waitSec}s** before clicking again.`;
                    return interaction.reply({ content: limitMsg, flags: [MessageFlags.Ephemeral] });
                }

                const isOwner = await checkInteractionOwnership(interaction);
                if (!isOwner) {
                    Logger.command(interaction, 'DENIED_OWNERSHIP', Date.now() - startTime);
                    return;
                }

                if (interaction.customId.startsWith('start_tos')) {
                    const res = await tosCheck(interaction);
                    Logger.command(interaction, 'TOS_ACCEPT', Date.now() - startTime);
                    return res;
                }

                const handlerCollection = (typeof interaction.isButton === 'function' && interaction.isButton()) ? client.buttons : client.selects;
                const handler = handlerCollection ? handlerCollection.find(h => interaction.customId.startsWith(h.name)) : null;

                if (!handler) {
                    const err = new Error(`Handler de componente não encontrado: ${interaction.customId}`);
                    Logger.error(`Handler de componente não encontrado: ${interaction.customId}`, err, { userId: interaction.user?.id, customId: interaction.customId });
                    Logger.command(interaction, 'NOT_FOUND', Date.now() - startTime, err);
                    return interactionErrorHandler.execute(interaction, err);
                }

                try {
                    await handler.execute(interaction, client);
                    Logger.command(interaction, 'SUCCESS', Date.now() - startTime);
                } catch (error) {
                    Logger.error(`Erro no componente ${interaction.customId}:`, error, { userId: interaction.user?.id, customId: interaction.customId });
                    Logger.command(interaction, 'ERROR', Date.now() - startTime, error);
                    return interactionErrorHandler.execute(interaction, error);
                }
                return;
            }

            // 3. Modal Submissions
            const isModal = typeof interaction.isModalSubmit === 'function' && interaction.isModalSubmit();
            if (isModal) {
                const handler = client.modals ? client.modals.find(m => interaction.customId.startsWith(m.name)) : null;
                if (handler) {
                    try {
                        await handler.execute(interaction, client);
                        Logger.command(interaction, 'SUCCESS', Date.now() - startTime);
                    } catch (error) {
                        Logger.error(`Erro no modal ${interaction.customId}:`, error, { userId: interaction.user?.id, customId: interaction.customId });
                        Logger.command(interaction, 'ERROR', Date.now() - startTime, error);
                        return interactionErrorHandler.execute(interaction, error);
                    }
                } else {
                    const err = new Error(`Handler de modal não encontrado: ${interaction.customId}`);
                    Logger.error(`Handler de modal não encontrado: ${interaction.customId}`, err, { userId: interaction.user?.id, customId: interaction.customId });
                    Logger.command(interaction, 'NOT_FOUND', Date.now() - startTime, err);
                    return interactionErrorHandler.execute(interaction, err);
                }
            }
        } catch (unhandledErr) {
            Logger.error('Erro inesperado no processamento de interação:', unhandledErr, {
                userId: interaction.user?.id,
                command: interaction.commandName || interaction.customId
            });
            Logger.command(interaction, 'FATAL_ERROR', Date.now() - startTime, unhandledErr);
            return interactionErrorHandler.execute(interaction, unhandledErr).catch(() => null);
        }
    },
};