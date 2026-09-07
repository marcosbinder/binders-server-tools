/**
 * @file index.js
 * @description Main application entrypoint, Discord client initialization and event registration
 */

// Global unhandled error protection
require('./src/utils/errorHandler.js')();
const { Client, Collection, GatewayIntentBits, Partials } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

// Load environment variables
require('dotenv').config();

// Initialize database
require('./database/db.js');

// Discord Client setup with full Intent coverage for DMs and Guilds
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages,
    ],
    partials: [
        Partials.Channel,
    ],
});

// Component and Command Collections
client.commands = new Collection();
client.buttons = new Collection();
client.selects = new Collection();
client.modals = new Collection();

// Command Loader (Supports subdirectories and flat command files)
const commandsPath = path.join(__dirname, 'src', 'commands');
if (fs.existsSync(commandsPath)) {
    function loadCommands(dir) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                loadCommands(fullPath);
            } else if (entry.isFile() && entry.name.endsWith('.js')) {
                try {
                    const command = require(fullPath);
                    if ('data' in command && 'execute' in command) {
                        client.commands.set(command.data.name, command);
                    } else {
                        console.warn(`[AVISO] Comando em ${fullPath} não possui 'data' ou 'execute'.`);
                    }
                } catch (err) {
                    console.error(`[ERRO] Falha ao carregar comando ${fullPath}:`, err.message);
                }
            }
        }
    }
    loadCommands(commandsPath);
}
console.log(`[CARREGADOR] Carregados ${client.commands.size} comandos.`);

// Event Loader
const eventsPath = path.join(__dirname, 'src', 'events');
if (fs.existsSync(eventsPath)) {
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
    const registeredEvents = new Set();
    for (const file of eventFiles) {
        const event = require(`./src/events/${file}`);
        if (!event || !event.name || typeof event.execute !== 'function') continue;
        const eventKey = `${event.name}:${event.once ? 'once' : 'on'}`;
        if (registeredEvents.has(eventKey)) continue;
        registeredEvents.add(eventKey);
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args, client));
        } else {
            client.on(event.name, (...args) => event.execute(...args, client));
        }
    }
}

// Button Interaction Loader
const buttonsPath = path.join(__dirname, 'src', 'interactions', 'buttons');
if (fs.existsSync(buttonsPath)) {
    const buttonFiles = fs.readdirSync(buttonsPath).filter(file => file.endsWith('.js'));
    for (const file of buttonFiles) {
        const button = require(`./src/interactions/buttons/${file}`);
        client.buttons.set(button.name, button);
    }
    console.log(`[CARREGADOR] Carregados ${client.buttons.size} handlers de botão.`);
}

// Select Menu Interaction Loader
const selectsPath = path.join(__dirname, 'src', 'interactions', 'selects');
if (fs.existsSync(selectsPath)) {
    const selectFiles = fs.readdirSync(selectsPath).filter(file => file.endsWith('.js'));
    for (const file of selectFiles) {
        const select = require(`./src/interactions/selects/${file}`);
        client.selects.set(select.name, select);
    }
    console.log(`[CARREGADOR] Carregados ${client.selects.size} handlers de menu.`);
}

// Modal Interaction Loader
const modalsPath = path.join(__dirname, 'src', 'interactions', 'modals');
if (fs.existsSync(modalsPath)) {
    const modalFiles = fs.readdirSync(modalsPath).filter(file => file.endsWith('.js'));
    for (const file of modalFiles) {
        const modal = require(`./src/interactions/modals/${file}`);
        client.modals.set(modal.name, modal);
    }
    console.log(`[CARREGADOR] Carregados ${client.modals.size} handlers de modal.`);
}

// Auto-deploy Slash Commands on startup if enabled and credentials are present
const { deployCommands } = require('./deploy-commands.js');
if (process.env.AUTO_DEPLOY_COMMANDS !== 'false' && process.env.DISCORD_TOKEN && process.env.CLIENT_ID) {
    deployCommands().catch(err => {
        console.warn('[AVISO] Auto-deploy de comandos falhou ou foi ignorado:', err.message);
    });
}

// Login Discord Client if token is present
if (process.env.DISCORD_TOKEN) {
    client.login(process.env.DISCORD_TOKEN).catch(err => {
        console.error('[ERRO] Falha ao logar no Discord:', err.message);
    });
} else {
    console.warn('[AVISO] DISCORD_TOKEN não encontrado no ambiente.');
}

const { sendLifecycleLog, setLifecycleClient } = require('./src/utils/lifecycleLogger.js');
const { closeDatabase } = require('./src/database/db.js');

setLifecycleClient(client);

const shutdownHandler = (signal) => {
    console.log(`[SHUTDOWN] Recebido sinal ${signal}. Encerrando...`);
    sendLifecycleLog('🔴 Bot Desligando...', 'Red', client);
    closeDatabase();
    setTimeout(() => process.exit(0), 1000);
};

process.on('SIGINT', () => shutdownHandler('SIGINT'));
process.on('SIGTERM', () => shutdownHandler('SIGTERM'));