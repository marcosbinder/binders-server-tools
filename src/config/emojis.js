/**
 * @file emojis.js
 * @description Centralized emoji dictionary with Discord custom emoji strings and Unicode fallbacks
 */

const custom = {
    // Core & Status
    verified_app_1: '<:verified_app_1:1336358365479305366>',
    verified_app_2: '<:verified_app_2:1336358433946861649>',
    djs: '<:djs:1397399961259474974>',
    foguete: '<:foguete:1397390505171615827>',
    estrela: '<:estrela:1397390959137914950>',
    brilho: '<:brilho:1397390670540439624>',
    salvar: '<:salvar:1394090159879753728>',
    certo1: '<:confere:1394116085279883274>',
    certo2: '<:v_:1394894026678861825>',
    confere: '<:confere:1394116085279883274>',
    errado: '<:x_:1394185776807546963>',
    x_: '<:x_:1394185776807546963>',
    anuncio: '<:anuncio:1394142606535033017>',
    carta: '<:carta:1394142002404135003>',
    novato: '<:novato:1394085774567276614>',
    mencao: '<:mencao:1393999045248417924>',
    linha: '<:linha:1393980037715333232>',
    informacao: '<:informacao:1393822533454921869>',
    bot: '<:bot:1393821258851946606>',
    suporte: '<:suporte:1393820810434576434>',
    mundo: '<:mundo:1394088927794827350>',
    internet: '<:internet2:1393819535886258237>',
    github: '<:github:1397393764900933774>',

    // Moderation & Tools
    cadeadofechado: '<:cadeadofechado:1397390753361297568>',
    cadeadoaberto: '<:cadeadoaberto:1397390774391275630>',
    lixeira: '<:lixeira:1397390198102294569>',
    proibido: '<:proibido:1397392460635705436>',
    espadas: '<:espadas:1397390986442969228>',
    ferramenta1: '<:ferramenta1:1397394095697301589>',
    ferramenta2: '<:ferramenta2:1397390847460511894>',
    configuracao: '<:configuracao:1397390825687748608>',
    alfinete: '<:alfinete:1397394124750983269>',

    // Utilities & Gaming
    musica: '<:musica:1397390722667384962>',
    relogio: '<:relogio:1397390315752783963>',
    calendario: '<:calendario:1397394457803882637>',
    notificacao: '<:notificacao:1397394433548222464>',
    tempo: '<:tempo:1397391490661220413>',
    roblox: '<:roblox:1397393500617703506>',
    videogame: '<:videogame:1397393911923736687>',
    ticket: '<:ticket:1397392207379566602>',
    lupa: '<:lupa:1397390427664941056>',
    lampada: '<:lampadaacesa:1397390539493740586>',
    trofeu: '<:trofeu:1397390477472436325>',
    coroa: '<:coroa1:1397390930675499179>',
    pasta: '<:pasta:1397393644331208800>',
    mais: '<:mais:1397392605914071062>',
};

const unicodeFallback = {
    verified_app_1: '🛡️',
    verified_app_2: '✨',
    djs: '🤖',
    foguete: '🚀',
    estrela: '⭐',
    brilho: '✨',
    salvar: '💾',
    certo1: '✅',
    certo2: '✅',
    confere: '✅',
    errado: '❌',
    x_: '❌',
    anuncio: '📢',
    carta: '✉️',
    novato: '👋',
    mencao: '💬',
    linha: '➖',
    informacao: 'ℹ️',
    bot: '🤖',
    suporte: '💬',
    mundo: '🌐',
    internet: '🌐',
    github: '🐙',
    cadeadofechado: '🔒',
    cadeadoaberto: '🔓',
    lixeira: '🗑️',
    proibido: '🚫',
    espadas: '⚔️',
    ferramenta1: '🛠️',
    ferramenta2: '🔧',
    configuracao: '⚙️',
    alfinete: '📌',
    musica: '🎵',
    relogio: '⏰',
    calendario: '📅',
    notificacao: '🔔',
    tempo: '⏱️',
    roblox: '🎮',
    videogame: '🎮',
    ticket: '🎫',
    lupa: '🔍',
    lampada: '💡',
    trofeu: '🏆',
    coroa: '👑',
    pasta: '📂',
    mais: '➕',
};

/**
 * Returns either a custom Discord emoji or its Unicode fallback
 * @param {string} name - Name of the emoji
 * @param {boolean} forceUnicode - Force return of Unicode fallback
 * @returns {string}
 */
function getEmoji(name, forceUnicode = false) {
    if (!name) return '❓';
    if (!forceUnicode && custom[name]) {
        return custom[name];
    }
    return unicodeFallback[name] || '❓';
}

module.exports = {
    custom,
    unicodeFallback,
    getEmoji,
    emojis: custom,
    ...custom,
};

