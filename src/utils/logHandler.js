/**
 * @file logHandler.js
 * @description Backward-compatible wrapper delegating to the new structured Logger
 */

const Logger = require('./logger.js');

module.exports = {
    logErrorToWebhook: Logger.logErrorToWebhook,
    Logger
};