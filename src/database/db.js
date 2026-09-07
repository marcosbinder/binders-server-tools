/**
 * @file db.js
 * @description Módulo unificado de banco de dados com suporte dual:
 *  - Primário: Supabase PostgreSQL (@supabase/supabase-js)
 *  - Fallback local: SQLite (better-sqlite3)
 *  - Fallback de contingência: Memória (In-Memory Map)
 */

const path = require('node:path');
const fs = require('node:fs');

// Garante carregamento das variáveis de ambiente
require('dotenv').config();

let supabaseClient = null;
let sqliteDb = null;
let databaseMode = 'memory'; // 'supabase' | 'sqlite' | 'memory'
let isInitialized = false;

// Cache em memória para leitura rápida e contingência in-memory
const userCache = new Map();
const guildCache = new Map();
const aiHistoryMemory = [];
const remindersMemory = [];
const commandStatsMemory = new Map();
const CACHE_TTL_MS = 60 * 1000; // 1 minuto de cache

// Cache de prepared statements para reaproveitamento e prevenção de destructors de GC
const preparedStatements = new Map();

function getPreparedStatement(sql) {
    if (!sqliteDb || typeof sqliteDb.prepare !== 'function') return null;
    let stmt = preparedStatements.get(sql);
    if (!stmt) {
        stmt = sqliteDb.prepare(sql);
        preparedStatements.set(sql, stmt);
    }
    return stmt;
}


/**
 * Normaliza um registro de lembrete para conter chaves camelCase e snake_case
 */
function normalizeReminder(raw) {
    if (!raw) return null;
    const id = String(raw.id || raw.reminder_id || `rem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);
    const userId = raw.userId || raw.user_id;
    const guildId = raw.guildId || raw.guild_id || null;
    const channelId = raw.channelId || raw.channel_id || null;
    const message = raw.message || '';
    const dueTimestamp = Number(raw.dueTimestamp || raw.due_timestamp || Date.now());
    const createdAt = Number(raw.createdAt || raw.created_at || Date.now());
    const completed = Number(raw.completed !== undefined ? raw.completed : 0);

    return {
        id,
        reminder_id: id,
        userId,
        user_id: userId,
        guildId,
        guild_id: guildId,
        channelId,
        channel_id: channelId,
        message,
        dueTimestamp,
        due_timestamp: dueTimestamp,
        createdAt,
        created_at: createdAt,
        completed,
    };
}

/**
 * Normaliza um registro de usuário para conter chaves camelCase e snake_case
 */
function normalizeUser(rawUser) {
    if (!rawUser) return null;
    const userId = rawUser.userId || rawUser.user_id;
    const tosVersion = rawUser.tosVersion !== undefined ? rawUser.tosVersion : (rawUser.tos_version !== undefined ? rawUser.tos_version : 0);
    const language = rawUser.language || 'lang_auto';
    const lastKnownLocale = rawUser.lastKnownLocale !== undefined ? rawUser.lastKnownLocale : (rawUser.last_known_locale !== undefined ? rawUser.last_known_locale : null);
    const badges = rawUser.badges !== undefined ? rawUser.badges : '[]';
    const isDeveloper = rawUser.isDeveloper !== undefined ? rawUser.isDeveloper : (rawUser.is_developer !== undefined ? rawUser.is_developer : 0);

    const userObj = {
        userId,
        user_id: userId,
        tosVersion: Number(tosVersion),
        tos_version: Number(tosVersion),
        language,
        lastKnownLocale,
        last_known_locale: lastKnownLocale,
        badges,
        isDeveloper: Number(isDeveloper),
        is_developer: Number(isDeveloper),
        createdAt: rawUser.createdAt || rawUser.created_at || Date.now(),
        updatedAt: rawUser.updatedAt || rawUser.updated_at || Date.now(),
    };

    return userObj;
}

/**
 * Normaliza um registro de guilda para conter chaves camelCase e snake_case
 */
function normalizeGuild(rawGuild) {
    if (!rawGuild) return null;
    let settings = {};
    if (rawGuild.settings) {
        try {
            settings = typeof rawGuild.settings === 'string' ? JSON.parse(rawGuild.settings) : rawGuild.settings;
        } catch (_) {}
    }
    const guildId = rawGuild.guildId || rawGuild.guild_id;
    const antiraidEnabled = rawGuild.antiraidEnabled !== undefined
        ? rawGuild.antiraidEnabled
        : (rawGuild.antiraid_enabled !== undefined
            ? rawGuild.antiraid_enabled
            : (settings.antiraidEnabled !== undefined ? settings.antiraidEnabled : 0));
    const welcomeChannelId = rawGuild.welcomeChannelId !== undefined
        ? rawGuild.welcomeChannelId
        : (rawGuild.welcome_channel_id !== undefined
            ? rawGuild.welcome_channel_id
            : (settings.welcomeChannelId || null));
    const goodbyeChannelId = rawGuild.goodbyeChannelId !== undefined
        ? rawGuild.goodbyeChannelId
        : (rawGuild.goodbye_channel_id !== undefined
            ? rawGuild.goodbye_channel_id
            : (settings.goodbyeChannelId || null));
    const prefix = rawGuild.prefix || settings.prefix || '!';
    const language = rawGuild.language || settings.language || 'pt_BR';

    const guildObj = {
        guildId,
        guild_id: guildId,
        prefix,
        language,
        antiraidEnabled: Number(antiraidEnabled),
        antiraid_enabled: Number(antiraidEnabled),
        welcomeChannelId,
        welcome_channel_id: welcomeChannelId,
        goodbyeChannelId,
        goodbye_channel_id: goodbyeChannelId,
        settings: typeof rawGuild.settings === 'string' ? rawGuild.settings : JSON.stringify({ antiraidEnabled: Number(antiraidEnabled), welcomeChannelId, goodbyeChannelId, prefix, language }),
        createdAt: rawGuild.createdAt || rawGuild.created_at || Date.now(),
        updatedAt: rawGuild.updatedAt || rawGuild.updated_at || Date.now(),
    };

    return guildObj;
}

/**
 * Cria backup diário do banco de dados SQLite local
 */
function createDailyBackup() {
    try {
        const backupDir = path.join(process.cwd(), 'database', 'backups');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
            console.log('[Database/SQLite] Pasta de backups criada.');
        }
        const today = new Date().toISOString().slice(0, 10);
        const backupFilePath = path.join(backupDir, `backup-${today}.db`);
        if (!fs.existsSync(backupFilePath) && sqliteDb && typeof sqliteDb.backup === 'function') {
            sqliteDb.backup(backupFilePath)
                .then(() => console.log(`[Database/SQLite] Backup diário (${today}) gerado com sucesso.`))
                .catch((err) => console.error('[Database/SQLite] Falha ao gerar backup diário:', err.message));
        }
    } catch (error) {
        console.error('[Database/SQLite] Erro no gerenciador de backup:', error.message);
    }
}

let sqliteInitAttempted = false;

/**
 * Aplica migrações automáticas e cria tabelas individualmente no SQLite
 * @param {any} db Instância do better-sqlite3
 */
function migrateSqliteTables(db) {
    if (!db) return;

    // 1. Criação individual resiliente de tabelas
    const tableSchemas = [
        `CREATE TABLE IF NOT EXISTS users (
            userId TEXT PRIMARY KEY,
            tosVersion INTEGER NOT NULL DEFAULT 0,
            language TEXT NOT NULL DEFAULT 'lang_auto',
            lastKnownLocale TEXT,
            badges TEXT DEFAULT '[]',
            isDeveloper INTEGER NOT NULL DEFAULT 0,
            createdAt INTEGER DEFAULT 0,
            updatedAt INTEGER DEFAULT 0
        )`,
        `CREATE TABLE IF NOT EXISTS guilds (
            guildId TEXT PRIMARY KEY,
            antiraidEnabled INTEGER NOT NULL DEFAULT 0,
            welcomeChannelId TEXT,
            goodbyeChannelId TEXT,
            createdAt INTEGER DEFAULT 0,
            updatedAt INTEGER DEFAULT 0
        )`,
        `CREATE TABLE IF NOT EXISTS ai_history (
            messageId TEXT PRIMARY KEY,
            userId TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            timestamp INTEGER NOT NULL,
            createdAt INTEGER DEFAULT 0
        )`,
        `CREATE TABLE IF NOT EXISTS reminders (
            id TEXT PRIMARY KEY,
            userId TEXT NOT NULL,
            guildId TEXT,
            channelId TEXT,
            message TEXT NOT NULL,
            dueTimestamp INTEGER NOT NULL,
            createdAt INTEGER DEFAULT 0,
            completed INTEGER NOT NULL DEFAULT 0
        )`,
        `CREATE TABLE IF NOT EXISTS sync_queue (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT NOT NULL,
            entityId TEXT NOT NULL,
            payload TEXT NOT NULL,
            createdAt INTEGER DEFAULT 0
        )`,
        `CREATE TABLE IF NOT EXISTS command_stats (
            commandName TEXT PRIMARY KEY,
            executionCount INTEGER NOT NULL DEFAULT 0,
            uniqueUsers TEXT DEFAULT '[]',
            lastUsedAt INTEGER DEFAULT 0
        )`
    ];

    for (const sql of tableSchemas) {
        try {
            db.exec(sql);
        } catch (e) {
            console.error('[Database/SQLite] Erro ao criar tabela:', e.message);
        }
    }

    // 2. Migração automática de colunas caso o banco main.db já existisse na hospedagem com esquema antigo
    try {
        if (typeof db.pragma === 'function') {
            const userCols = db.pragma('table_info(users)').map(c => c.name);
            if (!userCols.includes('createdAt')) db.exec('ALTER TABLE users ADD COLUMN createdAt INTEGER DEFAULT 0');
            if (!userCols.includes('updatedAt')) db.exec('ALTER TABLE users ADD COLUMN updatedAt INTEGER DEFAULT 0');
            if (!userCols.includes('badges')) db.exec("ALTER TABLE users ADD COLUMN badges TEXT DEFAULT '[]'");
            if (!userCols.includes('isDeveloper')) db.exec('ALTER TABLE users ADD COLUMN isDeveloper INTEGER DEFAULT 0');
            if (!userCols.includes('lastKnownLocale')) db.exec('ALTER TABLE users ADD COLUMN lastKnownLocale TEXT');
            if (!userCols.includes('language')) db.exec("ALTER TABLE users ADD COLUMN language TEXT DEFAULT 'lang_auto'");
            if (!userCols.includes('tosVersion')) db.exec('ALTER TABLE users ADD COLUMN tosVersion INTEGER DEFAULT 0');

            const guildCols = db.pragma('table_info(guilds)').map(c => c.name);
            if (!guildCols.includes('createdAt')) db.exec('ALTER TABLE guilds ADD COLUMN createdAt INTEGER DEFAULT 0');
            if (!guildCols.includes('updatedAt')) db.exec('ALTER TABLE guilds ADD COLUMN updatedAt INTEGER DEFAULT 0');
            if (!guildCols.includes('antiraidEnabled')) db.exec('ALTER TABLE guilds ADD COLUMN antiraidEnabled INTEGER DEFAULT 0');
            if (!guildCols.includes('welcomeChannelId')) db.exec('ALTER TABLE guilds ADD COLUMN welcomeChannelId TEXT');
            if (!guildCols.includes('goodbyeChannelId')) db.exec('ALTER TABLE guilds ADD COLUMN goodbyeChannelId TEXT');

            const reminderCols = db.pragma('table_info(reminders)').map(c => c.name);
            if (!reminderCols.includes('createdAt')) db.exec('ALTER TABLE reminders ADD COLUMN createdAt INTEGER DEFAULT 0');
            if (!reminderCols.includes('completed')) db.exec('ALTER TABLE reminders ADD COLUMN completed INTEGER DEFAULT 0');
            if (!reminderCols.includes('guildId')) db.exec('ALTER TABLE reminders ADD COLUMN guildId TEXT');
            if (!reminderCols.includes('channelId')) db.exec('ALTER TABLE reminders ADD COLUMN channelId TEXT');

            const statsCols = db.pragma('table_info(command_stats)').map(c => c.name);
            if (!statsCols.includes('executionCount')) db.exec('ALTER TABLE command_stats ADD COLUMN executionCount INTEGER NOT NULL DEFAULT 0');
            if (!statsCols.includes('uniqueUsers')) db.exec("ALTER TABLE command_stats ADD COLUMN uniqueUsers TEXT DEFAULT '[]'");
            if (!statsCols.includes('lastUsedAt')) db.exec('ALTER TABLE command_stats ADD COLUMN lastUsedAt INTEGER DEFAULT 0');
        }
    } catch (e) {
        console.warn('[Database/SQLite] Aviso na verificação de colunas:', e.message);
    }
}

/**
 * Inicializa a instância local do SQLite com contingência em memória caso bindings falhem
 */
function initSqliteFallback() {
    if (sqliteDb) return sqliteDb;
    if (sqliteInitAttempted && sqliteDb === null) return null;
    sqliteInitAttempted = true;

    try {
        const Database = require('better-sqlite3');
        const dbDir = path.join(process.cwd(), 'database');
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }
        const dbPath = path.join(dbDir, 'main.db');
        sqliteDb = new Database(dbPath);
        sqliteDb.pragma('journal_mode = WAL');

        createDailyBackup();
        // Agenda backup diário recorrente a cada 24 horas
        setInterval(createDailyBackup, 24 * 60 * 60 * 1000).unref();

        migrateSqliteTables(sqliteDb);

        if (databaseMode !== 'supabase') {
            databaseMode = 'sqlite';
        }
        console.log('[Database] Fallback SQLite pronto em:', dbPath);
        return sqliteDb;
    } catch (nativeErr) {
        sqliteDb = null;
        console.warn('[Database] better-sqlite3 indisponível ou incompatível:', nativeErr.message);
        console.warn('[Database] Ativando armazenamento resiliente em memória (Mock Memory Layer).');
        if (databaseMode !== 'supabase') {
            databaseMode = 'memory';
        }
        return null;
    }
}

// Configuração e rastreamento do Circuit Breaker para Supabase
const CIRCUIT_BREAKER_CONFIG = {
    maxConsecutiveFailures: 3,
    resetTimeoutMs: 30000, // 30 segundos
};

let consecutiveSupabaseFailures = 0;
let circuitBreakerOpenUntil = 0;

function isCircuitBreakerOpen() {
    if (circuitBreakerOpenUntil === 0) return false;
    if (Date.now() >= circuitBreakerOpenUntil) {
        circuitBreakerOpenUntil = 0;
        console.log('[Database/CircuitBreaker] Timeout de reset expirado. Supabase em modo half-open (testando recuperação).');
        return false;
    }
    return true;
}

function recordSupabaseSuccess() {
    if (consecutiveSupabaseFailures > 0) {
        console.log('[Database/CircuitBreaker] Operação Supabase bem-sucedida. Resetando contador de falhas consecutivas.');
    }
    consecutiveSupabaseFailures = 0;
    circuitBreakerOpenUntil = 0;
    // Dispara sincronização assíncrona de itens pendentes na fila
    flushSyncQueue().catch(() => null);
}

function recordSupabaseFailure(error) {
    consecutiveSupabaseFailures++;
    console.warn(`[Database/CircuitBreaker] Falha consecutiva #${consecutiveSupabaseFailures} no Supabase: ${error?.message || error}`);
    if (consecutiveSupabaseFailures >= CIRCUIT_BREAKER_CONFIG.maxConsecutiveFailures) {
        circuitBreakerOpenUntil = Date.now() + CIRCUIT_BREAKER_CONFIG.resetTimeoutMs;
        console.warn(`[Database/CircuitBreaker] AVISO: ${consecutiveSupabaseFailures} falhas consecutivas no Supabase. Circuito ABERTO por ${CIRCUIT_BREAKER_CONFIG.resetTimeoutMs / 1000}s. Roteando consultas e mutações para fallback local (SQLite/Memória).`);
    }
}

function isSupabaseAvailable() {
    return databaseMode === 'supabase' && supabaseClient && !isCircuitBreakerOpen();
}

// -----------------------------------------------------------------------------
// Fila de Sincronização (Outbox Sync Queue) Supabase Resiliente
// -----------------------------------------------------------------------------
const syncQueueMemory = [];
let isFlushingSyncQueue = false;

/**
 * Enfileira uma mutação para ser sincronizada com o Supabase após recuperação de conexão
 */
function enqueueSync(type, entityId, payload) {
    const item = {
        type,
        entityId: String(entityId),
        payload: typeof payload === 'string' ? payload : JSON.stringify(payload),
        createdAt: Date.now(),
    };
    syncQueueMemory.push(item);

    if (sqliteDb) {
        try {
            const stmt = getPreparedStatement('INSERT INTO sync_queue (type, entityId, payload, createdAt) VALUES (?, ?, ?, ?)');
            if (stmt) {
                stmt.run(
                    item.type,
                    item.entityId,
                    item.payload,
                    Math.floor(item.createdAt / 1000)
                );
            }
        } catch (e) {
            console.error('[Database/SyncQueue] Erro ao gravar na sync_queue SQLite:', e.message);
        }
    }
}

/**
 * Retorna a quantidade de itens pendentes de sincronização
 */
function getSyncQueueSize() {
    let count = syncQueueMemory.length;
    if (sqliteDb) {
        try {
            const stmt = getPreparedStatement('SELECT COUNT(*) as cnt FROM sync_queue');
            const row = stmt ? stmt.get() : null;
            if (row && typeof row.cnt === 'number') {
                return row.cnt;
            }
        } catch (_) {}
    }
    return count;
}

/**
 * Descarrega os itens pendentes da fila para o Supabase
 */
async function flushSyncQueue() {
    if (!supabaseClient || isCircuitBreakerOpen() || isFlushingSyncQueue) {
        return { processed: 0 };
    }
    isFlushingSyncQueue = true;

    let processedCount = 0;

    try {
        let items = [];
        if (sqliteDb) {
            try {
                const stmt = getPreparedStatement('SELECT * FROM sync_queue ORDER BY id ASC LIMIT 50');
                const rows = stmt ? stmt.all() : [];
                if (rows && rows.length > 0) {
                    items = rows.map(r => ({
                        dbId: r.id,
                        type: r.type,
                        entityId: r.entityId,
                        payload: typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload,
                    }));
                }
            } catch (e) {
                console.error('[Database/SyncQueue] Erro ao ler sync_queue SQLite:', e.message);
            }
        }

        if (items.length === 0 && syncQueueMemory.length > 0) {
            const memItems = syncQueueMemory.splice(0, 50);
            items = memItems.map(item => ({
                type: item.type,
                entityId: item.entityId,
                payload: typeof item.payload === 'string' ? JSON.parse(item.payload) : item.payload,
            }));
        }

        for (const item of items) {
            try {
                if (item.type === 'UPDATE_USER') {
                    const { error } = await supabaseClient
                        .from('users')
                        .upsert({ userId: item.entityId, ...item.payload });
                    if (error) throw error;
                } else if (item.type === 'UPDATE_GUILD') {
                    const { error } = await supabaseClient
                        .from('guilds')
                        .upsert({ guildId: item.entityId, ...item.payload });
                    if (error) throw error;
                } else if (item.type === 'CREATE_REMINDER') {
                    const { error } = await supabaseClient
                        .from('reminders')
                        .upsert(item.payload);
                    if (error) throw error;
                } else if (item.type === 'COMPLETE_REMINDER') {
                    const { error } = await supabaseClient
                        .from('reminders')
                        .update({ completed: 1 })
                        .eq('id', item.entityId);
                    if (error) throw error;
                } else if (item.type === 'DELETE_REMINDER') {
                    const { error } = await supabaseClient
                        .from('reminders')
                        .delete()
                        .eq('id', item.entityId);
                    if (error) throw error;
                } else if (item.type === 'RECORD_COMMAND_USAGE') {
                    const { error } = await supabaseClient
                        .from('command_stats')
                        .upsert(item.payload);
                    if (error) throw error;
                }

                if (item.dbId && sqliteDb) {
                    try {
                        const delStmt = getPreparedStatement('DELETE FROM sync_queue WHERE id = ?');
                        if (delStmt) delStmt.run(item.dbId);
                    } catch (_) {}
                }
                processedCount++;
            } catch (err) {
                console.warn(`[Database/SyncQueue] Falha temporária ao sincronizar ${item.type} (${item.entityId}):`, err.message);
                break;
            }
        }

        if (processedCount > 0) {
            console.log(`[Database/SyncQueue] Sincronizados com sucesso ${processedCount} itens com o Supabase.`);
        }
    } finally {
        isFlushingSyncQueue = false;
    }

    return { processed: processedCount };
}

// Agenda varredura periódica de sincronização a cada 30 segundos
setInterval(() => {
    if (isSupabaseAvailable() && getSyncQueueSize() > 0) {
        flushSyncQueue().catch(() => null);
    }
}, 30000).unref();

function invalidateUserCache(userId) {
    if (userId) userCache.delete(userId);
}

function invalidateGuildCache(guildId) {
    if (guildId) guildCache.delete(guildId);
}

/**
 * Helper para criar ou retornar cliente Supabase
 */
function createSupabaseClient(url = process.env.SUPABASE_URL, key = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY) {
    if (!url || !key) return null;
    try {
        const { createClient } = require('@supabase/supabase-js');
        return createClient(url, key, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
            },
        });
    } catch (err) {
        console.error('[Database] Erro ao instanciar @supabase/supabase-js:', err.message);
        return null;
    }
}

/**
 * Inicializa o banco de dados (Supabase PostgreSQL ou Fallback SQLite/Memory)
 */
async function initDatabase() {
    if (isInitialized) {
        return { mode: databaseMode };
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
        try {
            supabaseClient = createSupabaseClient(supabaseUrl, supabaseKey);

            if (supabaseClient) {
                // Teste de conectividade com a tabela users
                const { data, error } = await supabaseClient
                    .from('users')
                    .select('userId')
                    .limit(1);

                if (error) {
                    console.warn('[Database] Conexão com Supabase retornou aviso/erro:', error.message);
                    console.warn('[Database] Alternando para modo SQLite local de contingência.');
                    initSqliteFallback();
                } else {
                    databaseMode = 'supabase';
                    console.log('[Database] Conectado ao Supabase PostgreSQL com sucesso!');
                    // Garantir que initSqliteFallback() seja inicializado mesmo quando o Supabase sobe com sucesso
                    initSqliteFallback();
                }
            } else {
                initSqliteFallback();
            }
        } catch (err) {
            console.error('[Database] Falha ao inicializar cliente Supabase:', err.message);
            console.warn('[Database] Ativando fallback SQLite local.');
            initSqliteFallback();
        }
    } else {
        console.log('[Database] Credenciais do Supabase ausentes no .env. Inicializando SQLite local / Memória.');
        initSqliteFallback();
    }

    isInitialized = true;
    return { mode: databaseMode };
}

/**
 * Retorna o modo atual de execução do banco de dados
 * @returns {'supabase' | 'sqlite' | 'memory'}
 */
function getDatabaseMode() {
    if (isCircuitBreakerOpen()) {
        return sqliteDb ? 'sqlite' : 'memory';
    }
    return databaseMode;
}

/**
 * Retorna os dados do usuário, criando registro padrão caso não exista
 * @param {string} userId
 * @returns {Promise<Object>}
 */
function getUser(userId) {
    if (!userId) return null;

    // Checagem em cache
    const cached = userCache.get(userId);
    if (cached && Date.now() - cached._cachedAt < CACHE_TTL_MS) {
        return normalizeUser(cached);
    }

    const defaultUser = {
        userId,
        tosVersion: 0,
        language: 'lang_auto',
        lastKnownLocale: null,
        badges: '[]',
        isDeveloper: 0,
    };

    if (isSupabaseAvailable()) {
        supabaseClient
            .from('users')
            .select('*')
            .eq('userId', userId)
            .maybeSingle()
            .then(({ data, error }) => {
                if (error) {
                    recordSupabaseFailure(error);
                } else {
                    recordSupabaseSuccess();
                    if (data) {
                        const normalized = normalizeUser(data);
                        userCache.set(userId, { ...normalized, _cachedAt: Date.now() });
                        updateFallbackUser(userId, normalized);
                    }
                }
            })
            .catch(err => {
                recordSupabaseFailure(err);
            });
    }

    return getFallbackUser(userId, defaultUser);
}

function getUserSync(userId) {
    if (!userId) return null;
    const cached = userCache.get(userId);
    if (cached) return normalizeUser(cached);
    const defaultUser = {
        userId,
        tosVersion: 0,
        language: 'lang_auto',
        lastKnownLocale: null,
        badges: '[]',
        isDeveloper: 0,
    };
    return getFallbackUser(userId, defaultUser);
}

function getFallbackUser(userId, defaultUser) {
    if (!sqliteDb) {
        initSqliteFallback();
    }
    if (sqliteDb) {
        try {
            const selectStmt = getPreparedStatement('SELECT * FROM users WHERE userId = ?');
            let user = selectStmt ? selectStmt.get(userId) : null;

            if (!user) {
                const insertStmt = getPreparedStatement('INSERT OR IGNORE INTO users (userId, tosVersion, language, lastKnownLocale, badges, isDeveloper) VALUES (?, ?, ?, ?, ?, ?)');
                if (insertStmt) {
                    insertStmt.run(userId, defaultUser.tosVersion, defaultUser.language, defaultUser.lastKnownLocale, defaultUser.badges, defaultUser.isDeveloper);
                }
                user = selectStmt ? selectStmt.get(userId) : null;
            }

            if (user) {
                const normalized = normalizeUser(user);
                userCache.set(userId, { ...normalized, _cachedAt: Date.now() });
                return normalized;
            }
        } catch (e) {
            console.error('[Database/SQLite] Erro ao consultar usuário:', e.message);
        }
    }

    // Modo memória
    if (!userCache.has(userId)) {
        const normalized = normalizeUser(defaultUser);
        userCache.set(userId, { ...normalized, _cachedAt: Date.now() });
    }
    return normalizeUser(userCache.get(userId));
}

/**
 * Atualiza um ou múltiplos campos de um usuário
 * @param {string} userId 
 * @param {string|Record<string, any>} columnOrObject 
 * @param {any} [value] 
 */
async function updateUser(userId, columnOrObject, value) {
    if (!userId) return;

    let updates = {};
    if (typeof columnOrObject === 'string') {
        updates[columnOrObject] = value;
    } else if (typeof columnOrObject === 'object' && columnOrObject !== null) {
        updates = { ...columnOrObject };
    }

    // Mapeamento de campos snake_case para camelCase
    const normalizedUpdates = {};
    for (const [k, v] of Object.entries(updates)) {
        if (k === 'user_id' || k === 'userId') normalizedUpdates.userId = v;
        else if (k === 'tos_version' || k === 'tosVersion') normalizedUpdates.tosVersion = v;
        else if (k === 'language') normalizedUpdates.language = v;
        else if (k === 'last_known_locale' || k === 'lastKnownLocale') normalizedUpdates.lastKnownLocale = v;
        else if (k === 'badges') normalizedUpdates.badges = v;
        else if (k === 'is_developer' || k === 'isDeveloper') normalizedUpdates.isDeveloper = v;
        else normalizedUpdates[k] = v;
    }

    // Atualiza cache em memória
    const existing = userCache.get(userId) || normalizeUser({ userId });
    const merged = normalizeUser({ ...existing, ...normalizedUpdates });
    userCache.set(userId, { ...merged, _cachedAt: Date.now() });

    if (isSupabaseAvailable()) {
        try {
            const { error } = await supabaseClient
                .from('users')
                .update(normalizedUpdates)
                .eq('userId', userId);

            if (error) {
                recordSupabaseFailure(error);
                console.error(`[Database/Supabase] Erro ao atualizar usuário ${userId}:`, error.message);
                enqueueSync('UPDATE_USER', userId, normalizedUpdates);
                updateFallbackUser(userId, normalizedUpdates);
            } else {
                recordSupabaseSuccess();
                updateFallbackUser(userId, normalizedUpdates);
            }
            return merged;
        } catch (err) {
            recordSupabaseFailure(err);
            console.error(`[Database/Supabase] Exceção em updateUser (${userId}):`, err.message);
            enqueueSync('UPDATE_USER', userId, normalizedUpdates);
            updateFallbackUser(userId, normalizedUpdates);
            return merged;
        }
    }

    enqueueSync('UPDATE_USER', userId, normalizedUpdates);
    updateFallbackUser(userId, normalizedUpdates);
    return merged;
}

function updateFallbackUser(userId, updates) {
    if (!sqliteDb) {
        initSqliteFallback();
    }
    if (sqliteDb) {
        try {
            const allowedColumns = ['tosVersion', 'language', 'lastKnownLocale', 'badges', 'isDeveloper'];
            const keys = Object.keys(updates).filter(k => allowedColumns.includes(k));

            // Ensure user exists in SQLite before UPDATE
            const checkStmt = getPreparedStatement('SELECT userId FROM users WHERE userId = ?');
            const existing = checkStmt ? checkStmt.get(userId) : null;
            if (!existing) {
                const defaultUser = userCache.get(userId) || normalizeUser({ userId });
                const insertStmt = getPreparedStatement('INSERT OR IGNORE INTO users (userId, tosVersion, language, lastKnownLocale, badges, isDeveloper) VALUES (?, ?, ?, ?, ?, ?)');
                if (insertStmt) {
                    insertStmt.run(
                        userId,
                        defaultUser.tosVersion !== undefined ? defaultUser.tosVersion : 0,
                        defaultUser.language || 'lang_auto',
                        defaultUser.lastKnownLocale || null,
                        typeof defaultUser.badges === 'string' ? defaultUser.badges : JSON.stringify(defaultUser.badges || []),
                        defaultUser.isDeveloper ? 1 : 0
                    );
                }
            }

            if (keys.length > 0) {
                const setClauses = keys.map(k => `${k} = ?`).join(', ');
                const values = keys.map(k => updates[k]);
                values.push(userId);

                const stmt = getPreparedStatement(`UPDATE users SET ${setClauses}, updatedAt = strftime('%s', 'now') WHERE userId = ?`);
                if (stmt) stmt.run(...values);
            }
        } catch (e) {
            console.error('[Database/SQLite] Erro ao atualizar usuário:', e.message);
        }
    }
}

/**
 * Define o último locale detectado do usuário
 * @param {string} userId 
 * @param {string} locale 
 */
async function setLastKnownLocale(userId, locale) {
    return updateUser(userId, 'lastKnownLocale', locale);
}

/**
 * Retorna dados de configuração da guilda/servidor
 * @param {string} guildId 
 * @returns {Promise<Object>}
 */
async function getGuild(guildId) {
    if (!guildId) return null;

    const cached = guildCache.get(guildId);
    if (cached && Date.now() - cached._cachedAt < CACHE_TTL_MS) {
        return normalizeGuild(cached);
    }

    const defaultGuild = {
        guildId,
        antiraidEnabled: 0,
        welcomeChannelId: null,
        goodbyeChannelId: null,
    };

    if (isSupabaseAvailable()) {
        try {
            const { data, error } = await supabaseClient
                .from('guilds')
                .select('*')
                .eq('guildId', guildId)
                .maybeSingle();

            if (error) {
                recordSupabaseFailure(error);
                console.error(`[Database/Supabase] Erro ao buscar guilda ${guildId}:`, error.message);
                return getFallbackGuild(guildId, defaultGuild);
            }

            recordSupabaseSuccess();
            if (data) {
                const normalized = normalizeGuild(data);
                guildCache.set(guildId, { ...normalized, _cachedAt: Date.now() });
                updateFallbackGuild(guildId, normalized);
                return normalized;
            }

            const insertPayload = {
                guildId,
                settings: JSON.stringify({
                    antiraidEnabled: defaultGuild.antiraidEnabled,
                    welcomeChannelId: defaultGuild.welcomeChannelId,
                    goodbyeChannelId: defaultGuild.goodbyeChannelId,
                }),
            };

            const { data: newGuild, error: insertError } = await supabaseClient
                .from('guilds')
                .insert([insertPayload])
                .select()
                .single();

            if (insertError) {
                recordSupabaseFailure(insertError);
                console.error(`[Database/Supabase] Erro ao inserir guilda ${guildId}:`, insertError.message);
                return getFallbackGuild(guildId, defaultGuild);
            }

            recordSupabaseSuccess();
            const normalized = normalizeGuild(newGuild);
            guildCache.set(guildId, { ...normalized, _cachedAt: Date.now() });
            updateFallbackGuild(guildId, normalized);
            return normalized;
        } catch (err) {
            recordSupabaseFailure(err);
            console.error(`[Database/Supabase] Exceção em getGuild (${guildId}):`, err.message);
            return getFallbackGuild(guildId, defaultGuild);
        }
    }

    return getFallbackGuild(guildId, defaultGuild);
}

function getFallbackGuild(guildId, defaultGuild) {
    if (!sqliteDb) {
        initSqliteFallback();
    }
    if (sqliteDb) {
        try {
            const selectStmt = getPreparedStatement('SELECT * FROM guilds WHERE guildId = ?');
            let guild = selectStmt ? selectStmt.get(guildId) : null;

            if (!guild) {
                const insertStmt = getPreparedStatement('INSERT OR IGNORE INTO guilds (guildId, antiraidEnabled, welcomeChannelId, goodbyeChannelId) VALUES (?, ?, ?, ?)');
                if (insertStmt) {
                    insertStmt.run(guildId, defaultGuild.antiraidEnabled, defaultGuild.welcomeChannelId, defaultGuild.goodbyeChannelId);
                }
                guild = selectStmt ? selectStmt.get(guildId) : null;
            }

            if (guild) {
                const normalized = normalizeGuild(guild);
                guildCache.set(guildId, { ...normalized, _cachedAt: Date.now() });
                return normalized;
            }
        } catch (e) {
            console.error('[Database/SQLite] Erro ao consultar guilda:', e.message);
        }
    }

    if (!guildCache.has(guildId)) {
        const normalized = normalizeGuild(defaultGuild);
        guildCache.set(guildId, { ...normalized, _cachedAt: Date.now() });
    }
    return normalizeGuild(guildCache.get(guildId));
}

/**
 * Atualiza configurações de uma guilda
 * @param {string} guildId 
 * @param {string|Record<string, any>} columnOrObject 
 * @param {any} [value] 
 */
async function updateGuild(guildId, columnOrObject, value) {
    if (!guildId) return;

    let updates = {};
    if (typeof columnOrObject === 'string') {
        updates[columnOrObject] = value;
    } else if (typeof columnOrObject === 'object' && columnOrObject !== null) {
        updates = { ...columnOrObject };
    }

    const normalizedUpdates = {};
    for (const [k, v] of Object.entries(updates)) {
        if (k === 'guild_id' || k === 'guildId') normalizedUpdates.guildId = v;
        else if (k === 'antiraid_enabled' || k === 'antiraidEnabled') normalizedUpdates.antiraidEnabled = v;
        else if (k === 'welcome_channel_id' || k === 'welcomeChannelId') normalizedUpdates.welcomeChannelId = v;
        else if (k === 'goodbye_channel_id' || k === 'goodbyeChannelId') normalizedUpdates.goodbyeChannelId = v;
        else normalizedUpdates[k] = v;
    }

    const existing = guildCache.get(guildId) || normalizeGuild({ guildId });
    const merged = normalizeGuild({ ...existing, ...normalizedUpdates });
    guildCache.set(guildId, { ...merged, _cachedAt: Date.now() });

    if (isSupabaseAvailable()) {
        try {
            let currentSettings = {};
            try {
                currentSettings = existing.settings ? (typeof existing.settings === 'string' ? JSON.parse(existing.settings) : existing.settings) : {};
            } catch (_) {}

            const updatedSettings = {
                ...currentSettings,
                antiraidEnabled: merged.antiraidEnabled,
                welcomeChannelId: merged.welcomeChannelId,
                goodbyeChannelId: merged.goodbyeChannelId,
            };

            const supabasePayload = {
                settings: JSON.stringify(updatedSettings),
            };
            if (normalizedUpdates.prefix !== undefined) supabasePayload.prefix = normalizedUpdates.prefix;
            if (normalizedUpdates.language !== undefined) supabasePayload.language = normalizedUpdates.language;
            if (normalizedUpdates.modLogChannel !== undefined) supabasePayload.modLogChannel = normalizedUpdates.modLogChannel;

            const { error } = await supabaseClient
                .from('guilds')
                .update(supabasePayload)
                .eq('guildId', guildId);

            if (error) {
                recordSupabaseFailure(error);
                console.error(`[Database/Supabase] Erro ao atualizar guilda ${guildId}:`, error.message);
                enqueueSync('UPDATE_GUILD', guildId, supabasePayload);
                updateFallbackGuild(guildId, normalizedUpdates);
            } else {
                recordSupabaseSuccess();
                updateFallbackGuild(guildId, normalizedUpdates);
            }
            return merged;
        } catch (err) {
            recordSupabaseFailure(err);
            console.error(`[Database/Supabase] Exceção em updateGuild (${guildId}):`, err.message);
            enqueueSync('UPDATE_GUILD', guildId, supabasePayload);
            updateFallbackGuild(guildId, normalizedUpdates);
            return merged;
        }
    }

    enqueueSync('UPDATE_GUILD', guildId, supabasePayload);
    updateFallbackGuild(guildId, normalizedUpdates);
    return merged;
}

function updateFallbackGuild(guildId, updates) {
    if (!sqliteDb) {
        initSqliteFallback();
    }
    if (sqliteDb) {
        try {
            const allowedColumns = ['antiraidEnabled', 'welcomeChannelId', 'goodbyeChannelId'];
            const keys = Object.keys(updates).filter(k => allowedColumns.includes(k));

            // Ensure guild exists in SQLite before UPDATE
            const checkStmt = getPreparedStatement('SELECT guildId FROM guilds WHERE guildId = ?');
            const existing = checkStmt ? checkStmt.get(guildId) : null;
            if (!existing) {
                const defaultGuild = guildCache.get(guildId) || normalizeGuild({ guildId });
                const insertStmt = getPreparedStatement('INSERT OR IGNORE INTO guilds (guildId, antiraidEnabled, welcomeChannelId, goodbyeChannelId) VALUES (?, ?, ?, ?)');
                if (insertStmt) {
                    insertStmt.run(
                        guildId,
                        defaultGuild.antiraidEnabled ? 1 : 0,
                        defaultGuild.welcomeChannelId || null,
                        defaultGuild.goodbyeChannelId || null
                    );
                }
            }

            if (keys.length > 0) {
                const setClauses = keys.map(k => `${k} = ?`).join(', ');
                const values = keys.map(k => updates[k]);
                values.push(guildId);

                const stmt = getPreparedStatement(`UPDATE guilds SET ${setClauses}, updatedAt = strftime('%s', 'now') WHERE guildId = ?`);
                if (stmt) stmt.run(...values);
            }
        } catch (e) {
            console.error('[Database/SQLite] Erro ao atualizar guilda:', e.message);
        }
    }
}

/**
 * Registra histórico de mensagens de IA
 * @param {string|Object} messageIdOrData 
 * @param {string} [userId] 
 * @param {'user'|'assistant'|'system'} [role] 
 * @param {string} [content] 
 * @param {number} [timestamp] 
 */
async function logAiHistory(messageIdOrData, userId, role, content, timestamp = Date.now()) {
    let record;
    if (typeof messageIdOrData === 'object' && messageIdOrData !== null) {
        record = {
            messageId: messageIdOrData.messageId || messageIdOrData.message_id,
            userId: messageIdOrData.userId || messageIdOrData.user_id,
            role: messageIdOrData.role,
            content: messageIdOrData.content,
            timestamp: messageIdOrData.timestamp || Date.now(),
        };
    } else {
        record = {
            messageId: messageIdOrData,
            userId,
            role,
            content,
            timestamp: timestamp || Date.now(),
        };
    }

    aiHistoryMemory.push(record);

    if (isSupabaseAvailable()) {
        try {
            const { error } = await supabaseClient
                .from('ai_history')
                .insert([record]);

            if (error) {
                recordSupabaseFailure(error);
                console.error('[Database/Supabase] Erro ao gravar ai_history:', error.message);
                logFallbackAiHistory(record);
            } else {
                recordSupabaseSuccess();
                logFallbackAiHistory(record);
            }
            return record;
        } catch (err) {
            recordSupabaseFailure(err);
            console.error('[Database/Supabase] Exceção em logAiHistory:', err.message);
            logFallbackAiHistory(record);
            return record;
        }
    }

    logFallbackAiHistory(record);
    return record;
}

function logFallbackAiHistory(record) {
    if (!sqliteDb) {
        initSqliteFallback();
    }
    if (sqliteDb) {
        try {
            const stmt = getPreparedStatement('INSERT OR REPLACE INTO ai_history (messageId, userId, role, content, timestamp) VALUES (?, ?, ?, ?, ?)');
            if (stmt) stmt.run(record.messageId, record.userId, record.role, record.content, record.timestamp);
        } catch (e) {
            console.error('[Database/SQLite] Erro ao registrar ai_history:', e.message);
        }
    }
}

/**
 * Cria um novo lembrete persistente
 * @param {Object} data 
 */
async function createReminder(data) {
    const reminder = normalizeReminder(data);
    remindersMemory.push(reminder);

    if (isSupabaseAvailable()) {
        try {
            const supabasePayload = {
                id: reminder.id,
                userId: reminder.userId,
                guildId: reminder.guildId,
                channelId: reminder.channelId,
                message: reminder.message,
                dueTimestamp: reminder.dueTimestamp,
                completed: reminder.completed,
                createdAt: reminder.createdAt,
            };

            const { error } = await supabaseClient
                .from('reminders')
                .insert([supabasePayload]);
            if (error) {
                recordSupabaseFailure(error);
                console.error('[Database/Supabase] Erro ao criar reminder:', error.message);
                enqueueSync('CREATE_REMINDER', reminder.id, supabasePayload);
                createFallbackReminder(reminder);
            } else {
                recordSupabaseSuccess();
                createFallbackReminder(reminder);
            }
            return reminder;
        } catch (err) {
            recordSupabaseFailure(err);
            console.error('[Database/Supabase] Exceção em createReminder:', err.message);
            enqueueSync('CREATE_REMINDER', reminder.id, supabasePayload);
            createFallbackReminder(reminder);
            return reminder;
        }
    }

    enqueueSync('CREATE_REMINDER', reminder.id, reminder);
    createFallbackReminder(reminder);
    return reminder;
}

function createFallbackReminder(reminder) {
    if (!sqliteDb) {
        initSqliteFallback();
    }
    if (sqliteDb) {
        try {
            const stmt = getPreparedStatement(`
                INSERT OR REPLACE INTO reminders (id, userId, guildId, channelId, message, dueTimestamp, createdAt, completed)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);
            if (stmt) {
                stmt.run(
                    reminder.id,
                    reminder.userId,
                    reminder.guildId,
                    reminder.channelId,
                    reminder.message,
                    reminder.dueTimestamp,
                    reminder.createdAt,
                    reminder.completed
                );
            }
        } catch (e) {
            console.error('[Database/SQLite] Erro ao registrar reminder:', e.message);
        }
    }
}

/**
 * Busca todos os lembretes pendentes não concluídos
 */
async function getPendingReminders() {
    let reminders = [];
    if (isSupabaseAvailable()) {
        try {
            const { data, error } = await supabaseClient
                .from('reminders')
                .select('*')
                .eq('completed', 0);
            if (!error && Array.isArray(data)) {
                recordSupabaseSuccess();
                reminders = data.map(normalizeReminder);
            } else if (error) {
                recordSupabaseFailure(error);
                console.error('[Database/Supabase] Erro em getPendingReminders:', error.message);
            }
        } catch (err) {
            recordSupabaseFailure(err);
            console.error('[Database/Supabase] Exceção em getPendingReminders:', err.message);
        }
    }

    if (reminders.length === 0) {
        if (!sqliteDb) {
            initSqliteFallback();
        }
        if (sqliteDb) {
            try {
                const stmt = getPreparedStatement('SELECT * FROM reminders WHERE completed = 0');
                const rows = stmt ? stmt.all() : [];
                if (rows && rows.length > 0) {
                    return rows.map(normalizeReminder);
                }
            } catch (e) {
                console.error('[Database/SQLite] Erro em getPendingReminders:', e.message);
            }
        }

        const memList = remindersMemory.filter(r => r.completed === 0).map(normalizeReminder);
        if (memList.length > 0) {
            return memList;
        }
    }

    return reminders;
}

/**
 * Busca lembretes de um usuário específico
 * @param {string} userId 
 */
async function getUserReminders(userId) {
    if (!userId) return [];

    let reminders = [];
    if (isSupabaseAvailable()) {
        try {
            const { data, error } = await supabaseClient
                .from('reminders')
                .select('*')
                .eq('userId', userId)
                .eq('completed', 0);
            if (!error && Array.isArray(data)) {
                recordSupabaseSuccess();
                reminders = data.map(normalizeReminder);
            } else if (error) {
                recordSupabaseFailure(error);
                console.error('[Database/Supabase] Erro em getUserReminders:', error.message);
            }
        } catch (err) {
            recordSupabaseFailure(err);
            console.error('[Database/Supabase] Exceção em getUserReminders:', err.message);
        }
    }

    if (reminders.length === 0) {
        if (!sqliteDb) {
            initSqliteFallback();
        }
        if (sqliteDb) {
            try {
                const stmt = getPreparedStatement('SELECT * FROM reminders WHERE userId = ? AND completed = 0');
                const rows = stmt ? stmt.all(userId) : [];
                if (rows && rows.length > 0) {
                    return rows.map(normalizeReminder);
                }
            } catch (e) {
                console.error('[Database/SQLite] Erro em getUserReminders:', e.message);
            }
        }

        const memReminders = remindersMemory.filter(r => r.userId === userId && r.completed === 0).map(normalizeReminder);
        if (memReminders.length > 0) {
            return memReminders;
        }
    }

    return reminders;
}

function completeFallbackReminder(id) {
    if (!sqliteDb) {
        initSqliteFallback();
    }
    if (sqliteDb) {
        try {
            const stmt = getPreparedStatement('UPDATE reminders SET completed = 1 WHERE id = ?');
            if (stmt) stmt.run(id);
        } catch (e) {
            console.error('[Database/SQLite] Erro ao completar reminder:', e.message);
        }
    }
}

/**
 * Marca um lembrete como concluído
 * @param {string} id 
 */
async function completeReminder(id) {
    if (!id) return;

    const mem = remindersMemory.find(r => r.id === id);
    if (mem) mem.completed = 1;

    if (isSupabaseAvailable()) {
        try {
            const { error } = await supabaseClient.from('reminders').update({ completed: 1 }).eq('id', id);
            if (error) {
                recordSupabaseFailure(error);
                console.error('[Database/Supabase] Erro ao completar reminder:', error.message);
                enqueueSync('COMPLETE_REMINDER', id, {});
            } else {
                recordSupabaseSuccess();
            }
        } catch (err) {
            recordSupabaseFailure(err);
            console.error('[Database/Supabase] Exceção em completeReminder:', err.message);
            enqueueSync('COMPLETE_REMINDER', id, {});
        }
    } else {
        enqueueSync('COMPLETE_REMINDER', id, {});
    }

    completeFallbackReminder(id);
}

function deleteFallbackReminder(id) {
    if (!sqliteDb) {
        initSqliteFallback();
    }
    if (sqliteDb) {
        try {
            const stmt = getPreparedStatement('DELETE FROM reminders WHERE id = ?');
            if (stmt) stmt.run(id);
        } catch (e) {
            console.error('[Database/SQLite] Erro ao deletar reminder do SQLite:', e.message);
        }
    }
}

/**
 * Deleta/cancela um lembrete
 * @param {string} id 
 */
async function deleteReminder(id) {
    if (!id) return;

    const idx = remindersMemory.findIndex(r => r.id === id);
    if (idx !== -1) remindersMemory.splice(idx, 1);

    if (isSupabaseAvailable()) {
        try {
            const { error } = await supabaseClient.from('reminders').delete().eq('id', id);
            if (error) {
                recordSupabaseFailure(error);
                console.error('[Database/Supabase] Erro ao deletar reminder:', error.message);
                enqueueSync('DELETE_REMINDER', id, {});
            } else {
                recordSupabaseSuccess();
            }
        } catch (err) {
            recordSupabaseFailure(err);
            console.error('[Database/Supabase] Exceção em deleteReminder:', err.message);
            enqueueSync('DELETE_REMINDER', id, {});
        }
    } else {
        enqueueSync('DELETE_REMINDER', id, {});
    }

    deleteFallbackReminder(id);
}

/**
 * Normaliza um registro de estatística de comando
 */
function normalizeCommandStat(raw) {
    if (!raw) return null;
    let users = [];
    if (raw.uniqueUsers) {
        if (typeof raw.uniqueUsers === 'string') {
            try {
                users = JSON.parse(raw.uniqueUsers);
            } catch (_) {
                users = [];
            }
        } else if (Array.isArray(raw.uniqueUsers)) {
            users = raw.uniqueUsers;
        } else if (raw.uniqueUsers instanceof Set) {
            users = Array.from(raw.uniqueUsers);
        }
    }
    if (!Array.isArray(users)) users = [];

    const executionCount = Number(raw.executionCount || 0);
    const uniqueUserCount = users.length;
    const lastUsedAt = Number(raw.lastUsedAt || 0);
    const commandName = String(raw.commandName || '');

    return {
        commandName,
        executionCount,
        uniqueUsers: users,
        uniqueUserCount,
        lastUsedAt,
    };
}

/**
 * Registra o uso de um comando no fallback local (SQLite / Memória)
 * @param {string} commandName Nome do comando
 * @param {string} [userId] ID do usuário
 */
function recordFallbackCommandUsage(commandName, userId) {
    if (!commandName) return null;
    const cmdName = String(commandName).trim();
    if (!cmdName) return null;

    const now = Date.now();
    let mem = commandStatsMemory.get(cmdName);
    if (!mem) {
        mem = {
            commandName: cmdName,
            executionCount: 0,
            uniqueUsers: [],
            lastUsedAt: 0,
        };
        commandStatsMemory.set(cmdName, mem);
    }
    mem.executionCount++;
    if (userId) {
        const uidStr = String(userId);
        if (!mem.uniqueUsers.includes(uidStr)) {
            mem.uniqueUsers.push(uidStr);
        }
    }
    mem.lastUsedAt = now;

    if (!sqliteDb) {
        initSqliteFallback();
    }
    if (sqliteDb) {
        try {
            const selectStmt = getPreparedStatement('SELECT commandName, executionCount, uniqueUsers, lastUsedAt FROM command_stats WHERE commandName = ?');
            const row = selectStmt ? selectStmt.get(cmdName) : null;
            if (row) {
                let users = [];
                try {
                    users = typeof row.uniqueUsers === 'string' ? JSON.parse(row.uniqueUsers) : (Array.isArray(row.uniqueUsers) ? row.uniqueUsers : []);
                } catch (_) {
                    users = [];
                }
                if (!Array.isArray(users)) users = [];
                if (userId && !users.includes(String(userId))) {
                    users.push(String(userId));
                }
                const newCount = (Number(row.executionCount) || 0) + 1;
                const updateStmt = getPreparedStatement('UPDATE command_stats SET executionCount = ?, uniqueUsers = ?, lastUsedAt = ? WHERE commandName = ?');
                if (updateStmt) {
                    updateStmt.run(newCount, JSON.stringify(users), now, cmdName);
                }
                mem.executionCount = newCount;
                mem.uniqueUsers = users;
            } else {
                const users = userId ? [String(userId)] : [];
                const insertStmt = getPreparedStatement('INSERT INTO command_stats (commandName, executionCount, uniqueUsers, lastUsedAt) VALUES (?, 1, ?, ?)');
                if (insertStmt) {
                    insertStmt.run(cmdName, JSON.stringify(users), now);
                }
            }
        } catch (e) {
            console.error('[Database/SQLite] Erro ao registrar command_stats:', e.message);
        }
    }

    return {
        commandName: cmdName,
        executionCount: mem.executionCount,
        uniqueUsers: mem.uniqueUsers,
        uniqueUserCount: mem.uniqueUsers.length,
        lastUsedAt: mem.lastUsedAt,
    };
}

/**
 * Registra o uso de um comando no banco de dados com suporte unificado Supabase, SQLite e Memória
 * @param {string} commandName Nome do comando
 * @param {string} [userId] ID do usuário executor
 * @returns {Promise<Object>}
 */
async function recordCommandUsage(commandName, userId) {
    if (!commandName) return null;
    const cmdName = String(commandName).trim();
    if (!cmdName) return null;

    const fallbackResult = recordFallbackCommandUsage(cmdName, userId);
    const now = Date.now();

    if (isSupabaseAvailable()) {
        try {
            const { data, error } = await supabaseClient
                .from('command_stats')
                .select('*')
                .eq('commandName', cmdName)
                .maybeSingle();

            if (error) {
                recordSupabaseFailure(error);
                console.error('[Database/Supabase] Erro ao consultar command_stats:', error.message);
                enqueueSync('RECORD_COMMAND_USAGE', cmdName, {
                    commandName: cmdName,
                    executionCount: fallbackResult.executionCount,
                    uniqueUsers: JSON.stringify(fallbackResult.uniqueUsers),
                    lastUsedAt: now,
                });
            } else {
                recordSupabaseSuccess();
                let users = [];
                let count = 0;
                if (data) {
                    try {
                        users = typeof data.uniqueUsers === 'string' ? JSON.parse(data.uniqueUsers) : (Array.isArray(data.uniqueUsers) ? data.uniqueUsers : []);
                    } catch (_) {
                        users = [];
                    }
                    if (!Array.isArray(users)) users = [];
                    count = Number(data.executionCount) || 0;
                }
                count++;
                if (userId && !users.includes(String(userId))) {
                    users.push(String(userId));
                }

                for (const u of fallbackResult.uniqueUsers) {
                    if (!users.includes(u)) users.push(u);
                }
                const maxCount = Math.max(count, fallbackResult.executionCount);

                const payload = {
                    commandName: cmdName,
                    executionCount: maxCount,
                    uniqueUsers: JSON.stringify(users),
                    lastUsedAt: now,
                };

                const { error: upsertErr } = await supabaseClient
                    .from('command_stats')
                    .upsert(payload);

                if (upsertErr) {
                    recordSupabaseFailure(upsertErr);
                    console.error('[Database/Supabase] Erro ao gravar command_stats:', upsertErr.message);
                    enqueueSync('RECORD_COMMAND_USAGE', cmdName, payload);
                } else {
                    recordSupabaseSuccess();
                    const mem = commandStatsMemory.get(cmdName);
                    if (mem) {
                        mem.executionCount = maxCount;
                        mem.uniqueUsers = users;
                        mem.lastUsedAt = now;
                    }
                    return {
                        commandName: cmdName,
                        executionCount: maxCount,
                        uniqueUserCount: users.length,
                        lastUsedAt: now,
                    };
                }
            }
        } catch (err) {
            recordSupabaseFailure(err);
            console.error('[Database/Supabase] Exceção em recordCommandUsage:', err.message);
            enqueueSync('RECORD_COMMAND_USAGE', cmdName, {
                commandName: cmdName,
                executionCount: fallbackResult.executionCount,
                uniqueUsers: JSON.stringify(fallbackResult.uniqueUsers),
                lastUsedAt: now,
            });
        }
    } else {
        enqueueSync('RECORD_COMMAND_USAGE', cmdName, {
            commandName: cmdName,
            executionCount: fallbackResult.executionCount,
            uniqueUsers: JSON.stringify(fallbackResult.uniqueUsers),
            lastUsedAt: now,
        });
    }

    return {
        commandName: cmdName,
        executionCount: fallbackResult.executionCount,
        uniqueUserCount: fallbackResult.uniqueUserCount,
        lastUsedAt: fallbackResult.lastUsedAt,
    };
}

/**
 * Retorna estatísticas de comandos locais (SQLite / Memória)
 * @returns {Array<{ commandName: string, executionCount: number, uniqueUserCount: number, lastUsedAt: number }>}
 */
function getFallbackCommandStats() {
    let stats = [];
    if (!sqliteDb) {
        initSqliteFallback();
    }
    if (sqliteDb) {
        try {
            const stmt = getPreparedStatement('SELECT * FROM command_stats ORDER BY executionCount DESC');
            const rows = stmt ? stmt.all() : [];
            if (rows && rows.length > 0) {
                stats = rows.map(normalizeCommandStat).filter(Boolean);
            }
        } catch (e) {
            console.error('[Database/SQLite] Erro em getFallbackCommandStats:', e.message);
        }
    }

    if (stats.length === 0 && commandStatsMemory.size > 0) {
        stats = Array.from(commandStatsMemory.values())
            .map(normalizeCommandStat)
            .filter(Boolean);
    }

    stats.sort((a, b) => b.executionCount - a.executionCount);

    return stats.map(s => ({
        commandName: s.commandName,
        executionCount: s.executionCount,
        uniqueUserCount: s.uniqueUserCount,
        lastUsedAt: s.lastUsedAt,
    }));
}

/**
 * Retorna todas as estatísticas de comandos ordenadas por executionCount decrescente
 * @returns {Promise<Array<{ commandName: string, executionCount: number, uniqueUserCount: number, lastUsedAt: number }>>}
 */
async function getCommandStats() {
    let stats = [];

    if (isSupabaseAvailable()) {
        try {
            const { data, error } = await supabaseClient
                .from('command_stats')
                .select('*')
                .order('executionCount', { ascending: false });

            if (!error && Array.isArray(data) && data.length > 0) {
                recordSupabaseSuccess();
                stats = data.map(normalizeCommandStat).filter(Boolean);
            } else if (error) {
                recordSupabaseFailure(error);
                console.error('[Database/Supabase] Erro em getCommandStats:', error.message);
            }
        } catch (err) {
            recordSupabaseFailure(err);
            console.error('[Database/Supabase] Exceção em getCommandStats:', err.message);
        }
    }

    if (stats.length === 0) {
        return getFallbackCommandStats();
    }

    stats.sort((a, b) => b.executionCount - a.executionCount);

    return stats.map(s => ({
        commandName: s.commandName,
        executionCount: s.executionCount,
        uniqueUserCount: s.uniqueUserCount,
        lastUsedAt: s.lastUsedAt,
    }));
}

function closeDatabase() {
    sqliteInitAttempted = false;
    preparedStatements.clear();
    if (sqliteDb && typeof sqliteDb.close === 'function') {
        try {
            sqliteDb.close();
            console.log('[Database] Conexão SQLite fechada com sucesso.');
        } catch (err) {
            console.error('[Database] Erro ao fechar SQLite:', err.message);
        }
    }
    sqliteDb = null;
}

// Auto-inicialização assíncrona não bloqueante
initDatabase().catch(err => console.error('[Database] Falha na auto-inicialização:', err));

module.exports = {
    initDatabase,
    closeDatabase,
    getDatabaseMode,
    getUser,
    getUserSync,
    updateUser,
    setLastKnownLocale,
    getGuild,
    updateGuild,
    logAiHistory,
    createReminder,
    getPendingReminders,
    getUserReminders,
    completeReminder,
    deleteReminder,
    createSupabaseClient,
    initSqliteFallback,
    updateFallbackUser,
    updateFallbackGuild,
    logFallbackAiHistory,
    createFallbackReminder,
    deleteFallbackReminder,
    completeFallbackReminder,
    recordCommandUsage,
    getCommandStats,
    recordFallbackCommandUsage,
    getFallbackCommandStats,
    isCircuitBreakerOpen,
    recordSupabaseFailure,
    recordSupabaseSuccess,
    enqueueSync,
    flushSyncQueue,
    getSyncQueueSize,
    invalidateUserCache,
    invalidateGuildCache,
    get db() {
        return sqliteDb;
    },
    get supabase() {
        return supabaseClient;
    }
};
