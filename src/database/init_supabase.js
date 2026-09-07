/**
 * @file init_supabase.js
 * @description PostgreSQL Schema initializer for Supabase
 */

const { Client } = require('pg');
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    console.error('[Supabase/Migration] DATABASE_URL ausente nas variáveis de ambiente (.env).');
    process.exit(1);
}

async function initSupabase() {
    console.log('[Supabase/Migration] Conectando ao PostgreSQL via Pooler IPv4 (us-west-2)...');

    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('[Supabase/Migration] Conectado com sucesso ao Supabase PostgreSQL!');

        // 1. Tabela users
        await client.query(`
            CREATE TABLE IF NOT EXISTS public.users (
                "userId" TEXT PRIMARY KEY,
                "tosVersion" INT NOT NULL DEFAULT 0,
                "language" TEXT NOT NULL DEFAULT 'lang_auto',
                "lastKnownLocale" TEXT,
                "badges" TEXT DEFAULT '[]',
                "isDeveloper" INT NOT NULL DEFAULT 0,
                "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        `);
        console.log('[Supabase/Migration] ✓ Tabela "users" configurada.');

        // 2. Tabela reminders
        await client.query(`
            CREATE TABLE IF NOT EXISTS public.reminders (
                "id" TEXT PRIMARY KEY,
                "userId" TEXT NOT NULL,
                "guildId" TEXT,
                "channelId" TEXT,
                "message" TEXT NOT NULL,
                "dueTimestamp" BIGINT NOT NULL,
                "completed" INT NOT NULL DEFAULT 0,
                "createdAt" BIGINT NOT NULL
            );
        `);
        console.log('[Supabase/Migration] ✓ Tabela "reminders" configurada.');

        // 3. Tabela guilds
        await client.query(`
            CREATE TABLE IF NOT EXISTS public.guilds (
                "guildId" TEXT PRIMARY KEY,
                "prefix" TEXT DEFAULT '!',
                "modLogChannel" TEXT,
                "language" TEXT DEFAULT 'lang_auto',
                "settings" TEXT DEFAULT '{}',
                "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        `);
        console.log('[Supabase/Migration] ✓ Tabela "guilds" configurada.');

        // 4. Tabela bot_logs (sistema de logs estruturado)
        await client.query(`
            CREATE TABLE IF NOT EXISTS public.bot_logs (
                "id" SERIAL PRIMARY KEY,
                "timestamp" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                "level" TEXT NOT NULL,
                "category" TEXT NOT NULL,
                "message" TEXT NOT NULL,
                "metadata" JSONB DEFAULT '{}'::jsonb
            );
        `);
        console.log('[Supabase/Migration] ✓ Tabela "bot_logs" configurada.');

        // 5. RLS (Row Level Security) e Politicas
        await client.query(`
            ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
            ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
            ALTER TABLE public.guilds ENABLE ROW LEVEL SECURITY;
            ALTER TABLE public.bot_logs ENABLE ROW LEVEL SECURITY;

            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read-write for bot') THEN
                    CREATE POLICY "Allow public read-write for bot" ON public.users FOR ALL USING (true) WITH CHECK (true);
                    CREATE POLICY "Allow public read-write for bot" ON public.reminders FOR ALL USING (true) WITH CHECK (true);
                    CREATE POLICY "Allow public read-write for bot" ON public.guilds FOR ALL USING (true) WITH CHECK (true);
                    CREATE POLICY "Allow public read-write for bot" ON public.bot_logs FOR ALL USING (true) WITH CHECK (true);
                END IF;
            END
            $$;
        `);
        console.log('[Supabase/Migration] ✓ Políticas RLS aplicadas.');

        const res = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public';
        `);
        console.log('[Supabase/Migration] Tabelas ativas no Supabase:', res.rows.map(r => r.table_name));

    } catch (err) {
        console.error('[Supabase/Migration] Erro:', err);
        throw err;
    } finally {
        await client.end();
    }
}

if (require.main === module) {
    initSupabase().then(() => {
        console.log('[Supabase/Migration] Concluído com êxito!');
        process.exit(0);
    }).catch(err => {
        console.error('[Supabase/Migration] Falha:', err);
        process.exit(1);
    });
}

module.exports = initSupabase;
