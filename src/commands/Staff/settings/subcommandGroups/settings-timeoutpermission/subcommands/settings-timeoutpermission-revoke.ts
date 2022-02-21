import { DatabaseManager } from "@alice-database/DatabaseManager";
import { GuildPunishmentConfig } from "@alice-database/utils/aliceDb/GuildPunishmentConfig";
import { Subcommand } from "@alice-interfaces/core/Subcommand";
import { SettingsLocalization } from "@alice-localization/commands/Staff/SettingsLocalization";
import { MessageCreator } from "@alice-utils/creators/MessageCreator";
import { CommandHelper } from "@alice-utils/helpers/CommandHelper";
import { Role } from "discord.js";

export const run: Subcommand["run"] = async (_, interaction) => {
    const localization: SettingsLocalization = new SettingsLocalization(
        await CommandHelper.getLocale(interaction)
    );

    const role: Role = <Role>interaction.options.getRole("role", true);

    const guildConfig: GuildPunishmentConfig | null =
        await DatabaseManager.aliceDb.collections.guildPunishmentConfig.getGuildConfig(
            interaction.guildId!
        );

    if (!guildConfig) {
        return interaction.editReply({
            content: MessageCreator.createReject(
                localization.getTranslation("noLogChannelConfigured")
            ),
        });
    }

    await guildConfig.revokeTimeoutPermission(role.id);

    interaction.editReply({
        content: MessageCreator.createAccept(
            localization.getTranslation("revokeTimeoutPermissionSuccess"),
            role.name
        ),
    });
};

export const config: Subcommand["config"] = {
    permissions: ["ADMINISTRATOR"],
};
