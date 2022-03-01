import { Constants } from "@alice-core/Constants";
import { DatabaseManager } from "@alice-database/DatabaseManager";
import { MapShare } from "@alice-database/utils/aliceDb/MapShare";
import { Subcommand } from "@alice-interfaces/core/Subcommand";
import { OperationResult } from "@alice-interfaces/core/OperationResult";
import { MessageCreator } from "@alice-utils/creators/MessageCreator";
import { BeatmapManager } from "@alice-utils/managers/BeatmapManager";
import { Language } from "@alice-localization/base/Language";
import { CommandHelper } from "@alice-utils/helpers/CommandHelper";
import { MapshareLocalization } from "@alice-localization/commands/osu! and osu!droid/mapshare/MapshareLocalization";
import { ConstantsLocalization } from "@alice-localization/core/constants/ConstantsLocalization";

export const run: Subcommand["run"] = async (_, interaction) => {
    const language: Language = await CommandHelper.getLocale(interaction);

    const localization: MapshareLocalization = new MapshareLocalization(
        language
    );

    if (interaction.channelId !== Constants.mapShareChannel) {
        return interaction.editReply({
            content: MessageCreator.createReject(
                new ConstantsLocalization(language).getTranslation(
                    Constants.notAvailableInChannelReject
                )
            ),
        });
    }

    const beatmapId: number = BeatmapManager.getBeatmapID(
        interaction.options.getString("beatmap", true)
    )[0];

    if (!beatmapId) {
        return interaction.editReply({
            content: MessageCreator.createReject(
                localization.getTranslation("noBeatmapFound")
            ),
        });
    }

    const submission: MapShare | null =
        await DatabaseManager.aliceDb.collections.mapShare.getByBeatmapId(
            beatmapId
        );

    if (!submission) {
        return interaction.editReply({
            content: MessageCreator.createReject(
                localization.getTranslation("noSubmissionWithBeatmap")
            ),
        });
    }

    if (submission.status !== "pending") {
        return interaction.editReply({
            content: MessageCreator.createReject(
                localization.getTranslation("submissionIsNotPending")
            ),
        });
    }

    const result: OperationResult = await submission.accept();

    if (!result.success) {
        return interaction.editReply({
            content: MessageCreator.createReject(
                localization.getTranslation("acceptFailed"),
                result.reason!
            ),
        });
    }

    interaction.editReply({
        content: MessageCreator.createAccept(
            localization.getTranslation("acceptSuccess")
        ),
    });
};

export const config: Subcommand["config"] = {
    permissions: ["SPECIAL"],
};
