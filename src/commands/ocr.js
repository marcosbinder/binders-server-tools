/**
 * @file ocr.js
 * @description Slash command /ocr for extracting text from uploaded images or image URLs
 */

const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const tosCheck = require('../utils/tosCheck.js');
const createEmbed = require('../utils/createEmbed.js');
const getLanguage = require('../utils/getLanguage.js');
const emojis = require('../config/emojis.js');
const safeReply = require('../utils/safeReply.js');
const { extractTextFromImage } = require('../utils/ocrService.js');

const VALID_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.gif'];

function isValidImageUrl(url) {
    if (!url || typeof url !== 'string') return false;
    try {
        const parsed = new URL(url);
        if (!['http:', 'https:'].includes(parsed.protocol)) return false;
        const pathname = parsed.pathname.toLowerCase();
        return VALID_EXTENSIONS.some(ext => pathname.endsWith(ext)) || url.includes('cdn.discordapp.com') || url.includes('media.discordapp.net');
    } catch {
        return false;
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ocr')
        .setDescription('Utilidades ❯ Extrai o texto contido em uma imagem (upload ou link).')
        .setDescriptionLocalizations({
            'en-US': 'Utilities ❯ Extracts readable text from an image (upload or URL).',
            'pt-BR': 'Utilidades ❯ Extrai o texto contido em uma imagem (upload ou link).',
        })
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2])
        .setDMPermission(true)
        .addAttachmentOption(opt =>
            opt
                .setName('imagem')
                .setNameLocalizations({
                    'en-US': 'image',
                    'pt-BR': 'imagem',
                })
                .setDescription('Arquivo de imagem para analisar e extrair o texto.')
                .setDescriptionLocalizations({
                    'en-US': 'Image file to analyze and extract text from.',
                    'pt-BR': 'Arquivo de imagem para analisar e extrair o texto.',
                })
                .setRequired(false)
        )
        .addStringOption(opt =>
            opt
                .setName('url')
                .setNameLocalizations({
                    'en-US': 'url',
                    'pt-BR': 'url',
                })
                .setDescription('Link direto da imagem na web para extração de texto.')
                .setDescriptionLocalizations({
                    'en-US': 'Direct web image link for text extraction.',
                    'pt-BR': 'Link direto da imagem na web para extração de texto.',
                })
                .setRequired(false)
        ),

    async execute(interaction, client) {
        const canProceed = await tosCheck(interaction);
        if (!canProceed) return;

        const lang = getLanguage(interaction);
        const isPtBr = lang === 'pt_BR';

        const attachment = interaction.options.getAttachment('imagem') || interaction.options.getAttachment('image');
        const urlOption = interaction.options.getString('url');

        if (!attachment && !urlOption) {
            return safeReply(interaction, {
                content: isPtBr
                    ? `${emojis.errado} Você precisa fornecer uma **imagem** (upload) ou uma **URL** de imagem válida para realizar o OCR.`
                    : `${emojis.errado} You must provide an **image** (upload) or a valid image **URL** to perform OCR.`,
                flags: [MessageFlags.Ephemeral],
            });
        }

        let targetImageUrl = null;

        if (attachment) {
            const contentType = attachment.contentType || '';
            const isImageMime = contentType.startsWith('image/');
            const hasValidExt = VALID_EXTENSIONS.some(ext => (attachment.name || '').toLowerCase().endsWith(ext));

            if (!isImageMime && !hasValidExt) {
                return safeReply(interaction, {
                    content: isPtBr
                        ? `${emojis.errado} O arquivo enviado não parece ser uma imagem válida (formatos aceitos: PNG, JPG, JPEG, WEBP, BMP, GIF).`
                        : `${emojis.errado} The uploaded file does not appear to be a valid image (supported formats: PNG, JPG, JPEG, WEBP, BMP, GIF).`,
                    flags: [MessageFlags.Ephemeral],
                });
            }
            targetImageUrl = attachment.url;
        } else if (urlOption) {
            if (!isValidImageUrl(urlOption)) {
                return safeReply(interaction, {
                    content: isPtBr
                        ? `${emojis.errado} A URL fornecida não é válida ou não aponta para uma imagem suportada.`
                        : `${emojis.errado} The provided URL is invalid or does not point to a supported image.`,
                    flags: [MessageFlags.Ephemeral],
                });
            }
            targetImageUrl = urlOption;
        }

        if (typeof interaction.deferReply === 'function' && !interaction.deferred && !interaction.replied) {
            await interaction.deferReply();
        }

        const ocrResult = await extractTextFromImage(targetImageUrl, {
            language: isPtBr ? 'por' : 'eng',
        });

        if (!ocrResult.success) {
            const errorEmbed = await createEmbed(interaction, {
                title: isPtBr ? `${emojis.errado} Falha no Reconhecimento Óptico` : `${emojis.errado} OCR Processing Failed`,
                description: isPtBr
                    ? `Não foi possível extrair texto desta imagem.\n> **Motivo:** \`${ocrResult.error || 'Erro desconhecido'}\``
                    : `Unable to extract text from this image.\n> **Reason:** \`${ocrResult.error || 'Unknown error'}\``,
                color: colors.error || 0xED4245,
            });

            return safeReply(interaction, { embeds: [errorEmbed] });
        }

        const rawText = ocrResult.text;
        const hasText = rawText && rawText.length > 0;

        let displayContent = '';
        if (hasText) {
            displayContent = rawText.length > 3500
                ? rawText.slice(0, 3500) + '\n\n... (texto truncado por atingir limite do Discord)'
                : rawText;
        } else {
            displayContent = isPtBr
                ? `${emojis.amarelo} Nenhum texto legível foi detectado nesta imagem.`
                : `${emojis.amarelo} No readable text was detected in this image.`;
        }

        const fields = [
            {
                name: isPtBr ? `${emojis.ferramenta1} Estatísticas` : `${emojis.ferramenta1} Statistics`,
                value: `> • **${isPtBr ? 'Caracteres' : 'Characters'}:** \`${ocrResult.characters}\`\n> • **${isPtBr ? 'Linhas' : 'Lines'}:** \`${ocrResult.lines}\``,
                inline: true,
            },
            {
                name: isPtBr ? `${emojis.configuracao} Motor OCR` : `${emojis.configuracao} OCR Engine`,
                value: `> • **Provedor:** \`${ocrResult.provider}\`\n> • **Status:** \`${hasText ? (isPtBr ? 'Sucesso' : 'Success') : (isPtBr ? 'Sem texto' : 'No text')}\``,
                inline: true,
            },
        ];

        const embed = await createEmbed(interaction, {
            title: isPtBr ? `${emojis.lupa} Reconhecimento de Imagem (OCR)` : `${emojis.lupa} Image Text Recognition (OCR)`,
            description: `> ${isPtBr ? 'Texto extraído com sucesso:' : 'Extracted text from image:'}\n\`\`\`text\n${displayContent}\n\`\`\``,
            fields,
            thumbnail: targetImageUrl,
            color: colors.primary || 0xAEA7BD,
        });

        const buttons = [
            new ButtonBuilder()
                .setLabel(isPtBr ? 'Ver Imagem Original' : 'View Original Image')
                .setStyle(ButtonStyle.Link)
                .setURL(targetImageUrl)
                .setEmoji(emojis.visto)
        ];

        const row = new ActionRowBuilder().addComponents(buttons);

        return safeReply(interaction, {
            embeds: [embed],
            components: [row],
        });
    },
};
