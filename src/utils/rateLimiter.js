/**
 * @file rateLimiter.js
 * @description In-memory sliding-window rate limiter for anti-spam command & component protection
 */

const MAX_ENTRIES = 5000;

class RateLimiter {
    constructor(maxEntries = MAX_ENTRIES) {
        this.cooldowns = new Map(); // key -> epoch timestamp in ms
        this.maxEntries = maxEntries;
    }

    /**
     * Checks whether a user action is currently rate limited
     * @param {string} userId - Discord user snowflake ID
     * @param {string} key - Command or interaction key
     * @param {number} cooldownMs - Cooldown window in milliseconds
     * @param {boolean|number} isDeveloper - Developer bypass flag
     * @returns {{ limited: boolean, remainingMs: number }}
     */
    check(userId, key, cooldownMs, isDeveloper = false) {
        if (isDeveloper) {
            return { limited: false, remainingMs: 0 };
        }

        const mapKey = `${userId}:${key}`;
        const now = Date.now();
        const lastUsed = this.cooldowns.get(mapKey);

        if (lastUsed && (now - lastUsed) < cooldownMs) {
            const remainingMs = cooldownMs - (now - lastUsed);
            return { limited: true, remainingMs };
        }

        // Bounded memory defense: FIFO eviction if capacity reached
        if (!this.cooldowns.has(mapKey)) {
            while (this.cooldowns.size >= this.maxEntries) {
                const oldestKey = this.cooldowns.keys().next().value;
                if (oldestKey === undefined) break;
                this.cooldowns.delete(oldestKey);
            }
        }

        this.cooldowns.set(mapKey, now);
        return { limited: false, remainingMs: 0 };
    }

    /**
     * Prunes expired cooldown records from memory
     * @param {number} maxAge - Time to live threshold in milliseconds (default: 10000ms)
     */
    cleanup(maxAge = 10000) {
        const now = Date.now();
        for (const [key, timestamp] of this.cooldowns.entries()) {
            if (now - timestamp >= maxAge) {
                this.cooldowns.delete(key);
            }
        }
    }
}

const rateLimiterInstance = new RateLimiter();
rateLimiterInstance.RateLimiter = RateLimiter;
rateLimiterInstance.MAX_ENTRIES = MAX_ENTRIES;

module.exports = rateLimiterInstance;
