import { DatabaseManager } from "@alice-database/DatabaseManager";
import { GuildPunishmentConfig } from "@alice-database/utils/aliceDb/GuildPunishmentConfig";
import { Subcommand } from "@alice-interfaces/core/Subcommand";
import { OnButtonPageChange } from "@alice-interfaces/utils/OnButtonPageChange";
import { SettingsLocalization } from "@alice-localization/commands/Staff/settings/SettingsLocalization";
import { EmbedCreator } from "@alice-utils/creators/EmbedCreator";
import { MessageButtonCreator } from "@alice-utils/creators/MessageButtonCreator";
import { MessageCreator } from "@alice-utils/creators/MessageCreator";
import { CommandHelper } from "@alice-utils/helpers/CommandHelper";
import { MessageEmbed, Snowflake } from "discord.js";

export const run: Subcommand["run"] = async (_, interaction) => {
    if (!interaction.inCachedGuild()) {
        return;
    }

    const localization: SettingsLocalization = new SettingsLocalization(
        await CommandHelper.getLocale(interaction)
    );

    const guildConfig: GuildPunishmentConfig | null =
        await DatabaseManager.aliceDb.collections.guildPunishmentConfig.getGuildConfig(
            interaction.guildId
        );

    if (!guildConfig) {
        return interaction.editReply({
            content: MessageCreator.createReject(
                localization.getTranslation("noLogChannelConfigured")
            ),
        });
    }

    const immuneTimeoutRoles: Snowflake[] = guildConfig.immuneTimeoutRoles;

    const embed: MessageEmbed = EmbedCreator.createNormalEmbed({
        author: interaction.user,
        color: interaction.member.displayColor,
    });

    embed.setTitle(localization.getTranslation("rolesWithTimeoutImmunity"));

    const onPageChange: OnButtonPageChange = async (_, page) => {
        embed.setDescription(
            immuneTimeoutRoles
                .slice(10 * (page - 1), 10 + 10 * (page - 1))
                .map((v) => `- <@&${v}>`)
                .join("\n")
        );
    };

    MessageButtonCreator.createLimitedButtonBasedPaging(
        interaction,
        { embeds: [embed] },
        [interaction.user.id],
        1,
        Math.ceil(immuneTimeoutRoles.length / 10),
        120,
        onPageChange
    );
};

export const config: Subcommand["config"] = {
    permissions: ["ADMINISTRATOR"],
};
