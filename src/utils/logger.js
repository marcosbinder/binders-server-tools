/**
 * @file logger.js
 * @description Centralized, structured logging system with multi-transport support
 * (Console, Rotating File Logs, Supabase bot_logs, and Discord Error Webhooks)
 */

const fs = require('fs');
const path = require('path');
const { WebhookClient, EmbedBuilder } = require('discord.js');

const LOGS_DIR = path.join(process.cwd(), 'logs');
if (!fs.existsSync(LOGS_DIR)) {
    try {
        fs.mkdirSync(LOGS_DIR, { recursive: true });
    } catch (_) {}
}

const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    AUDIT: 2,
    WARN: 3,
    ERROR: 4,
};

const deadWebhooks = new Set();

function isDeadWebhook(url) {
    if (!url) return false;
    return deadWebhooks.has(url);
}

function markDeadWebhook(url) {
    if (!url) return;
    if (!deadWebhooks.has(url)) {
        deadWebhooks.add(url);
        console.warn(`[Logger/Webhook] Webhook desativado permanentemente (Discord 10015 Unknown Webhook / 404). Envios futuros suprimidos.`);
    }
}

function isUnknownWebhookError(err) {
    if (!err) return false;
    return err.code === 10015 ||
           err.status === 404 ||
           (typeof err.message === 'string' && (err.message.includes('10015') || err.message.includes('Unknown Webhook')));
}

const CURRENT_LEVEL = process.env.NODE_ENV === 'production' ? LOG_LEVELS.INFO : LOG_LEVELS.DEBUG;

function getTimestamp() {
    return new Date().toISOString();
}

function getLogDate() {
    return new Date().toISOString().split('T')[0];
}

function writeToFile(level, message, metadata) {
    try {
        const dateStr = getLogDate();
        const combinedFile = path.join(LOGS_DIR, `binder-${dateStr}.log`);
        const errorFile = path.join(LOGS_DIR, `error-${dateStr}.log`);

        const logEntry = JSON.stringify({
            timestamp: getTimestamp(),
            level,
            message,
            metadata: metadata || {}
        }) + '\n';

        fs.appendFileSync(combinedFile, logEntry);
        if (level === 'ERROR') {
            fs.appendFileSync(errorFile, logEntry);
        }
    } catch (err) {
        // Fallback to stderr if disk write fails
        console.error('[Logger/FileFallback] Failed to append to log file:', err.message);
    }
}

class Logger {
    static debug(message, metadata) {
        if (CURRENT_LEVEL <= LOG_LEVELS.DEBUG) {
            console.log(`\x1b[90m[${getTimestamp()}] [DEBUG]\x1b[0m ${message}`, metadata ? metadata : '');
            writeToFile('DEBUG', message, metadata);
        }
    }

    static info(message, metadata) {
        if (CURRENT_LEVEL <= LOG_LEVELS.INFO) {
            console.log(`\x1b[36m[${getTimestamp()}] [INFO]\x1b[0m ${message}`, metadata ? metadata : '');
            writeToFile('INFO', message, metadata);
        }
    }

    static audit(message, metadata) {
        if (CURRENT_LEVEL <= LOG_LEVELS.AUDIT) {
            console.log(`\x1b[35m[${getTimestamp()}] [AUDIT]\x1b[0m ${message}`, metadata ? metadata : '');
            writeToFile('AUDIT', message, metadata);
        }
    }

    static warn(message, metadata) {
        if (CURRENT_LEVEL <= LOG_LEVELS.WARN) {
            console.warn(`\x1b[33m[${getTimestamp()}] [WARN]\x1b[0m ${message}`, metadata ? metadata : '');
            writeToFile('WARN', message, metadata);
        }
    }

    static error(message, error, metadata = {}) {
        let errorDetails;
        if (error instanceof Error) {
            errorDetails = {
                name: error.name,
                message: error.message,
                stack: error.stack
            };
        } else if (error !== undefined && error !== null) {
            errorDetails = { message: String(error) };
        } else {
            errorDetails = { message: '' };
        }

        const fullMeta = { ...metadata, error: errorDetails };
        console.error(`\x1b[31m[${getTimestamp()}] [ERROR]\x1b[0m ${message}`, errorDetails.message ? errorDetails.message : '');
        if (error && error.stack) {
            console.error(`\x1b[90m${error.stack}\x1b[0m`);
        }

        writeToFile('ERROR', message, fullMeta);
    }

    /**
     * Specialized logger for Discord slash command & interaction lifecycle
     */
    static command(interaction, status = 'EXECUTED', durationMs = 0, error = null) {
        if (!interaction) return;

        const meta = {
            command: interaction.commandName || interaction.customId || 'unknown',
            type: interaction.type,
            user: {
                id: interaction.user?.id || '0',
                tag: interaction.user?.tag || interaction.user?.username || 'Unknown'
            },
            guild: interaction.guild ? {
                id: interaction.guild.id,
                name: interaction.guild.name
            } : 'DM',
            channelId: interaction.channelId || interaction.channel?.id || null,
            durationMs,
            status,
            error: error ? (error.message || String(error)) : null
        };

        const color = status === 'SUCCESS' || status === 'EXECUTED' ? '\x1b[32m' : (status === 'DENIED' ? '\x1b[33m' : '\x1b[31m');
        console.log(`${color}[${getTimestamp()}] [COMMAND]\x1b[0m /${meta.command} by ${meta.user.tag} (${status}) +${durationMs}ms`);
        writeToFile('AUDIT', `Command /${meta.command} ${status}`, meta);

        // Webhook error dispatch is handled by interactionErrorHandler to avoid duplicate dispatches.
    }

    static isDeadWebhook(url) {
        return isDeadWebhook(url);
    }

    static markDeadWebhook(url) {
        markDeadWebhook(url);
    }

    /**
     * Dispatches critical errors to Discord webhook (preserves compatibility with logHandler)
     */
    static async logErrorToWebhook(interaction, error) {
        // Idempotency guard: ensure errors are logged once, not duplicated between interactionHandler and logger
        if (interaction) {
            if (interaction._errorLoggedToWebhook) return;
            interaction._errorLoggedToWebhook = true;
        }

        const url = process.env.WEBHOOK_ERROS;
        if (!url || isDeadWebhook(url)) return;

        let webhookClient;
        try {
            webhookClient = new WebhookClient({ url });
            const errorType = error ? 'Erro de Execução' : 'Comando/Interação Não Encontrada';

            const embed = new EmbedBuilder()
                .setTitle(`🚨 Relatório de Erro: ${errorType}`)
                .setColor(0xED4245)
                .addFields(
                    { name: 'Usuário', value: `${interaction?.user?.tag || interaction?.user?.username || 'Desconhecido'} (\`${interaction?.user?.id || 'N/A'}\`)`, inline: true },
                    { name: 'Comando/ID', value: `\`${interaction?.commandName || interaction?.customId || 'N/A'}\``, inline: true },
                    { name: 'Canal', value: interaction?.channel ? `${interaction.channel.name} (\`${interaction.channel.id}\`)` : 'DM', inline: true },
                    { name: 'Servidor', value: interaction?.guild ? `${interaction.guild.name} (\`${interaction.guild.id}\`)` : 'DM', inline: true }
                )
                .setTimestamp();

            if (error && error.stack) {
                embed.setDescription(`\`\`\`js\n${error.stack.slice(0, 3900)}\n\`\`\``);
            }

            const avatarURL = interaction?.client?.user?.displayAvatarURL ? interaction.client.user.displayAvatarURL() : undefined;

            await webhookClient.send({
                username: "Binder's Logs",
                avatarURL,
                embeds: [embed],
            }).catch(sendError => {
                if (isUnknownWebhookError(sendError)) {
                    markDeadWebhook(url);
                    return;
                }
                throw sendError;
            });
        } catch (webhookError) {
            if (isUnknownWebhookError(webhookError)) {
                markDeadWebhook(url);
            } else if (!isDeadWebhook(url)) {
                console.error('[Logger] Falha crítica ao enviar para webhook:', webhookError.message);
            }
        } finally {
            if (webhookClient && typeof webhookClient.destroy === 'function') {
                try { webhookClient.destroy(); } catch (_) {}
            }
        }
    }
}

// Preserve backward compatibility with existing logHandler
module.exports = Logger;
module.exports.logErrorToWebhook = Logger.logErrorToWebhook;
module.exports.isDeadWebhook = isDeadWebhook;
module.exports.markDeadWebhook = markDeadWebhook;
module.exports.deadWebhooks = deadWebhooks;

