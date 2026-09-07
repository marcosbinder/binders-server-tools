/**
 * @file colors.js
 * @description Centralized color palette for Discord Embeds (RGB integers and Hex codes)
 */

const colors = {
    // 24-bit RGB numeric values (Directly used by Discord.js EmbedBuilder / test assertions)
    primary: 0x5865F2,
    secondary: 0x5865F2,
    success: 0x57F287,
    warning: 0xFEE75C,
    error: 0xED4245,
    danger: 0xED4245,
    neutral: 0x2B2D31,
    info: 0x3498DB,
    music: 0x1DB954,
    musicApple: 0xFC3C44,
    gold: 0xFEE75C,
    fuchsia: 0xEB459E,
    dark: 0x2B2D31,

    // Hex string palette for UI components, Canvas rendering, or web views
    hex: {
        primary: '#9F9AAF',
        secondary: '#5865F2',
        success: '#43B581',
        warning: '#FAA61A',
        error: '#ED4245',
        neutral: '#2B2D31',
        info: '#3498DB',
        music: '#1DB954',
        musicApple: '#FC3C44',
        gold: '#FEE75C',
        fuchsia: '#EB459E',
        dark: '#2B2D31',
    },
};

module.exports = colors;
