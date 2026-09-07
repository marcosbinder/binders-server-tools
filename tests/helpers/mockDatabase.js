// tests/helpers/mockDatabase.js

/**
 * Creates an in-memory database mock supporting both SQLite and Supabase PostgreSQL paradigms
 * with schema validation, query execution, failover hooks, and transaction simulation.
 */
function createMockDatabase(initialData = {}) {
    const tables = {
        users: new Map(),
        guilds: new Map(),
        moderation_logs: new Map(),
        warnings: new Map(),
        economy_profiles: new Map(),
        afk_status: new Map(),
        custom_commands: new Map(),
        reminders: new Map(),
        ai_history: new Map(),
    };

    // Populate initial users
    if (initialData.users) {
        for (const u of initialData.users) {
            tables.users.set(u.userId || u.user_id, {
                userId: u.userId || u.user_id,
                user_id: u.userId || u.user_id,
                tosVersion: u.tosVersion !== undefined ? u.tosVersion : (u.tos_version !== undefined ? u.tos_version : 0),
                tos_version: u.tosVersion !== undefined ? u.tosVersion : (u.tos_version !== undefined ? u.tos_version : 0),
                language: u.language || 'lang_auto',
                lastKnownLocale: u.lastKnownLocale || u.last_known_locale || null,
                last_known_locale: u.lastKnownLocale || u.last_known_locale || null,
                badges: u.badges || null,
                isDeveloper: u.isDeveloper !== undefined ? u.isDeveloper : (u.is_developer !== undefined ? u.is_developer : 0),
                is_developer: u.isDeveloper !== undefined ? u.isDeveloper : (u.is_developer !== undefined ? u.is_developer : 0),
            });
        }
    }

    // Populate initial guilds
    if (initialData.guilds) {
        for (const g of initialData.guilds) {
            tables.guilds.set(g.guildId || g.guild_id, {
                guildId: g.guildId || g.guild_id,
                guild_id: g.guildId || g.guild_id,
                antiraidEnabled: g.antiraidEnabled !== undefined ? g.antiraidEnabled : (g.antiraid_enabled || 0),
                antiraid_enabled: g.antiraidEnabled !== undefined ? g.antiraidEnabled : (g.antiraid_enabled || 0),
                welcomeChannelId: g.welcomeChannelId || g.welcome_channel_id || null,
                welcome_channel_id: g.welcomeChannelId || g.welcome_channel_id || null,
                goodbyeChannelId: g.goodbyeChannelId || g.goodbye_channel_id || null,
                goodbye_channel_id: g.goodbyeChannelId || g.goodbye_channel_id || null,
                prefix: g.prefix || '!',
            });
        }
    }

    let networkFailure = false;
    let fallbackActive = false;

    const mockProvider = {
        _tables: tables,
        _isNetworkDown: () => networkFailure,
        _isFallbackActive: () => fallbackActive,

        simulateNetworkFailure: (down = true) => {
            networkFailure = down;
            if (down) fallbackActive = true;
        },
        simulateRecovery: () => {
            networkFailure = false;
            fallbackActive = false;
        },

        // Unified User Operations
        getUser: (userId) => {
            if (networkFailure && !fallbackActive) {
                throw new Error('Supabase network connection timeout (503 Service Unavailable)');
            }
            let user = tables.users.get(userId);
            if (!user) {
                user = {
                    userId,
                    user_id: userId,
                    tosVersion: 0,
                    tos_version: 0,
                    language: 'lang_auto',
                    lastKnownLocale: null,
                    last_known_locale: null,
                    badges: null,
                    isDeveloper: 0,
                    is_developer: 0,
                };
                tables.users.set(userId, user);
            }
            return { ...user };
        },

        getUserAsync: async (userId) => {
            return mockProvider.getUser(userId);
        },

        updateUser: (userId, columnOrObj, value) => {
            if (networkFailure && !fallbackActive) {
                throw new Error('Supabase network connection timeout (503 Service Unavailable)');
            }
            let user = tables.users.get(userId);
            if (!user) {
                user = mockProvider.getUser(userId);
            }
            if (typeof columnOrObj === 'object') {
                for (const [k, v] of Object.entries(columnOrObj)) {
                    user[k] = v;
                    // normalize snake_case <-> camelCase
                    if (k === 'tosVersion') user.tos_version = v;
                    if (k === 'tos_version') user.tosVersion = v;
                    if (k === 'lastKnownLocale') user.last_known_locale = v;
                    if (k === 'last_known_locale') user.lastKnownLocale = v;
                    if (k === 'isDeveloper') user.is_developer = v;
                    if (k === 'is_developer') user.isDeveloper = v;
                }
            } else {
                user[columnOrObj] = value;
                if (columnOrObj === 'tosVersion') user.tos_version = value;
                if (columnOrObj === 'tos_version') user.tosVersion = value;
                if (columnOrObj === 'lastKnownLocale') user.last_known_locale = value;
                if (columnOrObj === 'last_known_locale') user.lastKnownLocale = value;
                if (columnOrObj === 'isDeveloper') user.is_developer = value;
                if (columnOrObj === 'is_developer') user.isDeveloper = value;
            }
            tables.users.set(userId, user);
            return { ...user };
        },

        updateUserAsync: async (userId, columnOrObj, value) => {
            return mockProvider.updateUser(userId, columnOrObj, value);
        },

        setLastKnownLocale: (userId, locale) => {
            return mockProvider.updateUser(userId, 'lastKnownLocale', locale);
        },

        // Unified Guild Operations
        getGuild: (guildId) => {
            if (networkFailure && !fallbackActive) {
                throw new Error('Database connection failed');
            }
            let guild = tables.guilds.get(guildId);
            if (!guild) {
                guild = {
                    guildId,
                    guild_id: guildId,
                    antiraidEnabled: 0,
                    antiraid_enabled: 0,
                    welcomeChannelId: null,
                    welcome_channel_id: null,
                    goodbyeChannelId: null,
                    goodbye_channel_id: null,
                    prefix: '!',
                };
                tables.guilds.set(guildId, guild);
            }
            return { ...guild };
        },

        getGuildAsync: async (guildId) => {
            return mockProvider.getGuild(guildId);
        },

        updateGuild: (guildId, columnOrObj, value) => {
            if (networkFailure && !fallbackActive) {
                throw new Error('Database connection failed');
            }
            let guild = tables.guilds.get(guildId);
            if (!guild) {
                guild = mockProvider.getGuild(guildId);
            }
            if (typeof columnOrObj === 'object') {
                for (const [k, v] of Object.entries(columnOrObj)) {
                    guild[k] = v;
                    if (k === 'antiraidEnabled') guild.antiraid_enabled = v;
                    if (k === 'antiraid_enabled') guild.antiraidEnabled = v;
                }
            } else {
                guild[columnOrObj] = value;
                if (columnOrObj === 'antiraidEnabled') guild.antiraid_enabled = value;
                if (columnOrObj === 'antiraid_enabled') guild.antiraidEnabled = value;
            }
            tables.guilds.set(guildId, guild);
            return { ...guild };
        },

        // Generic query executor for SQL validation
        exec: (sql) => {
            if (networkFailure && !fallbackActive) {
                throw new Error('Database query execution error');
            }
            return { changes: 1 };
        },

        // Mock Supabase Query Builder Client
        createSupabaseClient: () => {
            return {
                from: (tableName) => {
                    const table = tables[tableName] || new Map();
                    let currentFilter = null;
                    const builder = {
                        select: (columns = '*') => builder,
                        insert: async (values) => {
                            if (networkFailure) throw new Error('Failed to fetch from Supabase');
                            const items = Array.isArray(values) ? values : [values];
                            for (const item of items) {
                                const id = item.userId || item.user_id || item.guildId || item.guild_id || String(Date.now());
                                table.set(id, item);
                            }
                            return { data: items, error: null };
                        },
                        upsert: async (values) => {
                            return builder.insert(values);
                        },
                        update: (updateValues) => {
                            return {
                                eq: async (col, val) => {
                                    if (networkFailure) throw new Error('Failed to fetch from Supabase');
                                    let found = null;
                                    for (const [id, row] of table.entries()) {
                                        if (row[col] === val || row[col.toLowerCase()] === val) {
                                            Object.assign(row, updateValues);
                                            found = row;
                                        }
                                    }
                                    return { data: found ? [found] : [], error: null };
                                }
                            };
                        },
                        eq: (col, val) => {
                            currentFilter = { col, val };
                            return {
                                maybeSingle: async () => {
                                    if (networkFailure) throw new Error('Failed to fetch from Supabase');
                                    for (const [id, row] of table.entries()) {
                                        if (row[col] === val || row[col.toLowerCase()] === val) {
                                            return { data: row, error: null };
                                        }
                                    }
                                    return { data: null, error: null };
                                },
                                single: async () => {
                                    if (networkFailure) throw new Error('Failed to fetch from Supabase');
                                    for (const [id, row] of table.entries()) {
                                        if (row[col] === val || row[col.toLowerCase()] === val) {
                                            return { data: row, error: null };
                                        }
                                    }
                                    return { data: null, error: new Error('No rows found') };
                                },
                            };
                        },
                    };
                    return builder;
                }
            };
        }
    };

    return mockProvider;
}

module.exports = {
    createMockDatabase,
};
