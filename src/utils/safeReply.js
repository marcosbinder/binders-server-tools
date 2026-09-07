/**
 * @file safeReply.js
 * @description Safe interaction response helper that prevents InteractionAlreadyReplied and unhandled state collisions.
 */

const { MessageFlags } = require('discord.js');

/**
 * Safely responds to an interaction regardless of whether it is unacknowledged, deferred, or already replied to.
 *
 * @param {import('discord.js').Interaction} interaction The interaction to reply to
 * @param {string|object} payload The payload or content to send
 * @param {object} [options] Optional options
 * @param {boolean} [options.ephemeral] Whether to add ephemeral flag if not already specified
 * @returns {Promise<any|null>} The response result or null if the interaction is expired/invalid
 */
async function safeReply(interaction, payload, options = {}) {
    if (!interaction) return null;

    const isEphemeral = Boolean(options?.ephemeral);
    let finalPayload = typeof payload === 'string' ? { content: payload } : { ...payload };

    if (isEphemeral) {
        if (typeof finalPayload.flags === 'number') {
            finalPayload.flags |= MessageFlags.Ephemeral;
        } else if (Array.isArray(finalPayload.flags)) {
            if (!finalPayload.flags.includes(MessageFlags.Ephemeral)) {
                finalPayload.flags.push(MessageFlags.Ephemeral);
            }
        } else {
            finalPayload.flags = [MessageFlags.Ephemeral];
        }
    }

    try {
        if (interaction.replied) {
            return await interaction.followUp(finalPayload);
        }
        if (interaction.deferred) {
            return await interaction.editReply(finalPayload);
        }
        return await interaction.reply(finalPayload);
    } catch (err) {
        // Suppress interaction expiry/already replied errors without crashing
        return null;
    }
}

module.exports = safeReply;
module.exports.safeReply = safeReply;
