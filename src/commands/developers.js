/**
 * @file developers.js
 * @description Global command /developers for bot management, eval, trusted devs and stats
 */

const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const util = require('node:util');
const db = require('../database/db.js');
const createEmbed = require('../utils/createEmbed.js');
const getLanguage = require('../utils/getLanguage.js');
const emojis = require('../config/emojis.js');
const safeReply = require('../utils/safeReply.js');

const OWNER_ID = '659214571634032667';

function getOwnerId() {
    return process.env.OWNER_ID || OWNER_ID;
}

function sanitizeOutput(text) {
    if (typeof text !== 'string') return text;
    let sanitized = text;
    const sensitiveKeys = [
        process.env.DISCORD_TOKEN,
        process.env.SUPABASE_KEY,
        process.env.DATABASE_URL,
        process.env.WEBHOOK_FEEDBACK,
        process.env.WEBHOOK_BUGS,
        process.env.WEBHOOK_BUGS_FEEDBACK,
        process.env.WEBHOOK_JOINS,
        process.env.WEBHOOK_INTERACTIONS,
        process.env.WEBHOOK_ERROS,
    ];
    for (const key of sensitiveKeys) {
        if (key && key.length > 5) {
            sanitized = sanitized.replaceAll(key, '[REDACTED_SECRET]');
        }
    }
    return sanitized;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('developers')
        .setDescription('Desenvolvedor ❯ Comandos restritos para a equipe de desenvolvedores do Binder.')
        .setDescriptionLocalizations({
            'en-US': 'Developer ❯ Restricted commands for Binder developer team.',
            'pt-BR': 'Desenvolvedor ❯ Comandos restritos para a equipe de desenvolvedores do Binder.',
        })
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2])
        .setDMPermission(true)
        .addSubcommand(sub =>
            sub
                .setName('eval')
                .setDescription('Desenvolvedor ❯ Executa código JavaScript diretamente no processo (Apenas Proprietário).')
                .setDescriptionLocalizations({
                    'en-US': 'Developer ❯ Execute JavaScript code directly in process (Owner Only).',
                    'pt-BR': 'Desenvolvedor ❯ Executa código JavaScript diretamente no processo (Apenas Proprietário).',
                })
                .addStringOption(opt =>
                    opt
                        .setName('codigo')
                        .setNameLocalizations({
                            'en-US': 'code',
                            'pt-BR': 'codigo',
                        })
                        .setDescription('O código JS a ser executado.')
                        .setDescriptionLocalizations({
                            'en-US': 'The JS code to execute.',
                            'pt-BR': 'O código JS a ser executado.',
                        })
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub
                .setName('adicionar')
                .setNameLocalizations({ 'en-US': 'add' })
                .setDescription('Desenvolvedor ❯ Adiciona um desenvolvedor confiável no sistema (Apenas Proprietário).')
                .setDescriptionLocalizations({
                    'en-US': 'Developer ❯ Add a trusted developer to system (Owner Only).',
                    'pt-BR': 'Desenvolvedor ❯ Adiciona um desenvolvedor confiável no sistema (Apenas Proprietário).',
                })
                .addUserOption(opt =>
                    opt
                        .setName('usuario')
                        .setNameLocalizations({
                            'en-US': 'user',
                            'pt-BR': 'usuario',
                        })
                        .setDescription('O usuário para conceder acesso de desenvolvedor.')
                        .setDescriptionLocalizations({
                            'en-US': 'The user to grant developer access.',
                            'pt-BR': 'O usuário para conceder acesso de desenvolvedor.',
                        })
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub
                .setName('remover')
                .setNameLocalizations({ 'en-US': 'remove' })
                .setDescription('Desenvolvedor ❯ Remove um desenvolvedor confiável do sistema (Apenas Proprietário).')
                .setDescriptionLocalizations({
                    'en-US': 'Developer ❯ Remove a trusted developer from system (Owner Only).',
                    'pt-BR': 'Desenvolvedor ❯ Remove um desenvolvedor confiável do sistema (Apenas Proprietário).',
                })
                .addUserOption(opt =>
                    opt
                        .setName('usuario')
                        .setNameLocalizations({
                            'en-US': 'user',
                            'pt-BR': 'usuario',
                        })
                        .setDescription('O desenvolvedor a ser removido.')
                        .setDescriptionLocalizations({
                            'en-US': 'The developer to remove.',
                            'pt-BR': 'O desenvolvedor a ser removido.',
                        })
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub
                .setName('stats')
                .setDescription('Desenvolvedor ❯ Exibe métricas e diagnóstico interno de runtime.')
                .setDescriptionLocalizations({
                    'en-US': 'Developer ❯ Displays internal runtime metrics and diagnostics.',
                    'pt-BR': 'Desenvolvedor ❯ Exibe métricas e diagnóstico interno de runtime.',
                })
        ),

    async execute(interaction, client) {
        const lang = getLanguage(interaction);
        const isPtBr = lang === 'pt_BR';
        const sub = interaction.options.getSubcommand();
        const ownerId = getOwnerId();
        const isOwner = interaction.user.id === ownerId || interaction.user.id === OWNER_ID;

        // 1. EVAL (Apenas OWNER)
        if (sub === 'eval') {
            if (!isOwner) {
                return safeReply(interaction, {
                    content: isPtBr
                        ? '⛔ Apenas o proprietário oficial do bot pode executar o comando eval.'
                        : '⛔ Only the official bot owner can execute the eval command.',
                    flags: [MessageFlags.Ephemeral],
                });
            }

            const code = interaction.options.getString('codigo') || interaction.options.getString('code');
            const startTime = performance.now();

            try {
                let evaluated = eval(code);
                if (evaluated && typeof evaluated.then === 'function') {
                    evaluated = await evaluated;
                }
                const duration = (performance.now() - startTime).toFixed(2);
                let output = util.inspect(evaluated, { depth: 0, maxArrayLength: 50 });
                output = sanitizeOutput(output);

                if (output.length > 1900) {
                    output = output.slice(0, 1900) + '\n... (truncado)';
                }

                const embed = await createEmbed(interaction, {
                    title: `⚡ Eval Concluído (${duration}ms)`,
                    description: `\`\`\`js\n${output}\n\`\`\``,
                    color: 0x57F287,
                });

                return safeReply(interaction, { embeds: [embed], flags: [MessageFlags.Ephemeral] });
            } catch (err) {
                const duration = (performance.now() - startTime).toFixed(2);
                let errOutput = sanitizeOutput(err.stack || err.message || String(err));
                if (errOutput.length > 1900) {
                    errOutput = errOutput.slice(0, 1900) + '\n... (truncado)';
                }

                const embed = await createEmbed(interaction, {
                    title: `❌ Erro no Eval (${duration}ms)`,
                    description: `\`\`\`js\n${errOutput}\n\`\`\``,
                    color: 0xED4245,
                });

                return safeReply(interaction, { embeds: [embed], flags: [MessageFlags.Ephemeral] });
            }
        }

        // 2. ADICIONAR (Apenas OWNER)
        if (sub === 'adicionar') {
            if (!isOwner) {
                return safeReply(interaction, {
                    content: isPtBr
                        ? '⛔ Apenas o proprietário oficial do bot pode adicionar desenvolvedores.'
                        : '⛔ Only the official bot owner can add developers.',
                    flags: [MessageFlags.Ephemeral],
                });
            }

            const targetUser = interaction.options.getUser('usuario') || interaction.options.getUser('user');
            if (!targetUser || !targetUser.id) {
                return safeReply(interaction, {
                    content: isPtBr ? '❌ Usuário não encontrado ou inválido.' : '❌ User not found or invalid.',
                    flags: [MessageFlags.Ephemeral],
                });
            }

            await db.updateUser(targetUser.id, { isDeveloper: 1 });

            const embed = await createEmbed(interaction, {
                title: isPtBr ? `${emojis.certo1} Desenvolvedor Adicionado!` : `${emojis.certo1} Developer Added!`,
                description: isPtBr
                    ? `O usuário <@${targetUser.id}> (\`${targetUser.id}\`) foi registrado com sucesso como **Desenvolvedor Confiável**.`
                    : `User <@${targetUser.id}> (\`${targetUser.id}\`) has been successfully registered as a **Trusted Developer**.`,
                color: 0x57F287,
            });

            return safeReply(interaction, { embeds: [embed] });
        }

        // 3. REMOVER (Apenas OWNER)
        if (sub === 'remover') {
            if (!isOwner) {
                return safeReply(interaction, {
                    content: isPtBr
                        ? '⛔ Apenas o proprietário oficial do bot pode remover desenvolvedores.'
                        : '⛔ Only the official bot owner can remove developers.',
                    flags: [MessageFlags.Ephemeral],
                });
            }

            const targetUser = interaction.options.getUser('usuario') || interaction.options.getUser('user');
            if (!targetUser || !targetUser.id) {
                return safeReply(interaction, {
                    content: isPtBr ? '❌ Usuário não encontrado ou inválido.' : '❌ User not found or invalid.',
                    flags: [MessageFlags.Ephemeral],
                });
            }

            if (targetUser.id === ownerId || targetUser.id === OWNER_ID) {
                return safeReply(interaction, {
                    content: isPtBr ? '❌ O proprietário principal não pode ser removido da equipe.' : '❌ The main owner cannot be removed from the team.',
                    flags: [MessageFlags.Ephemeral],
                });
            }

            await db.updateUser(targetUser.id, { isDeveloper: 0 });

            const embed = await createEmbed(interaction, {
                title: isPtBr ? `${emojis.lixeira} Desenvolvedor Removido!` : `${emojis.lixeira} Developer Removed!`,
                description: isPtBr
                    ? `O cargo de desenvolvedor foi revogado para o usuário <@${targetUser.id}> (\`${targetUser.id}\`).`
                    : `Developer access has been revoked for user <@${targetUser.id}> (\`${targetUser.id}\`).`,
                color: 0xFEE75C,
            });

            return safeReply(interaction, { embeds: [embed] });
        }

        // 4. STATS (Desenvolvedores e OWNER)
        if (sub === 'stats') {
            const dbUser = await db.getUser(interaction.user.id);
            const isDev = isOwner || (dbUser && (dbUser.isDeveloper === 1 || dbUser.is_developer === 1));

            if (!isDev) {
                return safeReply(interaction, {
                    content: isPtBr
                        ? '⛔ Este painel é restrito à equipe de desenvolvimento do Binder.'
                        : '⛔ This dashboard is restricted to Binder development team.',
                    flags: [MessageFlags.Ephemeral],
                });
            }

            const mem = process.memoryUsage();
            const uptimeSec = Math.floor(process.uptime());
            const days = Math.floor(uptimeSec / 86400);
            const hours = Math.floor((uptimeSec % 86400) / 3600);
            const mins = Math.floor((uptimeSec % 3600) / 60);
            const secs = uptimeSec % 60;
            const uptimeStr = `${days}d ${hours}h ${mins}m ${secs}s`;

            const dbMode = typeof db.getDatabaseMode === 'function' ? db.getDatabaseMode() : 'N/A';
            const cbOpen = typeof db.isCircuitBreakerOpen === 'function' ? db.isCircuitBreakerOpen() : false;

            const fields = [
                {
                    name: '💾 Memória (RAM)',
                    value: `• **Heap Usado:** \`${(mem.heapUsed / 1024 / 1024).toFixed(2)} MB\`\n• **Heap Total:** \`${(mem.heapTotal / 1024 / 1024).toFixed(2)} MB\`\n• **RSS:** \`${(mem.rss / 1024 / 1024).toFixed(2)} MB\`\n• **External:** \`${(mem.external / 1024 / 1024).toFixed(2)} MB\``,
                    inline: true,
                },
                {
                    name: '⚙️ Runtime & Sistema',
                    value: `• **Node.js:** \`${process.version}\`\n• **Plataforma:** \`${process.platform} (${process.arch})\`\n• **Uptime:** \`${uptimeStr}\`\n• **PID:** \`${process.pid}\``,
                    inline: true,
                },
                {
                    name: '🗄️ Banco de Dados',
                    value: `• **Modo Ativo:** \`${dbMode.toUpperCase()}\`\n• **Circuit Breaker:** \`${cbOpen ? 'ABERTO (Fallback)' : 'FECHADO (Normal)'}\`\n• **Pool Supabase:** \`${process.env.SUPABASE_URL ? 'Configurado' : 'Não definido'}\``,
                    inline: false,
                },
            ];

            const embed = await createEmbed(interaction, {
                title: isPtBr ? '🛠️ Diagnóstico do Sistema • Developers' : '🛠️ System Diagnostics • Developers',
                fields,
                color: 0x5865F2,
            });

            return safeReply(interaction, { embeds: [embed], flags: [MessageFlags.Ephemeral] });
        }
    },
};
