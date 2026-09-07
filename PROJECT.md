# PROJECT.md — Binder's Server Tools Architecture & Roadmap

## 1. Executive Summary & System Overview

**Binder's Server Tools** is a modern, production-grade Discord.js (v14) multifunctional bot crafted for community administration, rich user profiling, music lookup, interactive onboarding, and server moderation.

This project modernizes the bot architecture by introducing:
- **Cloud Database Integration**: Primary PostgreSQL persistence via Supabase (`@supabase/supabase-js`) with an automated local SQLite (`better-sqlite3`) fallback for zero-downtime offline development and Discloud cloud hosting.
- **Centralized Configuration**: Full extraction of hardcoded identifiers, emojis, webhooks, and URLs into unified modules with Unicode fallbacks.
- **Discord Components V2 & Context Menus**: Right-click User and Message context menus, interactive categorized help menus (`/ajuda`), and bilingual (pt-BR / en-US) experience.
- **Multi-Provider Music Information**: Resilient track lookups across iTunes Search API, public Spotify metadata, and Deezer API with automatic fallbacks.
- **Observability & Anti-Spam Protections**: In-memory rate limiting and dedicated webhook pipelines for feedback, bug reports, errors, and lifecycle status.

---

## 2. Global Architecture & Tech Stack

```
                     +---------------------------------------------+
                     |                Discord API                  |
                     |  (Slash Commands, Context Menus, Events)    |
                     +----------------------+----------------------+
                                            |
                                            v
+-----------------------------------------------------------------------------------+
|                           Binder's Server Tools Core                              |
|                                                                                   |
|  +---------------------+   +-----------------------+   +-----------------------+  |
|  |   Event Dispatcher  |   | Interaction Router    |   | Anti-Spam / RateLimit |  |
|  |  (ready, messages)  |   | (cmds, buttons, ctx)  |   |  (in-memory bucket)   |  |
|  +---------------------+   +-----------------------+   +-----------------------+  |
|                                        |                                          |
|  +-----------------------------------------------------------------------------+  |
|  |                             Feature Handlers                                |  |
|  |  [ToS Onboarding]  [/ajuda Help]  [Context Menus]  [/musica]  [Feedback/Bugs]|  |
|  +-----------------------------------------------------------------------------+  |
|                                        |                                          |
|  +-------------------------------------+---------------------------------------+  |
|  |                         Central Config Layer                                |  |
|  |        (emojis.js, urls.js, colors.js, constants.js, index.js)              |  |
|  +-------------------------------------+---------------------------------------+  |
|                                        |                                          |
|  +-------------------------------------+---------------------------------------+  |
|  |                    Unified Database Layer (db.js)                           |  |
|  |      - Supabase (@supabase/supabase-js) [Primary Cloud PostgreSQL]         |  |
|  |      - SQLite (better-sqlite3) [Automatic Local & Offline Contingency]     |  |
|  +-----------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------+
```

### Core Technologies
- **Runtime**: Node.js >= 18.0.0
- **Bot Framework**: `discord.js` v14.15.3+ (Gateway Intents: Guilds, GuildMessages, MessageContent, GuildMembers, DirectMessages; Partials: Channel)
- **Primary Cloud Database**: Supabase PostgreSQL (`@supabase/supabase-js` v2.45.0+)
- **Fallback Local Database**: `better-sqlite3` v11.1.2+ with daily backups
- **External Webhooks**: Discord WebhookClient for structured logging and triage
- **Music APIs**: iTunes Search API, Deezer Search API, Spotify oEmbed API

---

## 3. Feature Inventory & Requirements Breakdown

### R1. Database Migration & Cloud Hosting Compatibility
- Unified asynchronous database interface supporting Cloud Supabase PostgreSQL and local SQLite fallback.
- Schemas for user preferences (`userId`, `tosVersion`, `language`, `lastKnownLocale`, `badges`, `isDeveloper`), guild configurations (`guildId`, `antiraidEnabled`, `welcomeChannelId`, `goodbyeChannelId`), and AI chat history (`ai_history`).
- Automated in-memory caching layer with TTL to prevent redundant database network roundtrips.

### R2. Centralized Configuration & Security Hardening
- Modular configuration directory `src/config/` (`index.js`, `emojis.js`, `urls.js`, `colors.js`, `constants.js`).
- Complete Unicode fallbacks for all custom emojis.
- Security-hardened `.gitignore` and comprehensive `.env.example`.

### R3. Interactive Help Menu & UI Glow-Up (Components V2 Style)
- Re-architect `/ajuda` command with category select menus:
  - `sistema`: Core bot commands, language customization, ping/uptime.
  - `utilidades`: Music search, userinfo, messageinfo, avatar lookups.
  - `moderacao`: Server management, anti-raid, kick, ban, timeout, clear.
- Interactive category switching with dynamic components.
- Connect mention "Ver comandos" button (`show_help_menu`) to full interactive menu.

### R4. Context Menus & User Profile Enhancements
- Discord Right-Click Context Menus:
  - User Context Menu: `Informações do Usuário` (User Info).
  - Message Context Menu: `Informações da Mensagem` (Message Info).
- Rich profile display: Server join date, Discord creation date, booster status, key guild permissions, badge rendering, and avatar/banner view buttons.

### R5. Music Information Lookup
- Slash command `/musica <termo>`: Queries track metadata across multiple providers with automatic fallbacks:
  1. iTunes Search API (primary high-fidelity metadata + 1000x1000 artwork + 30s audio preview).
  2. Spotify Public oEmbed API (metadata & cover fallback).
  3. Deezer API (metadata & preview fallback).
- Rich embed with duration, album title, artist name, release year, preview link button, and artwork.

### R6. Safety, Feedback & Anti-Spam Protections
- In-memory rate-limiter for slash commands (3s) and buttons/select menus (1.5s).
- Ephemeral warnings upon spam without crashing or dropping interactions.
- Commands `/feedback` and `/bugreport` delivering formatted embeds to dedicated Discord webhooks (`WEBHOOK_FEEDBACK`, `WEBHOOK_BUGS`).

### R7. Onboarding & Terms of Service Flow
- Refactored Terms of Service acceptance gate:
  - First-time users (`tosVersion === 0`) greeted with ToS acceptance + interactive language selector (`pt-BR` / `en-US` / `Auto`).
  - Outdated ToS users prompted to accept updated terms before executing protected commands.
  - Ephemeral message updates for seamless UX.

---

## 4. Milestone Breakdown & Delivery Roadmap

| Milestone | Scope & Requirements | Target Deliverables |
|---|---|---|
| **Milestone 1** | **Database Migration & Centralized Configuration (R1, R2)** | `src/database/db.js`, `src/config/*`, `.env.example`, `.gitignore`, `PROJECT.md` |
| **Milestone 2** | **Onboarding, Safety & Anti-Spam Webhooks (R6, R7)** | `tosCheck.js`, `rateLimiter.js`, `/feedback`, `/bugreport`, webhook dispatchers |
| **Milestone 3** | **Interactive Help Menu & Components V2 (R3)** | `/ajuda`, `show_help_menu` interaction, categorized embed builder |
| **Milestone 4** | **Context Menus & User/Message Profiling (R4)** | User context menu, Message context menu, member badges/permissions resolver |
| **Milestone 5** | **Music Metadata Engine & Command (R5)** | `/musica`, multi-provider music resolver (iTunes/Spotify/Deezer), embed renderer |

---

## 5. Repository Directory & Code Layout Architecture

```
binders-server-tools/
├── assets/                          # Static media, icons, and banners
│   ├── Emojis/                      # Custom emoji icon files
│   └── banner.png                   # Official banner asset
├── database/                        # Local database files (Git ignored)
│   ├── backups/                     # Daily SQLite backups
│   ├── db.js                        # Backward compatible database entrypoint
│   ├── main.db                      # Local SQLite file
│   └── schema.sql                   # Database DDL schema for PostgreSQL and SQLite
├── src/
│   ├── commands/                    # Slash Commands & Context Menus
│   │   ├── binder.js                # Core /binder management command
│   │   ├── ajuda.js                 # Interactive help menu (/ajuda)
│   │   ├── musica.js                # Music information lookup (/musica)
│   │   ├── feedback.js              # User feedback submission (/feedback)
│   │   ├── bugreport.js             # Bug reporting command (/bugreport)
│   │   ├── contextUser.js           # User right-click context menu
│   │   └── contextMessage.js        # Message right-click context menu
│   ├── config/                      # Centralized Configuration Modules
│   │   ├── index.js                 # Config aggregator & environment validator
│   │   ├── emojis.js                # Custom emojis + Unicode fallbacks
│   │   ├── urls.js                  # Official URLs & API endpoints
│   │   ├── colors.js                # Embed color palette
│   │   ├── constants.js             # Rate limits, ToS, categories, constraints
│   │   └── config.js                # Backward compatible config entrypoint
│   ├── database/                    # Database Integration Layer
│   │   └── db.js                    # Supabase + SQLite fallback unified async CRUD
│   ├── events/                      # Discord Gateway Event Listeners
│   │   ├── ready.js                 # Bot login & presence loop
│   │   ├── interactionHandler.js    # Interaction routing & rate-limiting
│   │   └── messageCreate.js         # Mention handler & DM listener
│   ├── interactions/                # Component Handlers
│   │   ├── buttons/                 # Button click handlers
│   │   │   ├── show_help_menu.js    # Renders interactive help menu
│   │   │   └── tos_accept.js        # ToS agreement trigger
│   │   └── selects/                 # Select menu handlers
│   │       ├── ajuda_category.js    # Help category switcher
│   │       ├── botinfo_nav.js       # Bot info tab navigator
│   │       └── lang_select.js       # Language preference selector
│   ├── subcommands/                 # Subcommand modular implementations
│   │   └── binder/
│   │       ├── bot/                 # /binder bot info subcommands
│   │       └── personalizacao/      # /binder personalizacao idioma subcommands
│   └── utils/                       # Shared Utilities & Helpers
│       ├── createEmbed.js           # Consistent EmbedBuilder factory
│       ├── getLanguage.js           # Locale resolver (pt-BR / en-US / auto)
│       ├── tosCheck.js              # ToS acceptance gatekeeper
│       ├── rateLimiter.js           # In-memory interaction anti-spam limiter
│       ├── logHandler.js            # Error webhook reporter
│       ├── lifecycleLogger.js       # Bot online/offline webhook reporter
│       └── musicProvider.js         # Multi-provider music lookup service
├── .env.example                     # Fully documented environment template
├── .gitignore                       # Security hardened ignore list
├── deploy-commands.js               # Discord REST command registration script
├── index.js                         # Application entrypoint
├── package.json                     # Project manifest & dependencies
└── PROJECT.md                       # Master architecture documentation
```

---

## 6. Verification & Quality Gates

To ensure reliable, crash-resilient code:
1. **Schema & CRUD Verification**:
   - Verify SQLite table creation and auto-insert defaults.
   - Verify Supabase PostgreSQL table schema and connectivity when credentials are supplied.
   - Verify non-blocking graceful fallback to SQLite if Supabase credentials are empty or invalid.
2. **Command Registration**:
   - Run `node deploy-commands.js` to ensure Discord API accepts all application command definitions (slash commands and context menus).
3. **Bot Startup & Healthcheck**:
   - Run `node index.js` with and without Supabase credentials. Verify zero uncaught rejections.
4. **Interaction Simulation**:
   - Test `/binder idioma`, `/binder info`, `/ajuda`, `/musica`, `/feedback`, `/bugreport`, and user/message context menus.
