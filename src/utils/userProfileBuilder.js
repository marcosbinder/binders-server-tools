/**
 * @file userProfileBuilder.js
 * @description Centralized builder for user profile embeds, badges, and components (used by /userinfo and context menu)
 */

const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getUser } = require('../../database/db.js');
const createEmbed = require('./createEmbed.js');
const getLanguage = require('./getLanguage.js');
const { getEmoji } = require('../config/emojis.js');
const colors = require('../config/colors.js');

const BADGE_MAP = {
    HypeSquadOnlineHouse1: { pt: `${getEmoji('bravery')} HypeSquad Bravery`, en: `${getEmoji('bravery')} HypeSquad Bravery` },
    HypeSquadOnlineHouse2: { pt: `${getEmoji('brilliance')} HypeSquad Brilliance`, en: `${getEmoji('brilliance')} HypeSquad Brilliance` },
    HypeSquadOnlineHouse3: { pt: `${getEmoji('balance')} HypeSquad Balance`, en: `${getEmoji('balance')} HypeSquad Balance` },
    ActiveDeveloper: { pt: `${getEmoji('selodev1')} Desenvolvedor Ativo`, en: `${getEmoji('selodev1')} Active Developer` },
    PremiumEarlySupporter: { pt: `${getEmoji('coroa')} Apoiador Inicial`, en: `${getEmoji('coroa')} Early Supporter` },
    VerifiedDeveloper: { pt: `${getEmoji('selodev2')} Dev de Bot Verificado`, en: `${getEmoji('selodev2')} Early Verified Bot Dev` },
    CertifiedModerator: { pt: `${getEmoji('safetybadge')} Moderador Certificado`, en: `${getEmoji('safetybadge')} Certified Moderator` },
    BugHunterLevel1: { pt: `${getEmoji('bughunter')} Caçador de Bugs I`, en: `${getEmoji('bughunter')} Bug Hunter Level 1` },
    BugHunterLevel2: { pt: `${getEmoji('bughunter')} Caçador de Bugs II`, en: `${getEmoji('bughunter')} Bug Hunter Level 2` },
    Staff: { pt: `${getEmoji('selostaff')} Equipe Discord (Staff)`, en: `${getEmoji('selostaff')} Discord Staff` },
    Partner: { pt: `${getEmoji('partner')} Dono de Servidor Parceiro`, en: `${getEmoji('partner')} Partnered Server Owner` },
};

async function buildUserProfilePayload(interaction, client, targetUser, targetMember) {
    const isGuild = Boolean(interaction.guild);
    const lang = getLanguage(interaction);
    const isPtBr = lang === 'pt_BR';

    let fetchedUser = targetUser;
    if (client?.users?.fetch) {
        try {
            fetchedUser = await Promise.race([
                client.users.fetch(targetUser.id, { force: true }),
                new Promise((_, reject) => setTimeout(() => reject(new Error('User fetch timeout')), 2500))
            ]).catch(() => targetUser);
        } catch {
            fetchedUser = targetUser;
        }
    }

    const dbUser = getUser(targetUser.id);
    const ownerId = process.env.OWNER_ID || '659214571634032667';
    const isOwner = targetUser.id === ownerId || targetUser.id === '659214571634032667';
    const isDeveloper = isOwner || (dbUser && (dbUser.isDeveloper === 1 || dbUser.is_developer === 1));

    const badges = [];
    if (isDeveloper) {
        badges.push(isPtBr ? `${getEmoji('selodev1')} Desenvolvedor` : `${getEmoji('selodev1')} Developer`);
    }

    if (dbUser?.badges && dbUser.badges !== '[]') {
        try {
            const parsed = JSON.parse(dbUser.badges);
            if (Array.isArray(parsed)) {
                badges.push(...parsed);
            } else {
                badges.push(dbUser.badges);
            }
        } catch {
            badges.push(dbUser.badges);
        }
    }

    if (targetUser.flags?.toArray) {
        for (const flag of targetUser.flags.toArray()) {
            if (BADGE_MAP[flag]) {
                badges.push(isPtBr ? BADGE_MAP[flag].pt : BADGE_MAP[flag].en);
            } else {
                badges.push(flag);
            }
        }
    }

    const createdTimestamp = targetUser.createdTimestamp ? Math.floor(targetUser.createdTimestamp / 1000) : null;
    const fields = [
        {
            name: isPtBr ? `${getEmoji('pessoa')} Identificação` : `${getEmoji('pessoa')} Identification`,
            value: `**Tag:** ${targetUser.username}\n**ID:** \`${targetUser.id}\``,
            inline: true,
        },
        {
            name: isPtBr ? `${getEmoji('selo')} Badges` : `${getEmoji('selo')} Badges`,
            value: badges.length > 0 ? badges.join(', ') : (isPtBr ? 'Nenhuma' : 'None'),
            inline: true,
        },
    ];

    if (isGuild && targetMember) {
        const highestRoleName = targetMember.roles?.highest?.name || (Array.isArray(targetMember.roles) ? '@everyone' : '@everyone');
        const totalRoles = targetMember.roles?.cache?.size ?? (Array.isArray(targetMember.roles) ? targetMember.roles.length : 0);
        let rolesValue = `**${isPtBr ? 'Maior Cargo' : 'Highest Role'}:** ${highestRoleName}\n**${isPtBr ? 'Total' : 'Total'}:** ${totalRoles}`;
        const memberRolesList = targetMember.roles?.cache ? Array.from(targetMember.roles.cache.values()).filter(r => r.name !== '@everyone') : [];
        if (memberRolesList.length > 0) {
            const displayRoles = memberRolesList.slice(0, 6).map(r => `<@&${r.id}>`).join(' ');
            const remaining = memberRolesList.length - 6;
            rolesValue += `\n${displayRoles}${remaining > 0 ? ` *+${remaining}*` : ''}`;
        }

        fields.push({
            name: isPtBr ? `${getEmoji('selostaff')} Hierarquia & Cargos` : `${getEmoji('selostaff')} Hierarchy & Roles`,
            value: rolesValue,
            inline: true,
        });

        if (targetMember.premiumSince) {
            const premTimestamp = Math.floor(new Date(targetMember.premiumSince).getTime() / 1000);
            fields.push({
                name: isPtBr ? `${getEmoji('booster')} Impulsionamento (Booster)` : `${getEmoji('booster')} Boosting Status`,
                value: !isNaN(premTimestamp)
                    ? `${getEmoji('diamante')} ${isPtBr ? 'Desde' : 'Since'} <t:${premTimestamp}:D> (<t:${premTimestamp}:R>)`
                    : (isPtBr ? 'Sim' : 'Yes'),
                inline: true,
            });
        }

        if (targetMember.joinedAt) {
            const joinedTimestamp = Math.floor(new Date(targetMember.joinedAt).getTime() / 1000);
            if (!isNaN(joinedTimestamp)) {
                fields.push({
                    name: isPtBr ? `${getEmoji('calendario')} Entrada no Servidor` : `${getEmoji('calendario')} Server Join Date`,
                    value: `<t:${joinedTimestamp}:D> (<t:${joinedTimestamp}:R>)`,
                    inline: false,
                });
            }
        }
    }

    if (createdTimestamp) {
        fields.push({
            name: isPtBr ? `${getEmoji('calendario')} Criação da Conta` : `${getEmoji('calendario')} Account Created`,
            value: `<t:${createdTimestamp}:D> (<t:${createdTimestamp}:R>)`,
            inline: false,
        });
    }

    const bannerUrl = typeof fetchedUser.bannerURL === 'function' ? fetchedUser.bannerURL({ size: 1024 }) : null;
    const avatarUrl = typeof targetUser.displayAvatarURL === 'function' ? targetUser.displayAvatarURL({ size: 1024 }) : null;
    const embedColor = (targetMember?.displayHexColor && targetMember.displayHexColor !== '#000000')
        ? targetMember.displayHexColor
        : (fetchedUser.hexAccentColor || colors.primary || 0xAEA7BD);

    const embed = await createEmbed(interaction, {
        title: isPtBr ? `Informações de ${targetUser.username}` : `Information for ${targetUser.username}`,
        fields,
        thumbnail: avatarUrl,
        color: embedColor,
        targetUser,
    });

    if (bannerUrl && embed.setImage) {
        embed.setImage(bannerUrl);
    }

    const buttons = [];
    if (avatarUrl) {
        buttons.push(
            new ButtonBuilder()
                .setLabel(isPtBr ? 'Ver Avatar' : 'View Avatar')
                .setStyle(ButtonStyle.Link)
                .setURL(avatarUrl)
                .setEmoji(getEmoji('pessoa'))
        );
    }
    if (bannerUrl) {
        buttons.push(
            new ButtonBuilder()
                .setLabel(isPtBr ? 'Ver Banner' : 'View Banner')
                .setStyle(ButtonStyle.Link)
                .setURL(bannerUrl)
                .setEmoji(getEmoji('paletadecores'))
        );
    }

    const payload = { embeds: [embed] };
    if (buttons.length > 0) {
        payload.components = [new ActionRowBuilder().addComponents(buttons)];
    }

    return payload;
}

module.exports = {
    buildUserProfilePayload,
    BADGE_MAP,
};
