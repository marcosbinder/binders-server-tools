/**
 * @file migrate_sqlite_to_supabase.js
 * @description Migration script to import data from legacy SQLite database into Supabase PostgreSQL
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    console.error('[Migrator] DATABASE_URL ausente nas variáveis de ambiente (.env).');
    process.exit(1);
}

async function migrateSqliteToSupabase(sqliteFilePath) {
    const targetPath = sqliteFilePath || path.join(__dirname, 'database.sqlite');
    console.log('[Migrator] Verificando arquivo SQLite em:', targetPath);

    if (!fs.existsSync(targetPath)) {
        console.warn(`[Migrator] Arquivo SQLite não encontrado em: ${targetPath}`);
        console.log('[Migrator] Dica: Para migrar a DB antiga, copie o arquivo .db ou .sqlite para esta pasta e execute:');
        console.log(`[Migrator] node src/database/migrate_sqlite_to_supabase.js <caminho_do_arquivo.sqlite>`);
        return;
    }

    let sqliteDb;
    try {
        const Database = require('better-sqlite3');
        sqliteDb = new Database(targetPath, { readonly: true });
    } catch (err) {
        console.error('[Migrator] Falha ao carregar better-sqlite3:', err.message);
        return;
    }

    console.log('[Migrator] Conectando ao Supabase PostgreSQL...');
    const pgClient = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });
    await pgClient.connect();

    try {
        // 1. Listar todas as tabelas do SQLite
        const tables = sqliteDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
        console.log('[Migrator] Tabelas encontradas no SQLite legado:', tables.map(t => t.name));

        const migrationReport = {
            recovered: {},
            discarded: []
        };

        for (const { name } of tables) {
            const count = sqliteDb.prepare(`SELECT count(*) as total FROM "${name}"`).get().total;
            console.log(`[Migrator] Tabela "${name}": ${count} registros encontrados.`);

            if (name === 'users') {
                const rows = sqliteDb.prepare('SELECT * FROM users').all();
                let imported = 0;
                for (const row of rows) {
                    await pgClient.query(`
                        INSERT INTO public.users ("userId", "tosVersion", "language", "lastKnownLocale", "badges", "isDeveloper")
                        VALUES ($1, $2, $3, $4, $5, $6)
                        ON CONFLICT ("userId") DO UPDATE SET
                            "tosVersion" = EXCLUDED."tosVersion",
                            "language" = EXCLUDED."language",
                            "lastKnownLocale" = EXCLUDED."lastKnownLocale",
                            "badges" = EXCLUDED."badges",
                            "isDeveloper" = EXCLUDED."isDeveloper",
                            "updated_at" = NOW();
                    `, [
                        row.userId || row.id,
                        row.tosVersion !== undefined ? row.tosVersion : 0,
                        row.language || 'lang_auto',
                        row.lastKnownLocale || null,
                        typeof row.badges === 'string' ? row.badges : JSON.stringify(row.badges || []),
                        row.isDeveloper ? 1 : 0
                    ]);
                    imported++;
                }
                migrationReport.recovered['users'] = imported;
                console.log(`[Migrator] ✓ ${imported} usuários migrados para Supabase.`);
            } else if (name === 'reminders' || name === 'lembretes') {
                const rows = sqliteDb.prepare(`SELECT * FROM "${name}"`).all();
                let imported = 0;
                for (const row of rows) {
                    await pgClient.query(`
                        INSERT INTO public.reminders ("id", "userId", "guildId", "channelId", "message", "dueTimestamp", "completed", "createdAt")
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                        ON CONFLICT ("id") DO UPDATE SET
                            "completed" = EXCLUDED."completed";
                    `, [
                        row.id,
                        row.userId,
                        row.guildId || null,
                        row.channelId || null,
                        row.message,
                        row.dueTimestamp,
                        row.completed ? 1 : 0,
                        row.createdAt || Date.now()
                    ]);
                    imported++;
                }
                migrationReport.recovered['reminders'] = imported;
                console.log(`[Migrator] ✓ ${imported} lembretes migrados para Supabase.`);
            } else if (name === 'guilds' || name === 'servers') {
                const rows = sqliteDb.prepare(`SELECT * FROM "${name}"`).all();
                let imported = 0;
                for (const row of rows) {
                    await pgClient.query(`
                        INSERT INTO public.guilds ("guildId", "prefix", "modLogChannel", "language", "settings")
                        VALUES ($1, $2, $3, $4, $5)
                        ON CONFLICT ("guildId") DO UPDATE SET
                            "prefix" = EXCLUDED."prefix",
                            "modLogChannel" = EXCLUDED."modLogChannel",
                            "language" = EXCLUDED."language",
                            "settings" = EXCLUDED."settings",
                            "updated_at" = NOW();
                    `, [
                        row.guildId || row.id,
                        row.prefix || '!',
                        row.modLogChannel || null,
                        row.language || 'lang_auto',
                        typeof row.settings === 'string' ? row.settings : JSON.stringify(row.settings || {})
                    ]);
                    imported++;
                }
                migrationReport.recovered['guilds'] = imported;
                console.log(`[Migrator] ✓ ${imported} servidores migrados para Supabase.`);
            } else {
                migrationReport.discarded.push({ table: name, rows: count });
                console.log(`[Migrator] ℹ Tabela obsoleta/descartada: "${name}" (${count} linhas ignoradas).`);
            }
        }

        console.log('\n=============================================');
        console.log('RELATÓRIO FINAL DE MIGRAÇÃO SQLITE → SUPABASE');
        console.log('=============================================');
        console.log('Tabelas Recuperadas:', migrationReport.recovered);
        console.log('Tabelas Descartadas:', migrationReport.discarded);
        console.log('=============================================\n');

    } catch (e) {
        console.error('[Migrator] Erro durante a migração:', e);
    } finally {
        sqliteDb.close();
        await pgClient.end();
    }
}

if (require.main === module) {
    const filePath = process.argv[2];
    migrateSqliteToSupabase(filePath).then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = migrateSqliteToSupabase;
