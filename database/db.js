/**
 * @file database/db.js
 * @description Ponto de entrada e re-exportação para o módulo unificado src/database/db.js.
 * Garante compatibilidade retroativa absoluta para qualquer require('./database/db.js').
 */

module.exports = require('../src/database/db.js');