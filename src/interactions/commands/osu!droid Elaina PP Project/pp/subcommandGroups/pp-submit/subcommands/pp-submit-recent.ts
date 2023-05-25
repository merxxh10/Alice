import { Constants } from "@alice-core/Constants";
import { DatabaseManager } from "@alice-database/DatabaseManager";
import { UserBindCollectionManager } from "@alice-database/managers/elainaDb/UserBindCollectionManager";
import { UserBind } from "@alice-database/utils/elainaDb/UserBind";
import { Symbols } from "@alice-enums/utils/Symbols";
import { SlashSubcommand } from "structures/core/SlashSubcommand";
import { EmbedCreator } from "@alice-utils/creators/EmbedCreator";
import { MessageCreator } from "@alice-utils/creators/MessageCreator";
import { NumberHelper } from "@alice-utils/helpers/NumberHelper";
import { bold, EmbedBuilder, GuildMember } from "discord.js";
import { Player, Score } from "@rian8337/osu-droid-utilities";
import { CommandHelper } from "@alice-utils/helpers/CommandHelper";
import { ConstantsLocalization } from "@alice-localization/core/constants/ConstantsLocalization";
import { InteractionHelper } from "@alice-utils/helpers/InteractionHelper";
import { PPLocalization } from "@alice-localization/interactions/commands/osu!droid Elaina PP Project/pp/PPLocalization";
import { PPSubmissionStatus } from "@alice-structures/dpp/PPSubmissionStatus";
import { DPPProcessorRESTManager } from "@alice-utils/managers/DPPProcessorRESTManager";

export const run: SlashSubcommand<true>["run"] = async (_, interaction) => {
    const localization: PPLocalization = new PPLocalization(
        await CommandHelper.getLocale(interaction)
    );

    await InteractionHelper.deferReply(interaction);

    const bindDbManager: UserBindCollectionManager =
        DatabaseManager.elainaDb.collections.userBind;

    const bindInfo: UserBind | null = await bindDbManager.getFromUser(
        interaction.user,
        {
            projection: {
                _id: 0,
                uid: 1,
            },
        }
    );

    if (!bindInfo) {
        return InteractionHelper.reply(interaction, {
            content: MessageCreator.createReject(
                new ConstantsLocalization(localization.language).getTranslation(
                    Constants.selfNotBindedReject
                )
            ),
        });
    }

    const player: Player | null = await Player.getInformation(bindInfo.uid);

    if (!player) {
        return InteractionHelper.reply(interaction, {
            content: MessageCreator.createReject(
                localization.getTranslation("profileNotFound")
            ),
        });
    }

    if (
        await DatabaseManager.elainaDb.collections.dppBan.isPlayerBanned(
            player.uid
        )
    ) {
        return InteractionHelper.reply(interaction, {
            content: MessageCreator.createReject(
                localization.getTranslation("uidIsBanned")
            ),
        });
    }

    const submissionAmount: number = NumberHelper.clamp(
        interaction.options.getInteger("amount") ?? 1,
        1,
        5
    );
    const submissionOffset: number =
        interaction.options.getInteger("offset") ?? 1;

    const scoresToSubmit: Score[] = player.recentPlays.slice(
        submissionOffset - 1,
        submissionAmount + submissionOffset - 1
    );

    if (scoresToSubmit.length === 0) {
        return InteractionHelper.reply(interaction, {
            content: MessageCreator.createReject(
                localization.getTranslation("noScoresInSubmittedList")
            ),
        });
    }

    const statuses: PPSubmissionStatus[] | null =
        await DPPProcessorRESTManager.submitScore(
            bindInfo.uid,
            scoresToSubmit.map((v) => v.scoreID)
        );

    const embed: EmbedBuilder = EmbedCreator.createNormalEmbed({
        author: interaction.user,
        color: (<GuildMember>interaction.member).displayColor,
    });

    embed.setTitle(localization.getTranslation("ppSubmissionInfo")).addFields(
        (
            statuses ??
            new Array<PPSubmissionStatus | undefined>(scoresToSubmit.length)
        ).map((status, i) => {
            const score: Score = scoresToSubmit[i];

            return {
                name: `${score.title} +${
                    score.mods.map((v) => v.acronym).join(",") || "No Mod"
                }`,
                value: `${score.combo}x | ${(
                    score.accuracy.value() * 100
                ).toFixed(2)}% | ${score.accuracy.nmiss} ${
                    Symbols.missIcon
                } | ${bold(
                    status?.success ? "Success" : status?.reason ?? "Unknown"
                )}`,
            };
        })
    );

    if (statuses === null || statuses.every((s) => !s.success)) {
        return InteractionHelper.reply(interaction, {
            content: MessageCreator.createReject(
                localization.getTranslation("submitFailed")
            ),
            embeds: [embed],
        });
    }

    if (statuses.some((s) => !s.success)) {
        InteractionHelper.reply(interaction, {
            content: MessageCreator.createAccept(
                localization.getTranslation("partialSubmitSuccessful")
            ),
            embeds: [embed],
        });
    }

    InteractionHelper.reply(interaction, {
        content: MessageCreator.createAccept(
            localization.getTranslation("fullSubmitSuccessful")
        ),
        embeds: [embed],
    });
};

export const config: SlashSubcommand["config"] = {
    permissions: [],
};
