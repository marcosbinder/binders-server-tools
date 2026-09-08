const { 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  StringSelectMenuBuilder, 
  ChannelSelectMenuBuilder, 
  ChannelType,
  parseEmoji
} = require('discord.js');
const { getEmoji } = require('../../config/emojis.js');
const colors = require('../../config/colors.js');

const MAX_CONTAINER_BLOCKS = 25;
const DEFAULT_SESSION_TTL_MS = 1800000; // 30 minutes
const MAX_STUDIO_SESSIONS = 500;
const DEFAULT_BRANDING_COLOR = 0x085fba;

class ContainerStudioSession {
  constructor(ownerId) {
    this.ownerId = String(ownerId);
    this.blocks = [];
    this.history = [];
    this.isPublishing = false;
    this.targetChannelId = null;
    this.lastActive = Date.now();
  }

  touch() {
    this.lastActive = Date.now();
  }

  saveUndo() {
    this.touch();
    if (this.blocks.length > MAX_CONTAINER_BLOCKS) {
      this.blocks = this.blocks.slice(0, MAX_CONTAINER_BLOCKS);
    }
    this.history.push(JSON.parse(JSON.stringify(this.blocks)));
    if (this.history.length > 20) this.history.shift();
  }

  undo() {
    this.touch();
    if (this.history.length === 0) return false;
    this.blocks = this.history.pop();
    return true;
  }

  clear() {
    this.touch();
    this.saveUndo();
    this.blocks = [];
  }
}

const studioSessions = new Map();

function cleanupStudioSessions(maxAgeMs = DEFAULT_SESSION_TTL_MS) {
  const now = Date.now();
  let evicted = 0;
  for (const [id, session] of studioSessions.entries()) {
    if (now - (session.lastActive || 0) > maxAgeMs) {
      studioSessions.delete(id);
      evicted++;
    }
  }
  return evicted;
}

let studioCleanupTimer = null;

function startStudioSessionCleanup(intervalMs = 60000, maxAgeMs = DEFAULT_SESSION_TTL_MS) {
  if (studioCleanupTimer) clearInterval(studioCleanupTimer);
  studioCleanupTimer = setInterval(() => {
    cleanupStudioSessions(maxAgeMs);
  }, intervalMs);
  if (typeof studioCleanupTimer.unref === 'function') {
    studioCleanupTimer.unref();
  }
}

function stopStudioSessionCleanup() {
  if (studioCleanupTimer) {
    clearInterval(studioCleanupTimer);
    studioCleanupTimer = null;
  }
}

// Automatically start background cleanup with unreferenced timer
startStudioSessionCleanup();

function getOrCreateStudioSession(ownerId) {
  const id = String(ownerId);
  if (!studioSessions.has(id)) {
    if (studioSessions.size >= MAX_STUDIO_SESSIONS) {
      const oldestKey = studioSessions.keys().next().value;
      if (oldestKey !== undefined) studioSessions.delete(oldestKey);
    }
    studioSessions.set(id, new ContainerStudioSession(id));
  }
  const session = studioSessions.get(id);
  session.touch();
  return session;
}

function parseHexColor(hexStr, defaultColor = DEFAULT_BRANDING_COLOR) {
  if (!hexStr || typeof hexStr !== 'string') return defaultColor;
  const clean = hexStr.trim();
  const match = clean.match(/^#?([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/);
  if (!match) return defaultColor;

  let hex = match[1];
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }

  const val = parseInt(hex, 16);
  if (isNaN(val) || val < 0 || val > 16777215) {
    return defaultColor;
  }

  return val;
}

function truncateText(str, maxLen = 4000) {
  if (typeof str !== 'string') return '';
  if (str.length <= maxLen) return str;
  return str.substring(0, maxLen - 3) + '...';
}

function renderContainerFromBlocks(blocks, guild = null, lang = 'pt_BR') {
  const isPtBr = lang === 'pt_BR';
  let accentColor = DEFAULT_BRANDING_COLOR;
  const rawBlocks = (Array.isArray(blocks) ? blocks : []).slice(0, MAX_CONTAINER_BLOCKS);
  const visibleBlocks = [];

  for (const b of rawBlocks) {
    if (b.type === 'cor') {
      accentColor = parseHexColor(b.hex_color);
    } else {
      visibleBlocks.push(b);
    }
  }

  if (visibleBlocks.length === 0) {
    return {
      type: 17,
      accent_color: accentColor,
      components: [
        {
          type: 10,
          content: isPtBr
            ? '-# ❗ | O painel encontra-se vazio. Utilize o menu abaixo para adicionar elementos ao contêiner.'
            : '-# ❗ | The panel is currently empty. Use the menu below to add elements to the container.'
        }
      ]
    };
  }

  const containerComponents = [];
  let currentTextAcc = [];

  const flushText = () => {
    if (currentTextAcc.length > 0) {
      const combined = currentTextAcc.join('\n\n');
      containerComponents.push({
        type: 10,
        content: truncateText(combined, 4000)
      });
      currentTextAcc = [];
    }
  };

  for (const b of visibleBlocks) {
    if (b.type === 'titulo') {
      flushText();
      containerComponents.push({
        type: 10,
        content: truncateText('## ' + (b.val || ''), 4000)
      });
    } else if (b.type === 'autor') {
      flushText();
      containerComponents.push({
        type: 10,
        content: truncateText('### 👤 ' + (b.nome || '') + (b.icone ? '\n-# ' + b.icone : ''), 4000)
      });
    } else if (b.type === 'texto') {
      currentTextAcc.push(truncateText(b.val || '', 4000));
    } else if (b.type === 'rodape') {
      flushText();
      containerComponents.push({
        type: 10,
        content: truncateText('-# ' + (b.texto || '') + (b.icone ? ' • ' + b.icone : ''), 4000)
      });
    } else if (b.type === 'separador') {
      flushText();
      containerComponents.push({
        type: 14,
        divider: true,
        spacing: 1
      });
    } else if (b.type === 'imagem') {
      flushText();
      containerComponents.push({
        type: 12,
        items: [
          {
            media: {
              url: b.url || ''
            }
          }
        ]
      });
    } else if (b.type === 'thumb') {
      flushText();
      containerComponents.push({
        type: 9,
        components: [
          {
            type: 10,
            content: isPtBr ? '-# Miniatura' : '-# Thumbnail'
          }
        ],
        accessory: {
          type: 11,
          media: {
            url: b.url || ''
          }
        }
      });
    } else if (b.type === 'botao') {
      flushText();
      let label = (b.label || (isPtBr ? 'Botão' : 'Button')).trim();
      if (label.length > 80) {
        label = label.substring(0, 77) + '...';
      }
      containerComponents.push({
        type: 1,
        components: [
          {
            type: 2,
            style: b.url ? 5 : 2,
            label: label || (isPtBr ? 'Botão' : 'Button'),
            url: b.url || undefined,
            custom_id: b.url ? undefined : (b.custom_id || 'btn_action_' + Math.random().toString(36).substring(7)),
            emoji: b.emoji ? { name: b.emoji } : undefined
          }
        ]
      });
    }
  }

  flushText();

  return {
    type: 17,
    accent_color: accentColor,
    components: containerComponents
  };
}

function buildStudioPayload(session, guild, lang = 'pt_BR') {
  if (session.blocks.length > MAX_CONTAINER_BLOCKS) {
    session.blocks = session.blocks.slice(0, MAX_CONTAINER_BLOCKS);
  }
  const isPtBr = lang === 'pt_BR';
  const n = session.blocks.length;
  const controlComponents = [];

  if (!session.isPublishing) {
    const welcomeContent = isPtBr
      ? `## ${getEmoji('ferramenta1')} | Estúdio de Contêineres Components V2\nSeja bem-vindo! Utilize o seletor abaixo para construir e estruturar layouts avançados para o servidor.\n-# ${getEmoji('pasta')} | **${n}** elemento(s) em uso no projeto atual.`
      : `## ${getEmoji('ferramenta1')} | Components V2 Container Studio\nWelcome! Use the selector below to build and structure advanced layouts for the server.\n-# ${getEmoji('pasta')} | **${n}** element(s) in use in current project.`;

    const selectPlaceholder = isPtBr
      ? 'Selecione o componente estrutural desejado...'
      : 'Select the desired structural component...';

    const options = isPtBr ? [
      { label: 'Título Principal', value: 'titulo', emoji: parseEmoji(getEmoji('ticket')), description: 'Cabeçalho de destaque da seção.' },
      { label: 'Corpo de Texto', value: 'texto', emoji: parseEmoji(getEmoji('lapis')), description: 'Área principal para parágrafos e markdown.' },
      { label: 'Paleta de Cores', value: 'cor', emoji: parseEmoji(getEmoji('paletadecores')), description: 'Define a coloração lateral do contêiner.' },
      { label: 'Mídia de Destaque', value: 'imagem', emoji: parseEmoji(getEmoji('brilho')), description: 'Anexa uma imagem ou banner ao layout.' },
      { label: 'Miniatura (Thumbnail)', value: 'thumb', emoji: parseEmoji(getEmoji('selo')), description: 'Ícone lateral ou avatar.' },
      { label: 'Assinatura do Autor', value: 'autor', emoji: parseEmoji(getEmoji('pessoa')), description: 'Identificação no topo do contêiner.' },
      { label: 'Notas de Rodapé', value: 'rodape', emoji: parseEmoji(getEmoji('bot')), description: 'Informações complementares na base.' },
      { label: 'Botões Interativos', value: 'botao', emoji: parseEmoji(getEmoji('link')), description: 'Insere links e ações clicáveis.' },
      { label: 'Quebra de Seção', value: 'separador', emoji: parseEmoji(getEmoji('menos')), description: 'Linha divisória elegante entre elementos.' }
    ] : [
      { label: 'Main Title', value: 'titulo', emoji: parseEmoji(getEmoji('ticket')), description: 'Section highlight header.' },
      { label: 'Body Text', value: 'texto', emoji: parseEmoji(getEmoji('lapis')), description: 'Main area for paragraphs and markdown.' },
      { label: 'Color Palette', value: 'cor', emoji: parseEmoji(getEmoji('paletadecores')), description: 'Sets the container accent color.' },
      { label: 'Featured Media', value: 'imagem', emoji: parseEmoji(getEmoji('brilho')), description: 'Attach an image or banner to the layout.' },
      { label: 'Thumbnail', value: 'thumb', emoji: parseEmoji(getEmoji('selo')), description: 'Side icon or avatar.' },
      { label: 'Author Signature', value: 'autor', emoji: parseEmoji(getEmoji('pessoa')), description: 'Top container attribution.' },
      { label: 'Footer Notes', value: 'rodape', emoji: parseEmoji(getEmoji('bot')), description: 'Additional info at the bottom.' },
      { label: 'Interactive Buttons', value: 'botao', emoji: parseEmoji(getEmoji('link')), description: 'Insert links and clickable actions.' },
      { label: 'Section Divider', value: 'separador', emoji: parseEmoji(getEmoji('menos')), description: 'Elegant separator line between elements.' }
    ];

    const welcomeContainer = {
      type: 17,
      accent_color: colors.primary || 0x5865F2,
      components: [
        {
          type: 10,
          content: welcomeContent
        },
        {
          type: 14,
          divider: true,
          spacing: 1
        },
        {
          type: 1,
          components: [
            new StringSelectMenuBuilder()
              .setCustomId('sel_builder_elemento')
              .setPlaceholder(selectPlaceholder)
              .addOptions(options)
              .toJSON()
          ]
        },
        {
          type: 1,
          components: [
            new ButtonBuilder()
              .setCustomId('btn_builder_undo')
              .setLabel(isPtBr ? 'Desfazer Última Ação' : 'Undo Last Action')
              .setStyle(ButtonStyle.Secondary)
              .setEmoji(getEmoji('voltar'))
              .setDisabled(n === 0)
              .toJSON(),
            new ButtonBuilder()
              .setCustomId('btn_builder_publicar')
              .setLabel(isPtBr ? 'Enviar Layout' : 'Send Layout')
              .setStyle(ButtonStyle.Success)
              .setEmoji(getEmoji('foguete'))
              .setDisabled(n === 0)
              .toJSON(),
            new ButtonBuilder()
              .setCustomId('btn_builder_limpar')
              .setLabel(isPtBr ? 'Apagar Projeto' : 'Delete Project')
              .setStyle(ButtonStyle.Danger)
              .setEmoji(getEmoji('lixeira'))
              .setDisabled(n === 0)
              .toJSON()
          ]
        }
      ]
    };
    controlComponents.push(welcomeContainer);
  } else {
    const publishContainer = {
      type: 17,
      accent_color: 0x22c55e,
      components: [
        {
          type: 10,
          content: isPtBr
            ? '### 🚀 | Central de Envio de Contêiner\n-# 📌 | Selecione o canal de destino abaixo para publicar o layout.'
            : '### 🚀 | Container Dispatch Center\n-# 📌 | Select destination channel below to publish the layout.'
        },
        {
          type: 14,
          divider: true,
          spacing: 1
        },
        {
          type: 1,
          components: [
            new ChannelSelectMenuBuilder()
              .setCustomId('sel_builder_canal')
              .setPlaceholder(isPtBr ? '📢 | Selecione o canal de destino...' : '📢 | Select the target channel...')
              .setChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
              .toJSON()
          ]
        },
        {
          type: 1,
          components: [
            new ButtonBuilder()
              .setCustomId('btn_builder_voltar')
              .setLabel(isPtBr ? 'Retornar ao Estúdio' : 'Back to Studio')
              .setStyle(ButtonStyle.Secondary)
              .setEmoji(getEmoji('voltar'))
              .toJSON(),
            new ButtonBuilder()
              .setCustomId('btn_builder_confirmar')
              .setLabel(isPtBr ? 'Confirmar Envio' : 'Confirm Dispatch')
              .setStyle(ButtonStyle.Success)
              .setEmoji(getEmoji('confere'))
              .setDisabled(!session.targetChannelId)
              .toJSON()
          ]
        }
      ]
    };
    controlComponents.push(publishContainer);
  }

  const previewLabel = {
    type: 17,
    accent_color: 0x2b2d31,
    components: [
      {
        type: 10,
        content: isPtBr ? '-# 👁️ | **Visualização do Projeto em Tempo Real:**' : '-# 👁️ | **Real-Time Project Preview:**'
      }
    ]
  };

  const renderedPreview = renderContainerFromBlocks(session.blocks, guild, lang);

  return {
    flags: 32768 | 64,
    components: [...controlComponents, previewLabel, renderedPreview]
  };
}

module.exports = {
  ContainerStudioSession,
  getOrCreateStudioSession,
  renderContainerFromBlocks,
  buildStudioPayload,
  parseHexColor,
  cleanupStudioSessions,
  startStudioSessionCleanup,
  stopStudioSessionCleanup,
  studioSessions,
  MAX_CONTAINER_BLOCKS,
  DEFAULT_SESSION_TTL_MS
};
