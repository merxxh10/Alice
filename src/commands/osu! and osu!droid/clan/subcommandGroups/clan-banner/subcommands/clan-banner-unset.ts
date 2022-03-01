import { Constants } from "@alice-core/Constants";
import { DatabaseManager } from "@alice-database/DatabaseManager";
import { Clan } from "@alice-database/utils/elainaDb/Clan";
import { UserBind } from "@alice-database/utils/elainaDb/UserBind";
import { OperationResult } from "@alice-interfaces/core/OperationResult";
import { Subcommand } from "@alice-interfaces/core/Subcommand";
import { Language } from "@alice-localization/base/Language";
import { ClanLocalization } from "@alice-localization/commands/osu! and osu!droid/clan/ClanLocalization";
import { ConstantsLocalization } from "@alice-localization/core/constants/ConstantsLocalization";
import { MessageButtonCreator } from "@alice-utils/creators/MessageButtonCreator";
import { MessageCreator } from "@alice-utils/creators/MessageCreator";
import { CommandHelper } from "@alice-utils/helpers/CommandHelper";
import { PermissionHelper } from "@alice-utils/helpers/PermissionHelper";
import { Snowflake, Collection, GuildMember } from "discord.js";

export const run: Subcommand["run"] = async (client, interaction) => {
    const language: Language = await CommandHelper.getLocale(interaction);

    const localization: ClanLocalization = new ClanLocalization(language);

    let clanName: string;

    const allowedConfirmations: Snowflake[] = [];

    if (interaction.options.getString("name")) {
        const staffMembers: Collection<Snowflake, GuildMember> =
            await PermissionHelper.getMainGuildStaffMembers(client);

        if (!staffMembers.has(interaction.user.id)) {
            return interaction.editReply({
                content: MessageCreator.createReject(
                    localization.getTranslation(
                        "selfHasNoAdministrativePermission"
                    )
                ),
            });
        }

        allowedConfirmations.push(...staffMembers.keys());

        clanName = interaction.options.getString("name", true);
    } else {
        const bindInfo: UserBind | null =
            await DatabaseManager.elainaDb.collections.userBind.getFromUser(
                interaction.user
            );

        if (!bindInfo) {
            return interaction.editReply({
                content: MessageCreator.createReject(
                    new ConstantsLocalization(language).getTranslation(
                        Constants.selfNotBindedReject
                    )
                ),
            });
        }

        if (!bindInfo.clan) {
            return interaction.editReply({
                content: MessageCreator.createReject(
                    localization.getTranslation("selfIsNotInClan")
                ),
            });
        }

        clanName = bindInfo.clan;
    }

    const clan: Clan | null =
        await DatabaseManager.elainaDb.collections.clan.getFromName(clanName);

    if (!clan) {
        return interaction.editReply({
            content: MessageCreator.createReject(
                localization.getTranslation("clanDoesntExist")
            ),
        });
    }

    // Only clan co-leaders, leaders, and staff members can remove clan icons
    if (
        !clan.hasAdministrativePower(interaction.user) &&
        allowedConfirmations.length === 1
    ) {
        return interaction.editReply({
            content: MessageCreator.createReject(
                localization.getTranslation("selfHasNoAdministrativePermission")
            ),
        });
    }

    const confirmation: boolean = await MessageButtonCreator.createConfirmation(
        interaction,
        {
            content: MessageCreator.createWarn(
                localization.getTranslation("removeBannerConfirmation")
            ),
        },
        allowedConfirmations,
        20,
        language
    );

    if (!confirmation) {
        return;
    }

    const setResult: OperationResult = await clan.setBanner(
        undefined,
        language
    );

    if (!setResult.success) {
        return interaction.editReply({
            content: MessageCreator.createReject(
                localization.getTranslation("removeBannerFailed"),
                setResult.reason!
            ),
        });
    }

    const finalResult: OperationResult = await clan.updateClan();

    if (!finalResult.success) {
        return interaction.editReply({
            content: MessageCreator.createReject(
                localization.getTranslation("removeBannerFailed"),
                setResult.reason!
            ),
        });
    }

    interaction.editReply({
        content: MessageCreator.createAccept(
            localization.getTranslation("removeBannerSuccessful")
        ),
    });
};

export const config: Subcommand["config"] = {
    permissions: [],
};
