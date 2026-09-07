const novidadesCommand = require('../../commands/novidades.js');

module.exports = {
    name: 'show_novidades',
    async execute(interaction, client) {
        return novidadesCommand.execute(interaction, client);
    }
};
