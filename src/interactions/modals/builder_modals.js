const { getOrCreateStudioSession, buildStudioPayload, MAX_CONTAINER_BLOCKS } = require('../../components/builder/containerBuilder.js');

module.exports = {
    name: 'modal_builder',
    async execute(interaction, client) {
        const id = interaction.customId;
        const session = getOrCreateStudioSession(interaction.user.id);

        const maxBlocks = MAX_CONTAINER_BLOCKS || 25;
        if (session.blocks.length >= maxBlocks) {
            return interaction.reply({
                content: `⚠️ | Limite de ${maxBlocks} blocos atingido! Remova algum elemento antes de adicionar novos.`,
                flags: 64
            });
        }

        session.saveUndo();

        if (id === 'modal_builder_titulo') {
            const val = interaction.fields.getTextInputValue('titulo_val');
            session.blocks.push({ type: 'titulo', val: val ? val.substring(0, 4000) : '' });
        } else if (id === 'modal_builder_texto') {
            const val = interaction.fields.getTextInputValue('texto_val');
            session.blocks.push({ type: 'texto', val: val ? val.substring(0, 4000) : '' });
        } else if (id === 'modal_builder_cor') {
            const hex_color = interaction.fields.getTextInputValue('cor_val');
            session.blocks.push({ type: 'cor', hex_color: hex_color ? hex_color.trim() : '' });
        } else if (id === 'modal_builder_imagem') {
            const url = interaction.fields.getTextInputValue('imagem_url');
            session.blocks.push({ type: 'imagem', url: url ? url.trim() : '' });
        } else if (id === 'modal_builder_thumb') {
            const url = interaction.fields.getTextInputValue('thumb_url');
            session.blocks.push({ type: 'thumb', url: url ? url.trim() : '' });
        } else if (id === 'modal_builder_autor') {
            const nome = interaction.fields.getTextInputValue('autor_nome');
            const icone = interaction.fields.getTextInputValue('autor_icone') || null;
            session.blocks.push({ type: 'autor', nome: nome ? nome.substring(0, 256) : '', icone });
        } else if (id === 'modal_builder_rodape') {
            const texto = interaction.fields.getTextInputValue('rodape_texto');
            const icone = interaction.fields.getTextInputValue('rodape_icone') || null;
            session.blocks.push({ type: 'rodape', texto: texto ? texto.substring(0, 2048) : '', icone });
        } else if (id === 'modal_builder_botao') {
            let label = interaction.fields.getTextInputValue('botao_label') || 'Botão';
            if (label.length > 80) label = label.substring(0, 80);
            const url = interaction.fields.getTextInputValue('botao_url');
            const emoji = interaction.fields.getTextInputValue('botao_emoji') || null;
            session.blocks.push({ type: 'botao', label, url, emoji });
        }

        const payload = buildStudioPayload(session, interaction.guild);
        return interaction.update(payload);
    }
};
