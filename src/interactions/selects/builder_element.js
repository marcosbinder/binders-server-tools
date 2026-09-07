const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const { getOrCreateStudioSession, buildStudioPayload } = require('../../components/builder/containerBuilder.js');

module.exports = {
    name: 'sel_builder_elemento',
    async execute(interaction, client) {
        const selectedType = interaction.values?.[0];
        const session = getOrCreateStudioSession(interaction.user.id);

        if (selectedType === 'separador') {
            session.saveUndo();
            session.blocks.push({ type: 'separador' });
            const payload = buildStudioPayload(session, interaction.guild);
            return interaction.update(payload);
        }

        if (selectedType === 'titulo') {
            const modal = new ModalBuilder()
                .setCustomId('modal_builder_titulo')
                .setTitle('Adicionar Título Principal');
            const input = new TextInputBuilder()
                .setCustomId('titulo_val')
                .setLabel('Título de Destaque')
                .setStyle(TextInputStyle.Short)
                .setMaxLength(100)
                .setRequired(true);
            modal.addComponents(new ActionRowBuilder().addComponents(input));
            return interaction.showModal(modal);
        }

        if (selectedType === 'texto') {
            const modal = new ModalBuilder()
                .setCustomId('modal_builder_texto')
                .setTitle('Adicionar Corpo de Texto');
            const input = new TextInputBuilder()
                .setCustomId('texto_val')
                .setLabel('Texto / Parágrafos')
                .setStyle(TextInputStyle.Paragraph)
                .setMaxLength(2000)
                .setRequired(true);
            modal.addComponents(new ActionRowBuilder().addComponents(input));
            return interaction.showModal(modal);
        }

        if (selectedType === 'cor') {
            const modal = new ModalBuilder()
                .setCustomId('modal_builder_cor')
                .setTitle('Alterar Cor do Contêiner');
            const input = new TextInputBuilder()
                .setCustomId('cor_val')
                .setLabel('Cor Hex (ex: #5865F2)')
                .setStyle(TextInputStyle.Short)
                .setMaxLength(10)
                .setRequired(true);
            modal.addComponents(new ActionRowBuilder().addComponents(input));
            return interaction.showModal(modal);
        }

        if (selectedType === 'imagem') {
            const modal = new ModalBuilder()
                .setCustomId('modal_builder_imagem')
                .setTitle('Anexar Imagem / Banner');
            const input = new TextInputBuilder()
                .setCustomId('imagem_url')
                .setLabel('URL da Imagem (https://...)')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);
            modal.addComponents(new ActionRowBuilder().addComponents(input));
            return interaction.showModal(modal);
        }

        if (selectedType === 'thumb') {
            const modal = new ModalBuilder()
                .setCustomId('modal_builder_thumb')
                .setTitle('Adicionar Miniatura');
            const input = new TextInputBuilder()
                .setCustomId('thumb_url')
                .setLabel('URL da Miniatura (https://...)')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);
            modal.addComponents(new ActionRowBuilder().addComponents(input));
            return interaction.showModal(modal);
        }

        if (selectedType === 'autor') {
            const modal = new ModalBuilder()
                .setCustomId('modal_builder_autor')
                .setTitle('Assinatura do Autor');
            const nomeInput = new TextInputBuilder()
                .setCustomId('autor_nome')
                .setLabel('Nome do Autor')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);
            const iconeInput = new TextInputBuilder()
                .setCustomId('autor_icone')
                .setLabel('Ícone URL (opcional)')
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
                .setTitle('Notas de Rodapé');
            const textoInput = new TextInputBuilder()
                .setCustomId('rodape_texto')
                .setLabel('Texto do Rodapé')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);
            const iconeInput = new TextInputBuilder()
                .setCustomId('rodape_icone')
                .setLabel('Ícone URL (opcional)')
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
                .setTitle('Adicionar Botão Interativo');
            const labelInput = new TextInputBuilder()
                .setCustomId('botao_label')
                .setLabel('Texto do Botão')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);
            const urlInput = new TextInputBuilder()
                .setCustomId('botao_url')
                .setLabel('URL de Destino (https://...)')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);
            const emojiInput = new TextInputBuilder()
                .setCustomId('botao_emoji')
                .setLabel('Emoji do Botão (opcional)')
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
