-- =============================================================================
-- BINDER'S SERVER TOOLS - DATABASE SCHEMA (PostgreSQL / Supabase & SQLite)
-- =============================================================================

-- =============================================================================
-- 1. SUPABASE POSTGRESQL SCHEMA (Cloud Production)
-- =============================================================================

-- Table: users
-- Stores user preferences, accepted ToS version, language and permissions.
CREATE TABLE IF NOT EXISTS public.users (
    "userId" VARCHAR(32) PRIMARY KEY,
    "tosVersion" INTEGER NOT NULL DEFAULT 0,
    "language" VARCHAR(32) NOT NULL DEFAULT 'lang_auto',
    "lastKnownLocale" VARCHAR(32),
    "badges" TEXT DEFAULT '[]',
    "isDeveloper" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_userId ON public.users ("userId");
CREATE INDEX IF NOT EXISTS idx_users_tosVersion ON public.users ("tosVersion");

-- Table: guilds
-- Stores server-level configurations (anti-raid, welcome/goodbye channels).
CREATE TABLE IF NOT EXISTS public.guilds (
    "guildId" VARCHAR(32) PRIMARY KEY,
    "antiraidEnabled" INTEGER NOT NULL DEFAULT 0,
    "welcomeChannelId" VARCHAR(32),
    "goodbyeChannelId" VARCHAR(32),
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guilds_guildId ON public.guilds ("guildId");

-- Table: ai_history
-- Stores conversation and interaction logs.
CREATE TABLE IF NOT EXISTS public.ai_history (
    "messageId" VARCHAR(64) PRIMARY KEY,
    "userId" VARCHAR(32) NOT NULL,
    "role" VARCHAR(32) NOT NULL,
    "content" TEXT NOT NULL,
    "timestamp" BIGINT NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_history_userId ON public.ai_history ("userId");
CREATE INDEX IF NOT EXISTS idx_ai_history_timestamp ON public.ai_history ("timestamp" DESC);

-- Automatic updatedAt timestamp trigger for PostgreSQL
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_users_updated_at ON public.users;
CREATE TRIGGER tr_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_guilds_updated_at ON public.guilds;
CREATE TRIGGER tr_guilds_updated_at
BEFORE UPDATE ON public.guilds
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- 2. SQLITE SCHEMA (Local / Offline Fallback)
-- =============================================================================
/*
CREATE TABLE IF NOT EXISTS users (
    userId TEXT PRIMARY KEY,
    tosVersion INTEGER NOT NULL DEFAULT 0,
    language TEXT NOT NULL DEFAULT 'lang_auto',
    lastKnownLocale TEXT,
    badges TEXT DEFAULT '[]',
    isDeveloper INTEGER NOT NULL DEFAULT 0,
    createdAt INTEGER DEFAULT (strftime('%s', 'now')),
    updatedAt INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE TABLE IF NOT EXISTS guilds (
    guildId TEXT PRIMARY KEY,
    antiraidEnabled INTEGER NOT NULL DEFAULT 0,
    welcomeChannelId TEXT,
    goodbyeChannelId TEXT,
    createdAt INTEGER DEFAULT (strftime('%s', 'now')),
    updatedAt INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE TABLE IF NOT EXISTS ai_history (
    messageId TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    createdAt INTEGER DEFAULT (strftime('%s', 'now'))
);
*/
