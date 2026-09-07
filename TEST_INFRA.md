# Test Infrastructure Architecture — Binder's Server Tools

## 1. Overview & Principles

The test infrastructure for **Binder's Server Tools** is built exclusively using Node.js native testing capabilities (`node:test` and `node:assert/strict`). This design eliminates external test dependencies (such as Jest, Mocha, or Babel), ensures zero build steps, and provides instant, deterministic execution across all environments (local Windows, Linux CI, Discloud containers).

### Key Architectural Tenets:
1. **Zero External Test Dependencies**: Leverages Node.js built-in `node:test` and `node:assert/strict`.
2. **Progressive Testability & Isolation**: Every test creates its own state without shared mutable singletons across test boundaries.
3. **Multi-Tier Verification**: 4-Tier test taxonomy covering unit features, edge conditions, cross-module integration, and end-to-end user scenarios.
4. **Resilient Mock Architecture**: Full discord.js interaction/client mocks, SQLite & Supabase database mocks, and HTTP fetch/webhook dispatchers.

---

## 2. Directory Structure

```
tests/
├── helpers/
│   ├── mockDiscord.js          # Discord interaction, member, guild, and client factories
│   ├── mockDatabase.js         # Unified SQLite & Supabase PostgreSQL in-memory mock
│   ├── mockHttp.js             # iTunes, Deezer, Spotify, and WebhookClient mock utilities
│   └── fixtures.js             # Standard entities (users, guilds, messages, emojis, colors)
├── tier1_features/             # Feature-level unit tests (>=5 tests per requirement)
│   ├── r1_database.test.js     # Requirement R1: Database & Cloud Compatibility
│   ├── r2_config.test.js       # Requirement R2: Central Configuration & Security
│   ├── r3_help_menu.test.js    # Requirement R3: Interactive Help Menu & UI Glow-Up
│   ├── r4_context_menus.test.js# Requirement R4: User & Message Context Menus
│   ├── r5_music_lookup.test.js # Requirement R5: Multi-Provider Music Lookup
│   ├── r6_safety_feedback.test.js # Requirement R6: Rate-Limiting & Webhooks
│   └── r7_onboarding_tos.test.js  # Requirement R7: Onboarding & ToS Flow
├── tier2_boundaries/           # Boundary & Corner Case tests
│   └── boundary_cases.test.js  # Network drops, malformed IDs, rate-limit thresholds
├── tier3_combinations/         # Cross-Feature Integration tests
│   └── cross_features.test.js  # Interacting features (ToS x Menus x Languages x Cooldowns)
└── tier4_scenarios/            # Real-World Scenario lifecycle tests
    └── real_world_scenarios.test.js # Full onboarding, music failover, spam attacks
```

---

## 3. Mock Factories & Helpers

### 3.1 `mockDiscord.js`
Generates full-fidelity Discord.js v14 objects:
- `createMockInteraction(overrides)`:
  - Supports ChatInputCommand, ButtonInteraction, StringSelectMenuInteraction, UserContextMenuCommandInteraction, MessageContextMenuCommandInteraction, and ModalSubmitInteraction.
  - Generates realistic member hierarchies, highest roles, booster timestamps, guild icons, and user flags.
  - Captures replies (`_replies`), updates (`_updates`), and edit replies (`_editReplies`) for rigorous assertion.
- `createMockClient(overrides)`:
  - Simulates collections (`commands`, `buttons`, `selects`, `modals`), guild cache, user fetching, and websocket latency.

### 3.2 `mockDatabase.js`
Provides an in-memory database simulator compatible with both SQLite and Supabase PostgreSQL:
- Simulates tables: `users`, `guilds`, `moderation_logs`, `warnings`, `economy_profiles`, `afk_status`, `custom_commands`, `reminders`, `ai_history`.
- In-memory Supabase Query Builder mock (`.from('table').select().insert().update().eq()`).
- Failover simulation hooks (`simulateNetworkFailure()`, `simulateRecovery()`) to test cloud loss resilience without external network dependencies.

### 3.3 `mockHttp.js`
Mock dispatcher for external REST APIs:
- **iTunes Search API**: Formats song responses, tracks, artwork URLs, and M4A previews.
- **Deezer Search API**: Formats track responses, 1000x1000 artwork, and MP3 previews.
- **Spotify**: Formats search URLs and fallback link generators.
- **WebhookClient**: Simulates Discord webhook dispatches (`/feedback`, `/bugreport`) with error capture and payload inspection.

---

## 4. Test Execution Commands

### Run Full Test Suite
```bash
npm test
```
*Executes `node --test tests/**/*.test.js` covering all 10 suites and 58 test cases.*

### Run Specific Test Tiers
```bash
# Run Tier 1 Feature Tests
node --test tests/tier1_features/*.test.js

# Run Tier 2 Boundary Tests
node --test tests/tier2_boundaries/*.test.js

# Run Tier 3 Cross-Feature Tests
node --test tests/tier3_combinations/*.test.js

# Run Tier 4 Real-World Scenario Tests
node --test tests/tier4_scenarios/*.test.js
```

### Run Single Requirement Test Suite
```bash
node --test tests/tier1_features/r5_music_lookup.test.js
```
