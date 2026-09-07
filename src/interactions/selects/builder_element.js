const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');
const { getOrCreateStudioSession, buildStudioPayload } = require('../../components/builder/containerBuilder.js');
const getLanguage = require('../../utils/getLanguage.js');
const safeReply = require('../../utils/safeReply.js');

module.exports = {
    name: 'sel_builder_elemento',
    async execute(interaction, client) {
        const lang = getLanguage(interaction);
        const isPtBr = lang === 'pt_BR';

        if (!interaction.guild) {
            return safeReply(interaction, {
                content: isPtBr ? '❌ Esta ação só pode ser executada dentro de um servidor.' : '❌ This action can only be performed within a server.',
                flags: [MessageFlags.Ephemeral]
            });
        }

        const memberPerms = interaction.member?.permissions;
        const hasPermission = memberPerms && typeof memberPerms.has === 'function' && (
            memberPerms.has(PermissionFlagsBits.ManageMessages) ||
            memberPerms.has(PermissionFlagsBits.ManageGuild) ||
            memberPerms.has(PermissionFlagsBits.Administrator)
        );

        if (!hasPermission) {
            return safeReply(interaction, {
                content: isPtBr ? '❌ Você precisa da permissão de Gerenciar Mensagens.' : '❌ You need the Manage Messages permission.',
                flags: [MessageFlags.Ephemeral]
            });
        }

        const selectedType = interaction.values?.[0];
        const session = getOrCreateStudioSession(interaction.user.id);

        if (selectedType === 'separador') {
            session.saveUndo();
            session.blocks.push({ type: 'separador' });
            const payload = buildStudioPayload(session, interaction.guild, lang);
            return interaction.update(payload);
        }

        if (selectedType === 'titulo') {
            const modal = new ModalBuilder()
                .setCustomId('modal_builder_titulo')
                .setTitle(isPtBr ? 'Adicionar Título Principal' : 'Add Main Title');
            const input = new TextInputBuilder()
                .setCustomId('titulo_val')
                .setLabel(isPtBr ? 'Título de Destaque' : 'Featured Title')
                .setStyle(TextInputStyle.Short)
                .setMaxLength(100)
                .setRequired(true);
            modal.addComponents(new ActionRowBuilder().addComponents(input));
            return interaction.showModal(modal);
        }

        if (selectedType === 'texto') {
            const modal = new ModalBuilder()
                .setCustomId('modal_builder_texto')
                .setTitle(isPtBr ? 'Adicionar Corpo de Texto' : 'Add Text Body');
            const input = new TextInputBuilder()
                .setCustomId('texto_val')
                .setLabel(isPtBr ? 'Texto / Parágrafos' : 'Text / Paragraphs')
                .setStyle(TextInputStyle.Paragraph)
                .setMaxLength(2000)
                .setRequired(true);
            modal.addComponents(new ActionRowBuilder().addComponents(input));
            return interaction.showModal(modal);
        }

        if (selectedType === 'cor') {
            const modal = new ModalBuilder()
                .setCustomId('modal_builder_cor')
                .setTitle(isPtBr ? 'Alterar Cor do Contêiner' : 'Change Container Color');
            const input = new TextInputBuilder()
                .setCustomId('cor_val')
                .setLabel(isPtBr ? 'Cor Hex (ex: #5865F2)' : 'Hex Color (e.g. #5865F2)')
                .setStyle(TextInputStyle.Short)
                .setMaxLength(10)
                .setRequired(true);
            modal.addComponents(new ActionRowBuilder().addComponents(input));
            return interaction.showModal(modal);
        }

        if (selectedType === 'imagem') {
            const modal = new ModalBuilder()
                .setCustomId('modal_builder_imagem')
                .setTitle(isPtBr ? 'Anexar Imagem / Banner' : 'Attach Image / Banner');
            const input = new TextInputBuilder()
                .setCustomId('imagem_url')
                .setLabel(isPtBr ? 'URL da Imagem (https://...)' : 'Image URL (https://...)')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);
            modal.addComponents(new ActionRowBuilder().addComponents(input));
            return interaction.showModal(modal);
        }

        if (selectedType === 'thumb') {
            const modal = new ModalBuilder()
                .setCustomId('modal_builder_thumb')
                .setTitle(isPtBr ? 'Adicionar Miniatura' : 'Add Thumbnail');
            const input = new TextInputBuilder()
                .setCustomId('thumb_url')
                .setLabel(isPtBr ? 'URL da Miniatura (https://...)' : 'Thumbnail URL (https://...)')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);
            modal.addComponents(new ActionRowBuilder().addComponents(input));
            return interaction.showModal(modal);
        }

        if (selectedType === 'autor') {
            const modal = new ModalBuilder()
                .setCustomId('modal_builder_autor')
                .setTitle(isPtBr ? 'Assinatura do Autor' : 'Author Signature');
            const nomeInput = new TextInputBuilder()
                .setCustomId('autor_nome')
                .setLabel(isPtBr ? 'Nome do Autor' : 'Author Name')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);
            const iconeInput = new TextInputBuilder()
                .setCustomId('autor_icone')
                .setLabel(isPtBr ? 'Ícone URL (opcional)' : 'Icon URL (optional)')
                .setStyle(TextInputStyle.Short)
                .setRequired(false);
            modal.addComponents(
                new ActionRowBuilder().addComponents(nomeInput),
                new ActionRowBuilder().addComponents(iconeInput)
            );
            return interaction.showModal(modal);
        }

        if (selectedType === 'rodape') {
            const modal = new ModalBuilder()
                .setCustomId('modal_builder_rodape')
                .setTitle(isPtBr ? 'Notas de Rodapé' : 'Footer Notes');
            const textoInput = new TextInputBuilder()
                .setCustomId('rodape_texto')
                .setLabel(isPtBr ? 'Texto do Rodapé' : 'Footer Text')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);
            const iconeInput = new TextInputBuilder()
                .setCustomId('rodape_icone')
                .setLabel(isPtBr ? 'Ícone URL (opcional)' : 'Icon URL (optional)')
                .setStyle(TextInputStyle.Short)
                .setRequired(false);
            modal.addComponents(
                new ActionRowBuilder().addComponents(textoInput),
                new ActionRowBuilder().addComponents(iconeInput)
            );
            return interaction.showModal(modal);
        }

        if (selectedType === 'botao') {
            const modal = new ModalBuilder()
                .setCustomId('modal_builder_botao')
                .setTitle(isPtBr ? 'Adicionar Botão Interativo' : 'Add Interactive Button');
            const labelInput = new TextInputBuilder()
                .setCustomId('botao_label')
                .setLabel(isPtBr ? 'Texto do Botão' : 'Button Text')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);
            const urlInput = new TextInputBuilder()
                .setCustomId('botao_url')
                .setLabel(isPtBr ? 'URL de Destino (https://...)' : 'Destination URL (https://...)')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);
            const emojiInput = new TextInputBuilder()
                .setCustomId('botao_emoji')
                .setLabel(isPtBr ? 'Emoji do Botão (opcional)' : 'Button Emoji (optional)')
                .setStyle(TextInputStyle.Short)
                .setRequired(false);
            modal.addComponents(
                new ActionRowBuilder().addComponents(labelInput),
                new ActionRowBuilder().addComponents(urlInput),
                new ActionRowBuilder().addComponents(emojiInput)
            );
            return interaction.showModal(modal);
        }
    }
};
