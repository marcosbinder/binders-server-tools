// tests/helpers/mockDiscord.js
const { Collection } = require('discord.js');

/**
 * Creates a mock Discord Client object
 */
function createMockClient(overrides = {}) {
    const commands = new Collection();
    const buttons = new Collection();
    const selects = new Collection();
    const modals = new Collection();

    const clientUser = {
        id: overrides.botId || '1310336375261892608',
        tag: 'BindersServerTools#1234',
        username: "Binder's Server Tools",
        displayName: "Binder's Server Tools",
        displayAvatarURL: () => 'https://cdn.discordapp.com/avatars/bot.png',
        ...overrides.user,
    };

    const guildsCache = new Map();
    if (overrides.guilds) {
        for (const g of overrides.guilds) {
            guildsCache.set(g.id, g);
        }
    } else {
        guildsCache.set('987654321098765432', {
            id: '987654321098765432',
            name: 'Main Support Server',
            memberCount: 1500,
        });
    }

    const usersCache = new Map();
    const client = {
        user: clientUser,
        commands,
        buttons,
        selects,
        modals,
        guilds: {
            cache: guildsCache,
            fetch: async (id) => guildsCache.get(id) || null,
        },
        users: {
            cache: usersCache,
            fetch: async (id, opts = {}) => {
                if (overrides.usersMap && overrides.usersMap[id]) {
                    return overrides.usersMap[id];
                }
                return {
                    id,
                    username: `FetchedUser_${id}`,
                    displayName: `FetchedUser_${id}`,
                    tag: `FetchedUser_${id}#0000`,
                    bot: false,
                    banner: 'banner_hash_123',
                    accentColor: 0x5865F2,
                    hexAccentColor: '#5865F2',
                    flags: { toArray: () => ['ActiveDeveloper'] },
                    displayAvatarURL: () => `https://cdn.discordapp.com/avatars/${id}/avatar.png`,
                    bannerURL: () => `https://cdn.discordapp.com/banners/${id}/banner.png`,
                };
            },
        },
        ws: {
            ping: overrides.ping !== undefined ? overrides.ping : 45,
        },
        ...overrides,
    };

    return client;
}

/**
 * Creates a comprehensive mock Discord Interaction object for testing
 * chat input commands, buttons, select menus, context menus, and modals.
 */
function createMockInteraction(overrides = {}) {
    const userId = overrides.userId || '123456789012345678';
    const guildId = overrides.guildId !== undefined ? overrides.guildId : '987654321098765432';
    const isGuild = guildId !== null;

    const user = {
        id: userId,
        username: overrides.username || 'TestUser',
        displayName: overrides.displayName || overrides.username || 'TestUser',
        discriminator: overrides.discriminator || '0001',
        tag: overrides.tag || `${overrides.username || 'TestUser'}#0001`,
        bot: overrides.isBot || false,
        flags: {
            toArray: () => overrides.userFlags || ['ActiveDeveloper'],
        },
        banner: overrides.banner || null,
        accentColor: overrides.accentColor !== undefined ? overrides.accentColor : 0x5865F2,
        hexAccentColor: overrides.hexAccentColor || '#5865F2',
        displayAvatarURL: (opts) => overrides.avatarUrl || 'https://cdn.discordapp.com/avatars/123/abc.png',
        bannerURL: (opts) => overrides.bannerUrl || (overrides.banner ? `https://cdn.discordapp.com/banners/${userId}/${overrides.banner}.png` : null),
        ...overrides.user,
    };

    const rolesMap = new Map();
    const mockRoles = overrides.roles || [
        { id: '111', name: 'Member', position: 1, hexColor: '#99aab5' },
        { id: '222', name: 'Admin', position: 10, hexColor: '#e91e63' },
    ];
    for (const r of mockRoles) {
        rolesMap.set(r.id, r);
    }

    const member = isGuild ? {
        id: userId,
        user,
        displayName: overrides.memberDisplayName || user.displayName,
        guild: null, // linked below
        roles: {
            cache: rolesMap,
            highest: mockRoles[mockRoles.length - 1] || { id: '0', name: '@everyone', position: 0, hexColor: '#000000' },
        },
        permissions: {
            has: (perm) => (overrides.permissions ? overrides.permissions.includes(perm) : true),
        },
        premiumSince: overrides.premiumSince || null,
        joinedAt: overrides.joinedAt || new Date('2024-01-15T12:00:00Z'),
        displayHexColor: overrides.displayHexColor || '#e91e63',
        ...overrides.member,
    } : null;

    const guild = isGuild ? {
        id: guildId,
        name: overrides.guildName || 'Test Guild',
        memberCount: overrides.memberCount || 42,
        iconURL: () => overrides.guildIcon || 'https://cdn.discordapp.com/icons/123/icon.png',
        members: {
            cache: new Map([[userId, member]]),
            fetch: async (id) => {
                if (id === userId) return member;
                if (overrides.targetMember && id === overrides.targetMember.id) return overrides.targetMember;
                const fetchedUser = {
                    id,
                    username: `User_${id}`,
                    displayName: `User_${id}`,
                    tag: `User_${id}#0000`,
                    bot: false,
                    displayAvatarURL: () => 'https://cdn.discordapp.com/avatars/default.png',
                    bannerURL: () => null,
                };
                return {
                    id,
                    user: fetchedUser,
                    displayName: fetchedUser.displayName,
                    roles: { cache: new Map(), highest: { position: 0, name: '@everyone', hexColor: '#000000' } },
                    permissions: { has: () => false },
                    premiumSince: null,
                    joinedAt: new Date('2024-01-01'),
                    displayHexColor: '#000000',
                };
            },
        },
        ...overrides.guild,
    } : null;

    if (member && guild) {
        member.guild = guild;
    }

    const defaultClient = createMockClient();
    const client = overrides.client || defaultClient;

    const replies = [];
    const updates = [];
    const editReplies = [];
    const followUps = [];

    const optionsMap = new Map(Object.entries(overrides.options || {}));

    const interaction = {
        id: overrides.id || 'interaction_12345',
        client,
        type: overrides.interactionType || 2, // ApplicationCommand
        commandName: overrides.commandName || 'ajuda',
        customId: overrides.customId || null,
        values: overrides.values || [],
        locale: overrides.locale || 'pt-BR',
        guildLocale: overrides.guildLocale || 'pt-BR',
        user,
        member,
        guild,
        guildId,
        channelId: overrides.channelId || '112233445566778899',
        channel: overrides.channel || {
            id: overrides.channelId || '112233445566778899',
            name: 'general',
            send: async (payload) => ({ id: 'msg_sent_123', ...payload }),
        },
        deferred: overrides.deferred || false,
        replied: overrides.replied || false,
        ephemeral: overrides.ephemeral || false,

        // Context Menu Targets
        targetId: overrides.targetId || null,
        targetUser: overrides.targetUser || null,
        targetMember: overrides.targetMember || null,
        targetMessage: overrides.targetMessage || null,

        // Options helper
        options: {
            getSubcommand: (req) => overrides.subcommand || null,
            getSubcommandGroup: () => overrides.subcommandGroup || null,
            getString: (name) => (optionsMap.has(name) ? optionsMap.get(name) : (overrides.options?.[name] ?? null)),
            getInteger: (name) => (optionsMap.has(name) ? optionsMap.get(name) : (overrides.options?.[name] ?? null)),
            getNumber: (name) => (optionsMap.has(name) ? optionsMap.get(name) : (overrides.options?.[name] ?? null)),
            getBoolean: (name) => (optionsMap.has(name) ? optionsMap.get(name) : (overrides.options?.[name] ?? null)),
            getUser: (name) => (optionsMap.has(name) ? optionsMap.get(name) : (overrides.options?.[name] ?? null)),
            getMember: (name) => (optionsMap.has(name) ? optionsMap.get(name) : (overrides.options?.[name] ?? null)),
            getChannel: (name) => (optionsMap.has(name) ? optionsMap.get(name) : (overrides.options?.[name] ?? null)),
            getRole: (name) => (optionsMap.has(name) ? optionsMap.get(name) : (overrides.options?.[name] ?? null)),
            getMentionable: (name) => (optionsMap.has(name) ? optionsMap.get(name) : (overrides.options?.[name] ?? null)),
            getAttachment: (name) => (optionsMap.has(name) ? optionsMap.get(name) : (overrides.options?.[name] ?? null)),
        },

        // Type checkers
        isChatInputCommand: () => overrides.isChatInputCommand !== undefined ? overrides.isChatInputCommand : overrides.type === 'chatInput' || overrides.commandName !== undefined,
        isButton: () => overrides.isButton !== undefined ? overrides.isButton : overrides.type === 'button' || (overrides.customId && !overrides.values),
        isStringSelectMenu: () => overrides.isStringSelectMenu !== undefined ? overrides.isStringSelectMenu : overrides.type === 'select' || (Array.isArray(overrides.values)),
        isUserContextMenuCommand: () => overrides.isUserContextMenuCommand !== undefined ? overrides.isUserContextMenuCommand : overrides.type === 'userContext',
        isMessageContextMenuCommand: () => overrides.isMessageContextMenuCommand !== undefined ? overrides.isMessageContextMenuCommand : overrides.type === 'messageContext',
        isContextMenuCommand: () => {
            if (overrides.isContextMenuCommand !== undefined) return overrides.isContextMenuCommand;
            return overrides.type === 'userContext' || overrides.type === 'messageContext' || overrides.isUserContextMenuCommand || overrides.isMessageContextMenuCommand;
        },
        isModalSubmit: () => overrides.isModalSubmit !== undefined ? overrides.isModalSubmit : overrides.type === 'modal',
        isAutocomplete: () => overrides.isAutocomplete !== undefined ? overrides.isAutocomplete : overrides.type === 'autocomplete',
        inGuild: () => isGuild,

        // Interaction response methods
        reply: async (payload) => {
            interaction.replied = true;
            const res = typeof payload === 'string' ? { content: payload } : payload;
            replies.push(res);
            return res;
        },
        deferReply: async (opts = {}) => {
            interaction.deferred = true;
            if (opts.ephemeral) interaction.ephemeral = true;
            return { deferred: true };
        },
        editReply: async (payload) => {
            const res = typeof payload === 'string' ? { content: payload } : payload;
            editReplies.push(res);
            return res;
        },
        update: async (payload) => {
            interaction.replied = true;
            const res = typeof payload === 'string' ? { content: payload } : payload;
            updates.push(res);
            return res;
        },
        followUp: async (payload) => {
            const res = typeof payload === 'string' ? { content: payload } : payload;
            followUps.push(res);
            return res;
        },
        showModal: async (modal) => {
            return { modalShown: modal };
        },

        // Test inspection properties
        _replies: replies,
        _updates: updates,
        _editReplies: editReplies,
        _followUps: followUps,
        _getLastResponse: () => {
            if (updates.length > 0) return updates[updates.length - 1];
            if (editReplies.length > 0) return editReplies[editReplies.length - 1];
            if (replies.length > 0) return replies[replies.length - 1];
            if (followUps.length > 0) return followUps[followUps.length - 1];
            return null;
        },
    };

    return interaction;
}

module.exports = {
    createMockInteraction,
    createMockClient,
};
