/**
 * @file config.js
 * @description Backward-compatible wrapper forwarding to central config index.js
 */

const config = require('./index.js');

module.exports = {
    ...config,
    currentTosVersion: 2,
};