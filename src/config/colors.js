/**
 * @file colors.js
 * @description Centralized color palette for Discord Embeds (RGB integers and Hex codes)
 * 
 * Paleta Oficial Binder's Server Tools:
 * - Padrão (Primary): #AEA7BD (0xAEA7BD)
 * - Mais Escuro (Darker): #898DA5 (0x898DA5)
 * - Mais Claro (Lighter): #C4BBCD (0xC4BBCD)
 * - Alternativa (Accent/Alternative): #6797BF (0x6797BF)
 */

const colors = {
    // 24-bit RGB numeric values (Directly used by Discord.js EmbedBuilder / test assertions)
    primary: 0xAEA7BD,
    darker: 0x898DA5,
    dark: 0x898DA5,
    lighter: 0xC4BBCD,
    light: 0xC4BBCD,
    alternative: 0x6797BF,
    accent: 0x6797BF,
    secondary: 0x898DA5,

    // Status colors
    success: 0x57F287,
    warning: 0xFEE75C,
    error: 0xED4245,
    danger: 0xED4245,
    neutral: 0x898DA5,
    info: 0x6797BF,
    music: 0x1DB954,
    musicApple: 0xFC3C44,
    gold: 0xFEE75C,
    fuchsia: 0xEB459E,

    // Hex string palette for UI components, Canvas rendering, or web views
    hex: {
        primary: '#AEA7BD',
        darker: '#898DA5',
        dark: '#898DA5',
        lighter: '#C4BBCD',
        light: '#C4BBCD',
        alternative: '#6797BF',
        accent: '#6797BF',
        secondary: '#898DA5',

        success: '#43B581',
        warning: '#FAA61A',
        error: '#ED4245',
        neutral: '#898DA5',
        info: '#6797BF',
        music: '#1DB954',
        musicApple: '#FC3C44',
        gold: '#FEE75C',
        fuchsia: '#EB459E',
    },
};

module.exports = colors;
