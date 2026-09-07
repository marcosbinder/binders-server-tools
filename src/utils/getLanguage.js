const { getUser, getUserSync } = require('../../database/db.js');

function getLanguage(context) {
    const userId = context.user ? context.user.id : context.author?.id;
    const fetchFn = (typeof getUserSync === 'function') ? getUserSync : getUser;
    const userData = (typeof fetchFn === 'function' && userId) ? fetchFn(userId) : { language: 'lang_auto' };

    // checa a preferência salva no db
    switch (userData.language) {
        // idioma fixo
        case 'lang_pt_br':
            return 'pt_BR';
        case 'lang_en_us':
            return 'en_US';
        
        // idioma auto
        case 'lang_auto':
        default:
            // pega o melhor idioma disponível (o da interação ou da 'memória')
            const bestAvailableLocale = (context.user && context.locale) || userData.lastKnownLocale || context.locale;
            
            // se o idioma for pt-BR, a gente usa. pra QUALQUER outra coisa, a gente usa en_US como padrão.
            return bestAvailableLocale === 'pt-BR' ? 'pt_BR' : 'en_US';
    }
}

module.exports = getLanguage;