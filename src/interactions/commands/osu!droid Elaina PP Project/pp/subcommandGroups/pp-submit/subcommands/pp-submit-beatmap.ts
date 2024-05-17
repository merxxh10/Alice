import { SlashSubcommand } from "structures/core/SlashSubcommand";
import { MessageCreator } from "@alice-utils/creators/MessageCreator";
import { BeatmapManager } from "@alice-utils/managers/BeatmapManager";
import { DatabaseManager } from "@alice-database/DatabaseManager";
import { Constants } from "@alice-core/Constants";
import { Accuracy, MapInfo } from "@rian8337/osu-base";
import { Score } from "@rian8337/osu-droid-utilities";
import { CommandHelper } from "@alice-utils/helpers/CommandHelper";
import { ConstantsLocalization } from "@alice-localization/core/constants/ConstantsLocalization";
import { InteractionHelper } from "@alice-utils/helpers/InteractionHelper";
import { PPLocalization } from "@alice-localization/interactions/commands/osu!droid Elaina PP Project/pp/PPLocalization";
import { DPPProcessorRESTManager } from "@alice-utils/managers/DPPProcessorRESTManager";
import { EmbedCreator } from "@alice-utils/creators/EmbedCreator";
import { GuildMember, bold } from "discord.js";
import { Symbols } from "@alice-enums/utils/Symbols";
import { NumberHelper } from "@alice-utils/helpers/NumberHelper";
import { LocaleHelper } from "@alice-utils/helpers/LocaleHelper";
import { DroidHelper } from "@alice-utils/helpers/DroidHelper";

export const run: SlashSubcommand<true>["run"] = async (_, interaction) => {
    const localization = new PPLocalization(
        await CommandHelper.getLocale(interaction),
    );

    await InteractionHelper.deferReply(interaction);

    const bindDbManager = DatabaseManager.elainaDb.collections.userBind;

    const bindInfo = await bindDbManager.getFromUser(interaction.user, {
        projection: {
            _id: 0,
            uid: 1,
        },
    });

    if (!bindInfo) {
        return InteractionHelper.reply(interaction, {
            content: MessageCreator.createReject(
                new ConstantsLocalization(localization.language).getTranslation(
                    Constants.selfNotBindedReject,
                ),
            ),
        });
    }

    const beatmapID = BeatmapManager.getBeatmapID(
        interaction.options.getString("beatmap", true),
    )[0];

    if (!beatmapID) {
        return InteractionHelper.reply(interaction, {
            content: MessageCreator.createReject(
                localization.getTranslation("beatmapNotFound"),
            ),
        });
    }

    const beatmapInfo: MapInfo | null = await BeatmapManager.getBeatmap(
        beatmapID,
        { checkFile: false },
    );

    if (!beatmapInfo) {
        return InteractionHelper.reply(interaction, {
            content: MessageCreator.createReject(
                localization.getTranslation("beatmapNotFound"),
            ),
        });
    }

    const score = await DroidHelper.getScore(bindInfo.uid, beatmapInfo.hash, [
        "id",
        "filename",
        "combo",
        "perfect",
        "good",
        "bad",
        "miss",
        "mode",
    ]);

    if (!score) {
        return InteractionHelper.reply(interaction, {
            content: MessageCreator.createReject(
                localization.getTranslation("noScoreSubmitted"),
            ),
        });
    }

    const result = await DPPProcessorRESTManager.submitScores(bindInfo.uid, [
        score instanceof Score ? score.scoreID : score.id,
    ]);

    const embed = EmbedCreator.createNormalEmbed({
        author: interaction.user,
        color: (<GuildMember>interaction.member).displayColor,
    });

    const BCP47 = LocaleHelper.convertToBCP47(localization.language);
    const accuracy =
        score instanceof Score
            ? score.accuracy
            : new Accuracy({
                  n300: score.perfect,
                  n100: score.good,
                  n50: score.bad,
                  nmiss: score.miss,
              });

    embed
        .setTitle(localization.getTranslation("ppSubmissionInfo"))
        .setDescription(
            `${localization.getTranslation("totalPP")}: ${bold(
                (result?.newTotalPP ?? 0).toLocaleString(BCP47),
            )}pp\n` +
                `${localization.getTranslation("ppGained")}: ${bold(
                    (result?.ppGained ?? 0).toLocaleString(BCP47),
                )}pp`,
        )
        .addFields({
            name: `${beatmapInfo?.fullTitle ?? (score instanceof Score ? score.title : DroidHelper.cleanupFilename(score.filename))} ${
                score instanceof Score
                    ? score.completeModString
                    : DroidHelper.getCompleteModString(score.mode)
            }`,
            value: `${score.combo}x | ${(accuracy.value() * 100).toFixed(
                2,
            )}% | ${accuracy.nmiss} ${Symbols.missIcon} | ${bold(
                `${NumberHelper.round(result?.statuses[0]?.pp ?? 0, 2)}pp`,
            )} | ${bold(
                result?.statuses[0]?.success
                    ? "Success"
                    : result?.statuses[0].reason ?? "Unknown",
            )}`,
        });

    if (
        !result ||
        result.statuses.length === 0 ||
        !result.statuses[0].success
    ) {
        return InteractionHelper.reply(interaction, {
            content: MessageCreator.createReject(
                localization.getTranslation("submitFailed"),
            ),
            embeds: [embed],
        });
    }

    InteractionHelper.reply(interaction, {
        content: MessageCreator.createAccept("Submission success."),
        embeds: [embed],
    });
};

export const config: SlashSubcommand["config"] = {
    permissions: [],
};
