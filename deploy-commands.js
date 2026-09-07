/**
 * @file deploy-commands.js
 * @description Command registration script supporting Global and Guild-specific deployments, programmatic invocation, and clearing
 */

const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config();

function getCommandsList() {
    const commands = [];
    const commandsPath = path.join(__dirname, 'src', 'commands');

    function loadCommandsRecursively(dir) {
        if (!fs.existsSync(dir)) return;
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                loadCommandsRecursively(fullPath);
            } else if (entry.isFile() && entry.name.endsWith('.js')) {
                try {
                    const command = require(fullPath);
                    if ('data' in command && 'execute' in command) {
                        commands.push(command.data.toJSON());
                    } else {
                        console.warn(`[AVISO] O comando em ${fullPath} não possui 'data' ou 'execute'.`);
                    }
                } catch (err) {
                    console.error(`[ERRO] Falha ao carregar comando ${fullPath}:`, err.message);
                }
            }
        }
    }

    loadCommandsRecursively(commandsPath);
    return commands;
}

async function deployCommands(options = {}) {
    const token = options.token || process.env.DISCORD_TOKEN;
    const clientId = options.clientId || process.env.CLIENT_ID;
    const guildId = options.guildId !== undefined ? options.guildId : (process.env.GUILD_ID || null);
    const isClear = options.clear || false;
    const isGlobal = options.global !== undefined ? options.global : (!guildId);

    if (!token) {
        console.warn('[AVISO] DISCORD_TOKEN não definido. Deploy de comandos ignorado.');
        return { success: false, reason: 'NO_TOKEN' };
    }

    if (!clientId) {
        console.warn('[AVISO] CLIENT_ID não definido. Deploy de comandos ignorado.');
        return { success: false, reason: 'NO_CLIENT_ID' };
    }

    const rest = new REST({ version: '10' }).setToken(token);
    const commands = isClear ? [] : getCommandsList();

    try {
        if (guildId && !isGlobal) {
            console.log(`[DEPLOY] ${isClear ? 'Limpando' : 'Registrando'} ${commands.length} comandos na guilda ID: ${guildId}...`);
            const data = await rest.put(
                Routes.applicationGuildCommands(clientId, guildId),
                { body: commands }
            );
            console.log(`[SUCESSO] ${data.length} comandos registrados com sucesso na guilda!`);
            return { success: true, count: data.length, isGlobal: false };
        } else {
            console.log(`[DEPLOY] ${isClear ? 'Limpando' : 'Registrando'} ${commands.length} comandos globalmente...`);
            const data = await rest.put(
                Routes.applicationCommands(clientId),
                { body: commands }
            );
            console.log(`[SUCESSO] ${data.length} comandos registrados com sucesso globalmente!`);
            return { success: true, count: data.length, isGlobal: true };
        }
    } catch (error) {
        console.error('[ERRO] Falha durante o registro de comandos:', error.message);
        return { success: false, error };
    }
}

if (require.main === module) {
    const args = process.argv.slice(2);
    const isClear = args.includes('--clear') || args.includes('-c');
    const isGlobal = args.includes('--global');
    const guildArgIndex = args.findIndex(a => a === '--guild' || a === '-g');
    const targetGuildId = guildArgIndex !== -1 ? args[guildArgIndex + 1] : (process.env.GUILD_ID || null);

    deployCommands({
        clear: isClear,
        global: isGlobal,
        guildId: targetGuildId,
    }).then(res => {
        if (!res.success && res.error) process.exit(1);
    });
}

module.exports = {
    deployCommands,
    getCommandsList,
};