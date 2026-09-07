/**
 * @file componentsV2.js
 * @description Centralized builder and utility helpers for Discord Message Components V2 (flag 1 << 15 / 32768).
 * Provides structured constructors for Containers (Type 17), Sections (Type 9), Text Displays (Type 10),
 * Media Galleries (Type 12), Thumbnails (Type 11), Separators (Type 14), and V2 Card payloads.
 */

const colors = require('../config/colors.js');
const { getEmoji } = require('../config/emojis.js');

/**
 * Message flag indicating Components V2 message layout.
 * When present, content and embeds are ignored in favor of the components hierarchy.
 */
const IS_COMPONENTS_V2 = 1 << 15; // 32768

/**
 * Official Discord Component Types enum
 */
const ComponentType = Object.freeze({
    ActionRow: 1,
    Button: 2,
    StringSelect: 3,
    TextInput: 4,
    UserSelect: 5,
    RoleSelect: 6,
    MentionableSelect: 7,
    ChannelSelect: 8,
    Section: 9,
    TextDisplay: 10,
    Thumbnail: 11,
    MediaGallery: 12,
    File: 13,
    Separator: 14,
    Container: 17,
    Label: 18,
});

/**
 * Creates a Text Display (Type 10) component.
 *
 * @param {string} content Markdown text content
 * @param {number} [maxLen=4000] Maximum allowed characters
 * @returns {{ type: 10, content: string }}
 */
function createTextDisplay(content, maxLen = 4000) {
    let str = typeof content === 'string' ? content : String(content ?? '');
    if (str.length > maxLen) {
        str = str.substring(0, maxLen - 3) + '...';
    }
    return {
        type: ComponentType.TextDisplay,
        content: str,
    };
}

/**
 * Creates a Separator (Type 14) component.
 *
 * @param {boolean} [divider=true] Whether to display a visible line divider
 * @param {1|2} [spacing=1] Vertical spacing size (1 = small, 2 = large)
 * @returns {{ type: 14, divider: boolean, spacing: number }}
 */
function createSeparator(divider = true, spacing = 1) {
    return {
        type: ComponentType.Separator,
        divider: Boolean(divider),
        spacing: spacing === 2 ? 2 : 1,
    };
}

/**
 * Creates a Section (Type 9) component.
 * Can contain 1 to 3 Text Display components and an optional accessory (Thumbnail or Button).
 *
 * @param {string|Array<object>|object} textOrComponents Text string, single component, or array of components
 * @param {object} [accessory] Optional accessory (e.g. Thumbnail { type: 11, media: { url } } or Button)
 * @returns {{ type: 9, components: Array<object>, accessory?: object }}
 */
function createSection(textOrComponents, accessory = undefined) {
    let innerComponents = [];

    if (typeof textOrComponents === 'string') {
        innerComponents = [createTextDisplay(textOrComponents)];
    } else if (Array.isArray(textOrComponents)) {
        innerComponents = textOrComponents.map(item => {
            if (typeof item === 'string') return createTextDisplay(item);
            return item;
        });
    } else if (textOrComponents && typeof textOrComponents === 'object') {
        innerComponents = [textOrComponents];
    }

    // Limit to max 3 components per Section per Discord spec
    if (innerComponents.length > 3) {
        innerComponents = innerComponents.slice(0, 3);
    }

    const section = {
        type: ComponentType.Section,
        components: innerComponents,
    };

    if (accessory) {
        if (typeof accessory === 'string') {
            section.accessory = {
                type: ComponentType.Thumbnail,
                media: { url: accessory },
            };
        } else if (accessory.url && !accessory.type) {
            section.accessory = {
                type: ComponentType.Thumbnail,
                media: { url: accessory.url },
                description: accessory.description || undefined,
            };
        } else {
            section.accessory = accessory;
        }
    }

    return section;
}

/**
 * Creates a Media Gallery (Type 12) component.
 * Supports between 1 and 10 media items.
 *
 * @param {Array<string|object>} items Array of image URLs or media objects
 * @returns {{ type: 12, items: Array<object> }}
 */
function createMediaGallery(items = []) {
    const rawList = Array.isArray(items) ? items : [items];
    const safeList = rawList.slice(0, 10).map(item => {
        if (typeof item === 'string') {
            return { media: { url: item } };
        }
        if (item && item.url) {
            return {
                media: { url: item.url },
                description: item.description || undefined,
                spoiler: Boolean(item.spoiler),
            };
        }
        return item;
    });

    return {
        type: ComponentType.MediaGallery,
        items: safeList,
    };
}

/**
 * Creates a Container (Type 17) component.
 *
 * @param {object} options
 * @param {number} [options.accentColor] RGB integer for the accent bar (default: colors.primary)
 * @param {boolean} [options.spoiler=false] Whether the container is hidden behind a spoiler
 * @param {Array<object>} [options.components=[]] Inner components
 * @returns {{ type: 17, accent_color: number, spoiler: boolean, components: Array<object> }}
 */
function createContainer(options = {}) {
    const accentColor = options.accentColor !== undefined 
        ? options.accentColor 
        : (colors.primary || 0xAEA7BD);

    return {
        type: ComponentType.Container,
        accent_color: accentColor,
        spoiler: Boolean(options.spoiler),
        components: Array.isArray(options.components) ? options.components : [],
    };
}

/**
 * High-level helper to generate a complete Components V2 Card payload.
 * Provides a modern, drop-in alternative to legacy embeds.
 *
 * @param {object} options
 * @param {string} [options.title] Card title
 * @param {string} [options.description] Card body text
 * @param {number} [options.accentColor] Container accent color (defaults to colors.primary)
 * @param {string} [options.thumbnail] Optional thumbnail image URL
 * @param {object} [options.author] Optional author object { name, iconURL }
 * @param {Array<{ name: string, value: string }>} [options.fields] Optional fields
 * @param {object} [options.footer] Optional footer object { text, iconURL }
 * @param {Array<string>} [options.mediaUrls] Optional gallery images
 * @param {Array<object>} [options.actionRows] Interactive action rows (buttons/select menus)
 * @param {boolean} [options.ephemeral=false] Whether response should be ephemeral
 * @returns {{ flags: number, components: Array<object> }}
 */
function createV2Card(options = {}) {
    const containerComponents = [];

    // 1. Author header
    if (options.author?.name) {
        containerComponents.push(
            createTextDisplay(`### 👤 ${options.author.name}`)
        );
    }

    // 2. Title & Thumbnail Section
    if (options.title) {
        const titleContent = `## ${options.title}`;
        if (options.thumbnail) {
            containerComponents.push(
                createSection(titleContent, { url: options.thumbnail })
            );
        } else {
            containerComponents.push(createTextDisplay(titleContent));
        }
    }

    // 3. Description
    if (options.description) {
        containerComponents.push(createTextDisplay(options.description));
    }

    // 4. Fields
    if (Array.isArray(options.fields) && options.fields.length > 0) {
        containerComponents.push(createSeparator(true, 1));
        const fieldLines = options.fields.map(f => `**${f.name}**\n${f.value}`);
        containerComponents.push(createTextDisplay(fieldLines.join('\n\n')));
    }

    // 5. Media Gallery (if attachments or images supplied)
    if (Array.isArray(options.mediaUrls) && options.mediaUrls.length > 0) {
        containerComponents.push(createMediaGallery(options.mediaUrls));
    }

    // 6. Footer
    if (options.footer?.text) {
        containerComponents.push(createSeparator(true, 1));
        containerComponents.push(
            createTextDisplay(`-# ${options.footer.text}`)
        );
    }

    const container = createContainer({
        accentColor: options.accentColor,
        components: containerComponents,
    });

    const rootComponents = [container];

    // 7. Interactive action rows
    if (Array.isArray(options.actionRows)) {
        for (const row of options.actionRows) {
            if (row) {
                rootComponents.push(typeof row.toJSON === 'function' ? row.toJSON() : row);
            }
        }
    }

    const flags = IS_COMPONENTS_V2 | (options.ephemeral ? 64 : 0);

    return {
        flags,
        components: rootComponents,
    };
}

/**
 * Generates an interaction response payload configured for Components V2.
 *
 * @param {object} options
 * @param {object} [options.container] Single primary container
 * @param {Array<object>} [options.containers] Multiple containers
 * @param {Array<object>} [options.actionRows] Action rows outside containers
 * @param {boolean} [options.ephemeral=false] Whether message is ephemeral
 * @param {number} [options.flags] Custom flags override
 * @returns {{ flags: number, components: Array<object> }}
 */
function createV2Payload(options = {}) {
    const components = [];

    if (options.container) {
        components.push(options.container);
    }
    if (Array.isArray(options.containers)) {
        components.push(...options.containers);
    }
    if (Array.isArray(options.actionRows)) {
        for (const row of options.actionRows) {
            if (row) {
                components.push(typeof row.toJSON === 'function' ? row.toJSON() : row);
            }
        }
    }

    const flags = (options.flags !== undefined ? options.flags : IS_COMPONENTS_V2) | (options.ephemeral ? 64 : 0);

    return {
        flags,
        components,
    };
}

/**
 * Converts a standard Embed (EmbedBuilder or raw embed object) to a native Components V2 Container (Type 17).
 *
 * @param {object} embed
 * @returns {object|null}
 */
function embedToV2Container(embed) {
    if (!embed) return null;
    const data = typeof embed.toJSON === 'function' ? embed.toJSON() : (embed.data || embed);

    const containerComponents = [];

    // 1. Author header (sleek compact subtext without blank Section gaps)
    if (data.author?.name) {
        const authorText = `-# ${getEmoji('pessoa')} **${data.author.name}**`;
        containerComponents.push(createTextDisplay(authorText));
    }

    // 2. Title + Thumbnail Section
    if (data.title) {
        const titleText = `### ${data.title}`;
        if (data.thumbnail?.url) {
            containerComponents.push(
                createSection(titleText, { url: data.thumbnail.url })
            );
        } else {
            containerComponents.push(createTextDisplay(titleText));
        }
    } else if (data.thumbnail?.url) {
        containerComponents.push(
            createSection(`-# ${getEmoji('selo')}`, { url: data.thumbnail.url })
        );
    }

    // 3. Description
    if (data.description) {
        containerComponents.push(createTextDisplay(data.description));
    }

    // 4. Fields (format as clean markdown blockquotes without thick separator lines)
    if (Array.isArray(data.fields) && data.fields.length > 0) {
        const fieldLines = data.fields.map(f => `> **${f.name}**\n> ${f.value}`);
        containerComponents.push(createTextDisplay(fieldLines.join('\n\n')));
    }

    // 5. Image (Media Gallery Type 12)
    if (data.image?.url && !data.image.url.startsWith('attachment://')) {
        containerComponents.push(createMediaGallery([data.image.url]));
    }

    // 6. Footer (sleek compact subtext without blank Section gaps)
    if (data.footer?.text) {
        const footerText = `-# ${getEmoji('bot')} ${data.footer.text}`;
        containerComponents.push(createTextDisplay(footerText));
    }

    // Determine accent color
    let accentColor = colors.primary || 0xAEA7BD;
    if (data.color !== undefined && data.color !== null) {
        accentColor = typeof data.color === 'string' ? parseInt(data.color.replace('#', ''), 16) : data.color;
    }

    // Clamp to Discord maximum 25 components per container
    const safeComponents = containerComponents.length > 25
        ? containerComponents.slice(0, 25)
        : (containerComponents.length > 0 ? containerComponents : [createTextDisplay(getEmoji('informacao'))]);

    return createContainer({
        accentColor,
        components: safeComponents
    });
}

/**
 * Resolves bitwise message flags ensuring IS_COMPONENTS_V2 (32768) and optional Ephemeral (64).
 * Handles numeric flags, string/number arrays, and BitField objects.
 *
 * @param {number|Array<number|string>|object} [flags]
 * @param {boolean} [isEphemeral=false]
 * @returns {number}
 */
function resolveFlags(flags, isEphemeral = false) {
    let flagNum = IS_COMPONENTS_V2;

    if (isEphemeral) {
        flagNum |= 64; // MessageFlags.Ephemeral
    }

    if (typeof flags === 'number') {
        flagNum |= flags;
    } else if (Array.isArray(flags)) {
        for (const f of flags) {
            if (typeof f === 'number') {
                flagNum |= f;
            } else if (f === 'Ephemeral' || f === 'EPHEMERAL') {
                flagNum |= 64;
            }
        }
    } else if (flags && typeof flags.bitfield === 'bigint') {
        flagNum |= Number(flags.bitfield);
    } else if (flags && typeof flags.bitfield === 'number') {
        flagNum |= flags.bitfield;
    }

    return flagNum;
}

/**
 * Transforms any standard command response payload to Components V2.
 * Converts embeds and raw markdown content into structured Containers (Type 17),
 * adds IS_COMPONENTS_V2 flag (32768), strips legacy 'embeds' field (DiscordAPIError 50035 prevention),
 * and preserves action rows and ephemeral states.
 *
 * @param {string|object} payload
 * @param {boolean} [isEphemeral=false]
 * @returns {object}
 */
function transformToV2Payload(payload, isEphemeral = false) {
    if (!payload) return payload;
    let base = typeof payload === 'string' ? { content: payload } : { ...payload };

    const shouldBeEphemeral = isEphemeral || Boolean(base.ephemeral);

    // If it already has IS_COMPONENTS_V2 flag set AND container components, do not convert again
    const hasV2Flag = (typeof base.flags === 'number' && (base.flags & IS_COMPONENTS_V2) !== 0) ||
                      (Array.isArray(base.flags) && base.flags.includes(IS_COMPONENTS_V2));
    const hasContainers = Array.isArray(base.components) && base.components.some(c => c && (c.type === 17 || c.type === 'CONTAINER'));

    const originalEmbeds = Array.isArray(payload?.embeds) ? payload.embeds : (Array.isArray(base.embeds) ? base.embeds : null);

    const originalContent = typeof base.content === 'string' ? base.content : null;

    if (hasV2Flag && hasContainers) {
        if (Array.isArray(base.flags)) {
            if (!base.flags.includes(IS_COMPONENTS_V2)) base.flags.push(IS_COMPONENTS_V2);
            if (shouldBeEphemeral && !base.flags.includes(64)) base.flags.push(64);
        } else {
            base.flags = resolveFlags(base.flags, shouldBeEphemeral);
        }
        // CRITICAL: Discord API forbids 'embeds' field when IS_COMPONENTS_V2 flag is active.
        // We delete it from enumerable properties (omitted in JSON), but preserve non-enumerable reference for tests/inspectors.
        delete base.embeds;
        if (originalEmbeds) {
            Object.defineProperty(base, 'embeds', {
                value: originalEmbeds,
                enumerable: false,
                writable: true,
                configurable: true
            });
        }
        if (base.content === null || base.content === undefined) {
            delete base.content;
        }
        return base;
    }

    const newComponents = [];
    let convertedAny = false;

    // Convert embeds to V2 Containers
    if (Array.isArray(base.embeds) && base.embeds.length > 0 && !hasContainers) {
        for (let i = 0; i < base.embeds.length; i++) {
            const embed = base.embeds[i];
            const container = embedToV2Container(embed);
            if (container) {
                if (i === 0 && base.content && typeof base.content === 'string' && base.content.trim()) {
                    container.components.unshift(createSeparator(false, 1));
                    container.components.unshift(createTextDisplay(base.content.trim()));
                }
                newComponents.push(container);
                convertedAny = true;
            }
        }
    }

    // Convert plain text content to V2 Container if no embeds converted and no containers exist
    if (!convertedAny && !hasContainers && base.content && typeof base.content === 'string') {
        const trimmed = base.content.trim();
        if (trimmed) {
            let accentColor = colors.primary || 0xAEA7BD;
            if (trimmed.startsWith('❌') || trimmed.toLowerCase().includes('erro') || trimmed.toLowerCase().includes('error')) {
                accentColor = colors.error || 0xED4245;
            } else if (trimmed.startsWith('⚠️') || trimmed.toLowerCase().includes('aviso') || trimmed.toLowerCase().includes('calma')) {
                accentColor = colors.warning || 0xFEE75C;
            } else if (trimmed.startsWith('✅') || trimmed.toLowerCase().includes('sucesso')) {
                accentColor = colors.success || 0x57F287;
            }

            newComponents.push(createContainer({
                accentColor,
                components: [createTextDisplay(trimmed)]
            }));
            convertedAny = true;
        }
    }

    // Append existing action row components
    if (Array.isArray(base.components)) {
        for (const comp of base.components) {
            if (comp) {
                newComponents.push(typeof comp.toJSON === 'function' ? comp.toJSON() : comp);
            }
        }
    }

    if (convertedAny || hasContainers) {
        if (Array.isArray(base.flags)) {
            if (!base.flags.includes(IS_COMPONENTS_V2)) base.flags.push(IS_COMPONENTS_V2);
            if (shouldBeEphemeral && !base.flags.includes(64)) base.flags.push(64);
        } else {
            base.flags = resolveFlags(base.flags, shouldBeEphemeral);
        }
        base.components = newComponents;
        // CRITICAL: Discord API forbids 'embeds' field when IS_COMPONENTS_V2 flag is active
        delete base.embeds;
        if (originalEmbeds) {
            Object.defineProperty(base, 'embeds', {
                value: originalEmbeds,
                enumerable: false,
                writable: true,
                configurable: true
            });
        }
        if (convertedAny && typeof base.content === 'string') {
            delete base.content;
            if (originalContent !== null) {
                Object.defineProperty(base, 'content', {
                    value: originalContent,
                    enumerable: false,
                    writable: true,
                    configurable: true
                });
            }
        } else if (base.content === null || base.content === undefined) {
            delete base.content;
        }
    } else if (hasV2Flag) {
        // Even if no components were converted, if IS_COMPONENTS_V2 is set, strip embeds
        delete base.embeds;
        if (originalEmbeds) {
            Object.defineProperty(base, 'embeds', {
                value: originalEmbeds,
                enumerable: false,
                writable: true,
                configurable: true
            });
        }
    }

    return base;
}

/**
 * Automatically wraps an interaction's response methods (reply, editReply, followUp, update)
 * so that any payload sent by commands is automatically transformed into Components V2.
 *
 * @param {import('discord.js').Interaction} interaction
 * @returns {import('discord.js').Interaction}
 */
function wrapInteractionForV2(interaction) {
    if (!interaction || interaction._v2Wrapped) return interaction;
    interaction._v2Wrapped = true;

    if (typeof interaction.reply === 'function') {
        const origReply = interaction.reply.bind(interaction);
        interaction.reply = (payload) => {
            const v2Payload = transformToV2Payload(payload, Boolean(payload?.ephemeral));
            return origReply(v2Payload);
        };
    }

    if (typeof interaction.editReply === 'function') {
        const origEditReply = interaction.editReply.bind(interaction);
        interaction.editReply = (payload) => {
            const v2Payload = transformToV2Payload(payload, false);
            return origEditReply(v2Payload);
        };
    }

    if (typeof interaction.followUp === 'function') {
        const origFollowUp = interaction.followUp.bind(interaction);
        interaction.followUp = (payload) => {
            const v2Payload = transformToV2Payload(payload, Boolean(payload?.ephemeral));
            return origFollowUp(v2Payload);
        };
    }

    if (typeof interaction.update === 'function') {
        const origUpdate = interaction.update.bind(interaction);
        interaction.update = (payload) => {
            const v2Payload = transformToV2Payload(payload, false);
            return origUpdate(v2Payload);
        };
    }

    return interaction;
}

/**
 * Detects if a Discord message was sent or exists with IS_COMPONENTS_V2 (flag 32768).
 *
 * @param {object} message Discord message object or mock
 * @returns {boolean}
 */
function isMessageV2(message) {
    if (!message) return false;
    const flags = message.flags;
    if (typeof flags === 'number') {
        return (flags & IS_COMPONENTS_V2) !== 0;
    }
    if (flags && typeof flags.has === 'function') {
        return flags.has(IS_COMPONENTS_V2);
    }
    if (flags && typeof flags.bitfield === 'number') {
        return (flags.bitfield & IS_COMPONENTS_V2) !== 0;
    }
    if (Array.isArray(flags)) {
        return flags.includes(IS_COMPONENTS_V2) || flags.includes('IsComponentsV2');
    }
    return false;
}

/**
 * Safely wraps interaction.update on component interactions.
 * If the target message in Discord is a Components V2 message (flags: 32768),
 * any update with legacy embeds will trigger DiscordAPIError[50035]
 * (MESSAGE_CANNOT_USE_LEGACY_FIELDS_WITH_COMPONENTS_V2).
 * This wrapper automatically detects V2 messages, converts legacy embeds into V2 Containers,
 * and intercepts any unexpected 50035 error from Discord to seamlessly convert and retry.
 *
 * @param {import('discord.js').Interaction} interaction
 * @returns {import('discord.js').Interaction}
 */
function wrapComponentInteractionUpdate(interaction) {
    if (!interaction || typeof interaction.update !== 'function' || interaction._v2UpdateWrapped) {
        return interaction;
    }
    interaction._v2UpdateWrapped = true;
    const originalUpdate = interaction.update.bind(interaction);

    interaction.update = async function (payload) {
        let callPayload = payload;
        const msgIsV2 = isMessageV2(interaction.message);

        if (msgIsV2 && callPayload && typeof callPayload === 'object' && Array.isArray(callPayload.embeds) && callPayload.embeds.length > 0) {
            callPayload = transformToV2Payload(callPayload, false);
        }

        try {
            return await originalUpdate(callPayload);
        } catch (err) {
            const errStr = (err && err.rawError ? JSON.stringify(err.rawError) : '') + ' ' + (err?.message || '') + ' ' + String(err || '');
            if (errStr.includes('MESSAGE_CANNOT_USE_LEGACY_FIELDS_WITH_COMPONENTS_V2') ||
                errStr.includes('IS_COMPONENTS_V2')) {
                const v2Payload = transformToV2Payload(payload, false);
                return await originalUpdate(v2Payload);
            }
            throw err;
        }
    };

    return interaction;
}

module.exports = {
    IS_COMPONENTS_V2,
    ComponentType,
    createTextDisplay,
    createSeparator,
    createSection,
    createMediaGallery,
    createContainer,
    createV2Card,
    createV2Payload,
    embedToV2Container,
    transformToV2Payload,
    wrapInteractionForV2,
    resolveFlags,
    isMessageV2,
    wrapComponentInteractionUpdate,
};
