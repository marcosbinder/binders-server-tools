const { SlashCommandBuilder } = require('discord.js');
const tosCheck = require('../utils/tosCheck.js');
const path = require('node:path');
const interactionErrorHandler = require('../utils/interactionErrorHandler.js');
const devSubcommandHandler = require('../utils/devSubcommandHandler.js');

// lista de subcomandos que ainda estão em desenvolvimento
const subcommandsInDevelopment = [];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('binder')
        .setDescription('Bot ❯ Comandos centrais do Binder\'s Server Tools')
        .setDescriptionLocalizations({
            'en-US': 'Bot ❯ Core commands for Binder\'s Server Tools',
            'pt-BR': 'Bot ❯ Comandos centrais do Binder\'s Server Tools',
        })
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2])
        .setDMPermission(true)
        .addSubcommand(subcommand =>
            subcommand
                .setName('ajuda')
                .setNameLocalizations({ 'en-US': 'help' })
                .setDescription('Bot ❯ Mostra o menu de ajuda interativo com todos os comandos.')
                .setDescriptionLocalizations({
                    'en-US': 'Bot ❯ Displays the interactive help menu with all available commands.',
                    'pt-BR': 'Bot ❯ Mostra o menu de ajuda interativo com todos os comandos.',
                })
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('info')
                .setDescription('Bot ❯ Mostra informações detalhadas sobre mim.')
                .setDescriptionLocalizations({
                    'en-US': 'Bot ❯ Displays detailed information about me.',
                    'pt-BR': 'Bot ❯ Mostra informações detalhadas sobre mim.',
                })
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('ping')
                .setDescription('Bot ❯ Mostra a latência e tempo de resposta da API.')
                .setDescriptionLocalizations({
                    'en-US': 'Bot ❯ Displays the latency and API response time.',
                    'pt-BR': 'Bot ❯ Mostra a latência e tempo de resposta da API.',
                })
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('convidar')
                .setNameLocalizations({ 'en-US': 'invite' })
                .setDescription('Bot ❯ Receba links de convite e suporte do Binder.')
                .setDescriptionLocalizations({
                    'en-US': 'Bot ❯ Get invite and support links for Binder.',
                    'pt-BR': 'Bot ❯ Receba links de convite e suporte do Binder.',
                })
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('feedback')
                .setDescription('Bot ❯ Envia uma sugestão ou feedback para a equipe de desenvolvimento.')
                .setDescriptionLocalizations({
                    'en-US': 'Bot ❯ Send a suggestion or feedback to the development team.',
                    'pt-BR': 'Bot ❯ Envia uma sugestão ou feedback para a equipe de desenvolvimento.',
                })
                .addStringOption(option =>
                    option
                        .setName('mensagem')
                        .setNameLocalizations({
                            'en-US': 'message',
                            'pt-BR': 'mensagem',
                        })
                        .setDescription('Descreva sua sugestão ou feedback (mínimo 10 caracteres).')
                        .setDescriptionLocalizations({
                            'en-US': 'Describe your suggestion or feedback (minimum 10 characters).',
                            'pt-BR': 'Descreva sua sugestão ou feedback (mínimo 10 caracteres).',
                        })
                        .setMinLength(10)
                        .setMaxLength(2000)
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('bugreport')
                .setDescription('Bot ❯ Reporta um erro ou bug encontrado no bot.')
                .setDescriptionLocalizations({
                    'en-US': 'Bot ❯ Report an issue or bug found in the bot.',
                    'pt-BR': 'Bot ❯ Reporta um erro ou bug encontrado no bot.',
                })
                .addStringOption(option =>
                    option
                        .setName('descricao')
                        .setNameLocalizations({
                            'en-US': 'description',
                            'pt-BR': 'descricao',
                        })
                        .setDescription('Descreva o problema encontrado em detalhes (mínimo 10 caracteres).')
                        .setDescriptionLocalizations({
                            'en-US': 'Describe the encountered problem in detail (minimum 10 characters).',
                            'pt-BR': 'Descreva o problema encontrado em detalhes (mínimo 10 caracteres).',
                        })
                        .setMinLength(10)
                        .setMaxLength(2000)
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('novidades')
                .setNameLocalizations({ 'en-US': 'news' })
                .setDescription('Bot ❯ Veja as últimas atualizações e novidades do Binder.')
                .setDescriptionLocalizations({
                    'en-US': 'Bot ❯ View the latest features and changelogs for Binder.',
                    'pt-BR': 'Bot ❯ Veja as últimas atualizações e novidades do Binder.',
                })
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('idioma')
                .setNameLocalizations({ 'en-US': 'language' })
                .setDescription('Personalização ❯ Altera o seu idioma de preferência.')
                .setDescriptionLocalizations({
                    'en-US': 'Personalization ❯ Changes your preferred language.',
                    'pt-BR': 'Personalização ❯ Altera o seu idioma de preferência.',
                })
        ),

    async execute(interaction, client) {
        const canProceed = await tosCheck(interaction);
        if (!canProceed) return;
        
        const subCommandName = interaction.options.getSubcommand();

        if (subcommandsInDevelopment.includes(subCommandName)) {
            return devSubcommandHandler.execute(interaction);
        }
        
        const categoryMap = {
            'ajuda': 'bot',
            'info': 'bot',
            'ping': 'bot',
            'convidar': 'bot',
            'feedback': 'bot',
            'bugreport': 'bot',
            'novidades': 'bot',
            'idioma': 'personalizacao',
        };
        const category = categoryMap[subCommandName];

        if (!category) {
            const error = new Error(`Categoria de subcomando não encontrada para: ${subCommandName}`);
            return interactionErrorHandler.execute(interaction, error);
        }
        
        try {
            const subCommandPath = path.join(process.cwd(), 'src', 'subcommands', 'binder', category, `${subCommandName}.js`);
            const subCommand = require(subCommandPath);
            await subCommand.execute(interaction, client);
        } catch (error) {
            console.error(`Erro ao carregar o subcomando '${subCommandName}':`, error);
            return interactionErrorHandler.execute(interaction, error);
        }
    },
};