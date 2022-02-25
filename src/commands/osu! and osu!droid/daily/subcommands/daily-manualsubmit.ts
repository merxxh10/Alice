import { Constants } from "@alice-core/Constants";
import { DatabaseManager } from "@alice-database/DatabaseManager";
import { PlayerInfoCollectionManager } from "@alice-database/managers/aliceDb/PlayerInfoCollectionManager";
import { Challenge } from "@alice-database/utils/aliceDb/Challenge";
import { PlayerInfo } from "@alice-database/utils/aliceDb/PlayerInfo";
import { Clan } from "@alice-database/utils/elainaDb/Clan";
import { UserBind } from "@alice-database/utils/elainaDb/UserBind";
import { ChallengeCompletionData } from "@alice-interfaces/challenge/ChallengeCompletionData";
import { OperationResult } from "@alice-interfaces/core/OperationResult";
import { Subcommand } from "@alice-interfaces/core/Subcommand";
import { DailyLocalization } from "@alice-localization/commands/osu! and osu!droid/DailyLocalization";
import { ConstantsLocalization } from "@alice-localization/core/ConstantsLocalization";
import { EmbedCreator } from "@alice-utils/creators/EmbedCreator";
import { MessageButtonCreator } from "@alice-utils/creators/MessageButtonCreator";
import { MessageCreator } from "@alice-utils/creators/MessageCreator";
import { CommandHelper } from "@alice-utils/helpers/CommandHelper";
import { DateTimeFormatHelper } from "@alice-utils/helpers/DateTimeFormatHelper";
import { LocaleHelper } from "@alice-utils/helpers/LocaleHelper";
import { PermissionHelper } from "@alice-utils/helpers/PermissionHelper";
import { StringHelper } from "@alice-utils/helpers/StringHelper";
import { RESTManager } from "@alice-utils/managers/RESTManager";
import { RequestResponse } from "@rian8337/osu-base";
import {
    ReplayAnalyzer,
    ReplayData,
} from "@rian8337/osu-droid-replay-analyzer";
import { Player } from "@rian8337/osu-droid-utilities";
import { Collection, GuildMember, MessageEmbed, Snowflake } from "discord.js";

export const run: Subcommand["run"] = async (client, interaction) => {
    const localization: DailyLocalization = new DailyLocalization(
        await CommandHelper.getLocale(interaction)
    );

    const url: string = interaction.options.getString("replayurl", true);

    if (!StringHelper.isValidURL(url)) {
        return interaction.editReply({
            content: MessageCreator.createReject(
                localization.getTranslation("invalidReplayURL")
            ),
        });
    }

    const bindInfo: UserBind | null =
        await DatabaseManager.elainaDb.collections.userBind.getFromUser(
            interaction.user
        );

    if (!bindInfo) {
        return interaction.editReply({
            content: MessageCreator.createReject(
                new ConstantsLocalization(localization.language).getTranslation(
                    Constants.selfNotBindedReject
                )
            ),
        });
    }

    // TODO: replace with attachments
    const replayData: RequestResponse = await RESTManager.request(url);

    if (replayData.statusCode !== 200) {
        return interaction.editReply({
            content: MessageCreator.createReject(
                localization.getTranslation("replayDownloadFail")
            ),
        });
    }

    const replayAnalyzer: ReplayAnalyzer = new ReplayAnalyzer({ scoreID: 0 });

    replayAnalyzer.originalODR = replayData.data;

    try {
        await replayAnalyzer.analyze();
    } catch {
        return interaction.editReply({
            content: MessageCreator.createReject(
                localization.getTranslation("replayInvalid")
            ),
        });
    }

    const data: ReplayData = replayAnalyzer.data!;

    if (data.playerName !== bindInfo.username) {
        return interaction.editReply({
            content: MessageCreator.createReject(
                localization.getTranslation("replayDoesntHaveSameUsername")
            ),
        });
    }

    if (data.replayVersion < 3) {
        return interaction.editReply({
            content: MessageCreator.createReject(
                localization.getTranslation("replayTooOld")
            ),
        });
    }

    const challenge: Challenge | null =
        await DatabaseManager.aliceDb.collections.challenge.getFromHash(
            data.hash
        );

    if (!challenge) {
        return interaction.editReply({
            content: MessageCreator.createReject(
                localization.getTranslation("challengeFromReplayNotFound")
            ),
        });
    }

    if (!challenge.isOngoing) {
        return interaction.editReply({
            content: MessageCreator.createReject(
                localization.getTranslation("challengeNotOngoing")
            ),
        });
    }

    const completionStatus: OperationResult =
        await challenge.checkReplayCompletion(
            replayAnalyzer,
            localization.language
        );

    if (!completionStatus.success) {
        return interaction.editReply({
            content: MessageCreator.createReject(
                localization.getTranslation("challengeNotCompleted"),
                completionStatus.reason!
            ),
        });
    }

    const bonusLevel: number = await challenge.calculateBonusLevel(
        replayAnalyzer
    );

    const playerInfoDbManager: PlayerInfoCollectionManager =
        DatabaseManager.aliceDb.collections.playerInfo;

    const playerInfo: PlayerInfo | null = await playerInfoDbManager.getFromUser(
        interaction.user
    );

    // Ask for verification from staff
    const staffMembers: Collection<Snowflake, GuildMember> =
        await PermissionHelper.getMainGuildStaffMembers(client);

    const embed: MessageEmbed = EmbedCreator.createNormalEmbed({
        author: interaction.user,
        color: (<GuildMember>interaction.member).displayColor,
    });

    embed
        .setTitle(localization.getTranslation("scoreStatistics"))
        .setDescription(
            `**${localization.getTranslation("totalScore")}**: ${
                data.score
            }\n` +
                `**${localization.getTranslation("maxCombo")}**: ${
                    data.maxCombo
                }x\n` +
                `**${localization.getTranslation("accuracy")}**: ${(
                    data.accuracy.value() * 100
                ).toFixed(2)}%\n` +
                `**${localization.getTranslation("rank")}**: ${data.rank}\n` +
                `**${localization.getTranslation(
                    "time"
                )}**: ${DateTimeFormatHelper.dateToLocaleString(
                    data.time,
                    localization.language
                )}\n\n` +
                `**${localization.getTranslation("hitGreat")}**: ${
                    data.accuracy.n300
                } (${data.hit300k} ${localization.getTranslation(
                    "geki"
                )} + ${localization.getTranslation("katu")})\n` +
                `**${localization.getTranslation("hitGood")}**: ${
                    data.accuracy.n100
                } (${data.hit100k} ${localization.getTranslation("katu")})\n` +
                `**${localization.getTranslation("hitMeh")}**: ${
                    data.accuracy.n50
                }\n` +
                `**${localization.getTranslation("misses")}**: ${
                    data.accuracy.nmiss
                }\n\n` +
                `**${localization.getTranslation(
                    "bonusLevelReached"
                )}**: ${bonusLevel}`
        );

    const confirmation: boolean = await MessageButtonCreator.createConfirmation(
        interaction,
        {
            content: MessageCreator.createWarn(
                localization.getTranslation("manualSubmissionConfirmation")
            ),
            embeds: [embed],
        },
        [...staffMembers.keys()],
        30,
        localization.language
    );

    if (!confirmation) {
        return;
    }

    // Keep track of how many points are gained
    let pointsGained: number = bonusLevel * 2 + challenge.points;

    if (playerInfo) {
        const challengeData: ChallengeCompletionData | undefined =
            playerInfo.challenges.get(challenge.challengeid);

        if (challengeData) {
            // Player has completed challenge. Subtract the challenge's original points
            // and difference from highest challenge level
            pointsGained -=
                challenge.points +
                (challengeData.highestLevel -
                    Math.max(0, bonusLevel - challengeData.highestLevel)) *
                    2;

            challengeData.highestLevel = Math.max(
                bonusLevel,
                challengeData.highestLevel
            );
        } else {
            playerInfo.challenges.set(challenge.challengeid, {
                id: challenge.challengeid,
                highestLevel: bonusLevel,
            });
        }

        await playerInfoDbManager.update(
            { discordid: interaction.user.id },
            {
                $set: {
                    challenges: [...playerInfo.challenges.values()],
                },
                $inc: {
                    alicecoins: pointsGained * 2,
                    points: pointsGained,
                },
            }
        );
    } else {
        const player: Player = await Player.getInformation({
            uid: bindInfo.uid,
        });

        await playerInfoDbManager.insert({
            uid: player.uid,
            username: player.username,
            discordid: interaction.user.id,
            points: pointsGained,
            alicecoins: pointsGained * 2,
            challenges: [
                {
                    id: challenge.challengeid,
                    highestLevel: bonusLevel,
                },
            ],
        });
    }

    if (bindInfo.clan) {
        const clan: Clan =
            (await DatabaseManager.elainaDb.collections.clan.getFromName(
                bindInfo.clan
            ))!;

        clan.incrementPower(pointsGained);

        await clan.updateClan();
    }

    interaction.editReply({
        content: MessageCreator.createAccept(
            localization.getTranslation("challengeCompleted"),
            challenge.challengeid,
            bonusLevel.toLocaleString(
                LocaleHelper.convertToBCP47(localization.language)
            ),
            pointsGained.toLocaleString(
                LocaleHelper.convertToBCP47(localization.language)
            ),
            (pointsGained * 2).toLocaleString(
                LocaleHelper.convertToBCP47(localization.language)
            ),
            ((playerInfo?.points ?? 0) + pointsGained).toLocaleString(
                LocaleHelper.convertToBCP47(localization.language)
            ),
            ((playerInfo?.alicecoins ?? 0) + pointsGained * 2).toLocaleString(
                LocaleHelper.convertToBCP47(localization.language)
            )
        ),
    });
};

export const config: Subcommand["config"] = {
    permissions: [],
};
