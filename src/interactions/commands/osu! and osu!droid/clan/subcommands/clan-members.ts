import { DatabaseManager } from "@alice-database/DatabaseManager";
import { ClanCollectionManager } from "@alice-database/managers/elainaDb/ClanCollectionManager";
import { Clan } from "@alice-database/utils/elainaDb/Clan";
import { ClanMember } from "@alice-interfaces/clan/ClanMember";
import { SlashSubcommand } from "@alice-interfaces/core/SlashSubcommand";
import { OnButtonPageChange } from "@alice-interfaces/utils/OnButtonPageChange";
import { ClanLocalization } from "@alice-localization/interactions/commands/osu! and osu!droid/clan/ClanLocalization";
import { EmbedCreator } from "@alice-utils/creators/EmbedCreator";
import { MessageButtonCreator } from "@alice-utils/creators/MessageButtonCreator";
import { MessageCreator } from "@alice-utils/creators/MessageCreator";
import { CommandHelper } from "@alice-utils/helpers/CommandHelper";
import { InteractionHelper } from "@alice-utils/helpers/InteractionHelper";
import { GuildMember, MessageEmbed } from "discord.js";

export const run: SlashSubcommand["run"] = async (_, interaction) => {
    const localization: ClanLocalization = new ClanLocalization(
        await CommandHelper.getLocale(interaction)
    );

    const dbManager: ClanCollectionManager =
        DatabaseManager.elainaDb.collections.clan;

    const clan: Clan | null = interaction.options.getString("name")
        ? await dbManager.getFromName(
              interaction.options.getString("name", true)
          )
        : await dbManager.getFromUser(interaction.user);

    if (!clan) {
        return InteractionHelper.reply(interaction, {
            content: MessageCreator.createReject(
                localization.getTranslation(
                    interaction.options.getString("name")
                        ? "clanDoesntExist"
                        : "selfIsNotInClan"
                )
            ),
        });
    }

    const embed: MessageEmbed = EmbedCreator.createNormalEmbed({
        author: interaction.user,
        color:
            (await clan.getClanRole())?.color ??
            (<GuildMember>interaction.member).displayColor,
    });

    embed.setTitle(`${clan.name} Members`);

    if (clan.iconURL) {
        embed.setThumbnail(clan.iconURL);
    }

    const onPageChange: OnButtonPageChange = async (_, page) => {
        const clanMemberDescriptions: string[] = [];

        for (
            let i = 5 * (page - 1);
            i < Math.min(clan.member_list.size, 5 + 5 * (page - 1));
            ++i
        ) {
            const member: ClanMember = clan.member_list.at(i)!;

            clanMemberDescriptions.push(
                `**${5 * (page - 1) + i + 1}. <@${member.id}> (#${
                    member.rank
                })**\n` +
                    `**${localization.getTranslation("discordId")}**: ${
                        member.id
                    }\n` +
                    `**Uid**: ${member.uid}\n` +
                    `**${localization.getTranslation("clanMemberRole")}**: ${
                        member.hasPermission
                            ? `${localization.getTranslation(
                                  member.id === clan.leader
                                      ? "clanMemberRoleLeader"
                                      : "clanMemberRoleCoLeader"
                              )}`
                            : localization.getTranslation(
                                  "clanMemberRoleMember"
                              )
                    }\n` +
                    `**${localization.getTranslation(
                        "clanMemberUpkeepValue"
                    )}**: ${clan.calculateUpkeep(member.id)} Alice coins`
            );
        }

        embed.setDescription(clanMemberDescriptions.join("\n\n"));
    };

    MessageButtonCreator.createLimitedButtonBasedPaging(
        interaction,
        { embeds: [embed] },
        [interaction.user.id],
        1,
        Math.ceil(clan.member_list.size / 5),
        90,
        onPageChange
    );
};

export const config: SlashSubcommand["config"] = {
    permissions: [],
};
