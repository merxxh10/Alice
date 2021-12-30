import { Message, MessageEmbed, MessageOptions } from "discord.js";
import { EventUtil } from "@alice-interfaces/core/EventUtil";
import { DroidStarRating, MapInfo, MapStats, OsuStarRating } from "osu-droid";
import { BeatmapManager } from "@alice-utils/managers/BeatmapManager";
import { Symbols } from "@alice-enums/utils/Symbols";
import { EmbedCreator } from "@alice-utils/creators/EmbedCreator";
import { MessageCreator } from "@alice-utils/creators/MessageCreator";
import { BeatmapDifficultyHelper } from "@alice-utils/helpers/BeatmapDifficultyHelper";
import { PerformanceCalculationParameters } from "@alice-utils/dpp/PerformanceCalculationParameters";
import { YouTubeRESTManager } from "@alice-utils/managers/YouTubeRESTManager";
import { YouTubeVideoInformation } from "@alice-interfaces/youtube/YouTubeVideoInformation";
import { StarRatingCalculationResult } from "@alice-utils/dpp/StarRatingCalculationResult";
import { DroidBeatmapDifficultyHelper } from "@alice-utils/helpers/DroidBeatmapDifficultyHelper";
import { OsuBeatmapDifficultyHelper } from "@alice-utils/helpers/OsuBeatmapDifficultyHelper";

export const run: EventUtil["run"] = async (_, message: Message) => {
    if (message.author.bot) {
        return;
    }

    const ytRegex: RegExp =
        /^.*(?:(?:youtu\.be\/|v\/|vi\/|u\/\w\/|embed\/)|(?:(?:watch)?\?v(?:i)?=|&v(?:i)?=))([^#&?]+).*/;

    const calcParams: PerformanceCalculationParameters =
        BeatmapDifficultyHelper.getCalculationParamsFromMessage(
            message.content
        );

    for await (const arg of message.content.split(/\s+/g)) {
        const match: RegExpMatchArray | null = arg.match(ytRegex);

        if (!match) {
            continue;
        }

        const videoId: string = match[1];

        if (!videoId) {
            continue;
        }

        const data: YouTubeVideoInformation | null =
            await YouTubeRESTManager.getInformation(videoId);

        if (!data) {
            continue;
        }

        const description: string = data.snippet.description;

        // Limit to 3 beatmaps to prevent spam
        let validCount: number = 0;

        for await (const link of description.split(/\s+/g)) {
            if (!link.startsWith("https://osu.ppy.sh/")) {
                continue;
            }

            if (validCount === 3) {
                break;
            }

            const beatmapID: number = BeatmapManager.getBeatmapID(link)[0];
            const beatmapsetID: number =
                BeatmapManager.getBeatmapsetID(link)[0];

            // Prioritize beatmap ID over beatmapset ID
            if (beatmapID) {
                const beatmapInfo: MapInfo | null =
                    await BeatmapManager.getBeatmap(beatmapID, false);

                if (!beatmapInfo) {
                    continue;
                }

                // Beatmap cache
                BeatmapManager.setChannelLatestBeatmap(
                    message.channel.id,
                    beatmapInfo.hash
                );

                const embedOptions: MessageOptions =
                    EmbedCreator.createBeatmapEmbed(beatmapInfo);

                const embed: MessageEmbed = <MessageEmbed>(
                    embedOptions.embeds![0]
                );

                embed.spliceFields(0, embed.fields.length);

                message.channel.send(embedOptions);
            } else if (beatmapsetID) {
                // Retrieve beatmap file one by one to not overcreate requests
                const beatmapInformations: MapInfo[] =
                    await BeatmapManager.getBeatmaps(beatmapsetID, false);

                if (beatmapInformations.length === 0) {
                    return;
                }

                beatmapInformations.sort((a, b) => {
                    return b.totalDifficulty - a.totalDifficulty;
                });

                let string: string = "";

                if (beatmapInformations.length > 3) {
                    string = MessageCreator.createAccept(
                        `I found ${beatmapInformations.length} maps, but only displaying up to 3 due to my limitations.`
                    );
                }

                for await (const beatmapInfo of beatmapInformations) {
                    await beatmapInfo.retrieveBeatmapFile();
                }

                const firstBeatmap: MapInfo = beatmapInformations[0];

                const embedOptions: MessageOptions =
                    EmbedCreator.createBeatmapEmbed(firstBeatmap);

                if (string) {
                    embedOptions.content = string;
                }

                // Empty files, we don't need it here.
                embedOptions.files = [];

                const embed: MessageEmbed = <MessageEmbed>(
                    embedOptions.embeds![0]
                );

                const stats: MapStats =
                    calcParams.customStatistics ?? new MapStats();

                embed
                    .spliceFields(0, embed.fields.length)
                    .setTitle(
                        `${firstBeatmap.artist} - ${firstBeatmap.title} by ${firstBeatmap.creator}`
                    )
                    .setColor(firstBeatmap.statusColor)
                    .setAuthor({ name: "Beatmap Information" })
                    .setURL(`https://osu.ppy.sh/s/${firstBeatmap.beatmapsetID}`)
                    .setDescription(
                        `${firstBeatmap.showStatistics(1, stats)}\n` +
                            `**BPM**: ${firstBeatmap.convertBPM(
                                stats
                            )} - **Length**: ${firstBeatmap.convertTime(stats)}`
                    );

                for await (const beatmapInfo of beatmapInformations) {
                    if (embed.fields.length === 3) {
                        break;
                    }

                    const droidCalcResult: StarRatingCalculationResult<DroidStarRating> | null =
                        await DroidBeatmapDifficultyHelper.calculateBeatmapDifficulty(
                            beatmapInfo.hash,
                            calcParams
                        );

                    const osuCalcResult: StarRatingCalculationResult<OsuStarRating> | null =
                        await OsuBeatmapDifficultyHelper.calculateBeatmapDifficulty(
                            beatmapInfo.hash,
                            calcParams
                        );

                    if (!droidCalcResult || !osuCalcResult) {
                        continue;
                    }

                    embed.addField(
                        `__${
                            beatmapInfo.version
                        }__ (${droidCalcResult.result.total.toFixed(2)} ${
                            Symbols.star
                        } | ${osuCalcResult.result.total.toFixed(2)} ${
                            Symbols.star
                        })`,
                        `${beatmapInfo.showStatistics(2, stats)}\n` +
                            `**Max score**: ${beatmapInfo
                                .maxScore(stats)
                                .toLocaleString()} - **Max combo**: ${
                                beatmapInfo.maxCombo
                            }x`
                    );
                }

                message.channel.send(embedOptions);
            }

            ++validCount;
        }
    }
};

export const config: EventUtil["config"] = {
    description:
        "Responsible for loading beatmaps that is linked from YouTube.",
    togglePermissions: ["MANAGE_CHANNELS"],
    toggleScope: ["GLOBAL", "GUILD", "CHANNEL"],
};
