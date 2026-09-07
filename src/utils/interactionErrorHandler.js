const { MessageFlags } = require('discord.js');
const getLanguage = require('./getLanguage.js');
const createEmbed = require('./createEmbed.js');
const { logErrorToWebhook } = require('./logHandler.js');
const { getEmoji } = require('../config/emojis.js');
const urls = require('../config/urls.js');

const texts = {
    title: {
        'pt_BR': `${getEmoji('errado')} Opa, algo deu errado!`,
        'en_US': `${getEmoji('errado')} Oops, something went wrong!`,
    },
    description: {
        'pt_BR': `Não consegui processar sua solicitação. Pode ser um comando que não existe ou um erro interno.\n\nSe o problema continuar, por favor, entre no nosso [servidor de suporte](${urls.discordSupport || 'https://dsc.gg/bindersdc'}) e nos avise!`,
        'en_US': `I couldn't process your request. It might be a command that doesn't exist or an internal error.\n\nIf the problem persists, please join our [support server](${urls.discordSupport || 'https://dsc.gg/bindersdc'}) and let us know!`,
    },
    permTitle: {
        'pt_BR': `${getEmoji('cadeadofechado')} Permissões Insuficientes`,
        'en_US': `${getEmoji('cadeadofechado')} Missing Permissions`,
    },
    permDescription: {
        'pt_BR': `Não possuo permissões suficientes ou meu cargo está abaixo do cargo do membro alvo na hierarquia do servidor.\n\nPor favor, verifique se o meu cargo está posicionado **acima** dos cargos gerenciados e se as permissões necessárias estão ativas!`,
        'en_US': `I lack sufficient permissions or my role is below the target member's role in the server hierarchy.\n\nPlease verify that my role is positioned **above** the roles being managed and has the required permissions enabled!`,
    },
};

module.exports = {
    async execute(interaction, error) {
        await logErrorToWebhook(interaction, error).catch(() => null);

        const lang = getLanguage(interaction);
        const isPermError = error?.code === 50013 ||
            error?.status === 403 ||
            (typeof error?.message === 'string' && (
                error.message.toLowerCase().includes('missing permissions') ||
                error.message.toLowerCase().includes('hierarchy') ||
                error.message.toLowerCase().includes('privilege')
            ));

        const errorEmbed = await createEmbed(interaction, {
            title: isPermError
                ? (texts.permTitle[lang] || texts.permTitle.pt_BR)
                : (texts.title[lang] || texts.title.pt_BR),
            description: isPermError
                ? (texts.permDescription[lang] || texts.permDescription.pt_BR)
                : (texts.description[lang] || texts.description.pt_BR),
            color: 0xAEA7BD,
        });

        try {
            if (interaction.deferred && !interaction.replied) {
                return await interaction.editReply({ embeds: [errorEmbed] }).catch(async () => {
                    const fallbackText = `${texts.title[lang] || texts.title.pt_BR}\n${texts.description[lang] || texts.description.pt_BR}`;
                    return await interaction.editReply({ content: fallbackText }).catch(() => null);
                });
            }
            if (interaction.replied) {
                return await interaction.followUp({ embeds: [errorEmbed], flags: [MessageFlags.Ephemeral] }).catch(async () => {
                    const fallbackText = `${texts.title[lang] || texts.title.pt_BR}\n${texts.description[lang] || texts.description.pt_BR}`;
                    return await interaction.followUp({ content: fallbackText, flags: [MessageFlags.Ephemeral] }).catch(() => null);
                });
            }
            return await interaction.reply({ embeds: [errorEmbed], flags: [MessageFlags.Ephemeral] }).catch(async () => {
                const fallbackText = `${texts.title[lang] || texts.title.pt_BR}\n${texts.description[lang] || texts.description.pt_BR}`;
                return await interaction.reply({ content: fallbackText, flags: [MessageFlags.Ephemeral] }).catch(() => null);
            });
        } catch (dispatchErr) {
            console.error('[InteractionErrorHandler] Falha ao entregar resposta de erro:', dispatchErr?.message || dispatchErr);
        }
    },
};