import { DatabaseManager } from "@alice-database/DatabaseManager";
import { UserBind } from "@alice-database/utils/elainaDb/UserBind";
import { DPPSubmissionValidity } from "@alice-enums/utils/DPPSubmissionValidity";
import { Symbols } from "@alice-enums/utils/Symbols";
import { PPEntry } from "@alice-structures/dpp/PPEntry";
import { OnButtonPageChange } from "@alice-structures/utils/OnButtonPageChange";
import { EmbedCreator } from "@alice-utils/creators/EmbedCreator";
import { MessageButtonCreator } from "@alice-utils/creators/MessageButtonCreator";
import { BeatmapManager } from "@alice-utils/managers/BeatmapManager";
import { DiscordBackendRESTManager } from "@alice-utils/managers/DiscordBackendRESTManager";
import { WhitelistManager } from "@alice-utils/managers/WhitelistManager";
import { Accuracy, MapInfo, RankedStatus, Utils } from "@rian8337/osu-base";
import {
    DroidDifficultyAttributes,
    OsuDifficultyAttributes,
} from "@rian8337/osu-difficulty-calculator";
import {
    DroidDifficultyAttributes as RebalanceDroidDifficultyAttributes,
    OsuDifficultyAttributes as RebalanceOsuDifficultyAttributes,
} from "@rian8337/osu-rebalance-difficulty-calculator";
import { Score } from "@rian8337/osu-droid-utilities";
import {
    Collection,
    EmbedBuilder,
    RepliableInteraction,
    Snowflake,
    underscore,
} from "discord.js";
import { CommandHelper } from "./CommandHelper";
import { NumberHelper } from "./NumberHelper";
import { CacheableDifficultyAttributes } from "@alice-structures/difficultyattributes/CacheableDifficultyAttributes";
import { DroidPerformanceAttributes } from "@alice-structures/difficultyattributes/DroidPerformanceAttributes";
import { OsuPerformanceAttributes } from "@alice-structures/difficultyattributes/OsuPerformanceAttributes";
import { CompleteCalculationAttributes } from "@alice-structures/difficultyattributes/CompleteCalculationAttributes";
import { ResponseDifficultyAttributes } from "@alice-structures/difficultyattributes/ResponseDifficultyAttributes";

/**
 * A helper for droid performance points related things.
 */
export abstract class DPPHelper {
    /**
     * The ID of the role that permits pp-related moderation actions.
     */
    static readonly ppModeratorRole: Snowflake = "551662194270404644";

    /**
     * Checks a beatmap's submission validity.
     *
     * @param beatmap The beatmap.
     * @returns The validity of the beatmap.
     */
    static async checkSubmissionValidity(
        beatmap: MapInfo,
    ): Promise<DPPSubmissionValidity>;

    /**
     * Checks a score's submission validity.
     *
     * @param score The score.
     * @returns The validity of the score.
     */
    static async checkSubmissionValidity(
        score: Score,
    ): Promise<DPPSubmissionValidity>;

    static async checkSubmissionValidity(
        beatmapOrScore: Score | MapInfo,
    ): Promise<DPPSubmissionValidity> {
        const beatmapInfo: MapInfo | null =
            beatmapOrScore instanceof MapInfo
                ? beatmapOrScore
                : await BeatmapManager.getBeatmap(beatmapOrScore.hash, {
                      checkFile: false,
                  });

        if (!beatmapInfo) {
            return DPPSubmissionValidity.beatmapNotFound;
        }

        switch (true) {
            case beatmapOrScore instanceof Score &&
                beatmapOrScore.forcedAR !== undefined:
                return DPPSubmissionValidity.scoreUsesForceAR;
            case beatmapInfo.approved === RankedStatus.loved &&
                (beatmapInfo.hitLength < 30 ||
                    beatmapInfo.hitLength / beatmapInfo.totalLength < 0.6):
                return DPPSubmissionValidity.beatmapTooShort;
            case await WhitelistManager.isBlacklisted(beatmapInfo.beatmapId):
                return DPPSubmissionValidity.beatmapIsBlacklisted;
            case WhitelistManager.beatmapNeedsWhitelisting(
                beatmapInfo.approved,
            ) &&
                (await WhitelistManager.getBeatmapWhitelistStatus(
                    beatmapInfo.hash,
                )) !== "updated":
                return DPPSubmissionValidity.beatmapNotWhitelisted;
            default:
                return DPPSubmissionValidity.valid;
        }
    }

    /**
     * Displays a DPP list as a response to an interaction.
     *
     * @param interaction The interaction to respond to.
     * @param playerInfo The player's information.
     * @param page The initial page to display.
     */
    static async displayDPPList(
        interaction: RepliableInteraction,
        playerInfo: UserBind,
        page: number,
    ): Promise<void> {
        const ppRank: number =
            await DatabaseManager.elainaDb.collections.userBind.getUserDPPRank(
                playerInfo.pptotal,
            );

        const embed: EmbedBuilder = await EmbedCreator.createDPPListEmbed(
            interaction,
            playerInfo,
            ppRank,
            await CommandHelper.getLocale(interaction),
        );

        const list: PPEntry[] = [...playerInfo.pp.values()];

        const onPageChange: OnButtonPageChange = async (_, page) => {
            for (let i = 5 * (page - 1); i < 5 + 5 * (page - 1); ++i) {
                const pp: PPEntry | undefined = list[i];

                if (pp) {
                    let modstring = pp.mods ? `+${pp.mods}` : "";
                    if (
                        pp.forcedAR ||
                        (pp.speedMultiplier && pp.speedMultiplier !== 1)
                    ) {
                        if (pp.mods) {
                            modstring += " ";
                        }

                        modstring += "(";

                        if (pp.forcedAR) {
                            modstring += `AR${pp.forcedAR}`;
                        }

                        if (pp.speedMultiplier && pp.speedMultiplier !== 1) {
                            if (pp.forcedAR) {
                                modstring += ", ";
                            }

                            modstring += `${pp.speedMultiplier}x`;
                        }

                        modstring += ")";
                    }

                    embed.addFields({
                        name: `${i + 1}. ${pp.title} ${modstring}`,
                        value: `${pp.combo}x | ${pp.accuracy.toFixed(2)}% | ${
                            pp.miss
                        } ${Symbols.missIcon} | ${underscore(
                            `${pp.pp} pp`,
                        )} (Net pp: ${(pp.pp * Math.pow(0.95, i)).toFixed(
                            2,
                        )} pp)`,
                    });
                } else {
                    embed.addFields({ name: `${i + 1}. -`, value: "-" });
                }
            }
        };

        MessageButtonCreator.createLimitedButtonBasedPaging(
            interaction,
            { embeds: [embed] },
            [interaction.user.id],
            Math.max(page, 1),
            Math.ceil(playerInfo.pp.size / 5),
            120,
            onPageChange,
        );
    }

    /**
     * Inserts a score into a list of dpp plays.
     *
     * @param dppList The list of dpp plays, mapped by hash.
     * @param entries The plays to add.
     * @returns An array of booleans denoting whether the scores were inserted.
     */
    static insertScore(
        dppList: Collection<string, PPEntry>,
        entries: PPEntry[],
    ): boolean[] {
        let needsSorting: boolean = false;

        for (const entry of entries) {
            if (isNaN(entry.pp)) {
                continue;
            }

            if (
                (dppList.get(entry.hash)?.pp ?? 0) >= entry.pp ||
                (dppList.size === 75 && dppList.last()!.pp >= entry.pp)
            ) {
                continue;
            }

            needsSorting = true;

            dppList.set(entry.hash, entry);
        }

        if (needsSorting) {
            dppList.sort((a, b) => b.pp - a.pp);
        }

        const wasInserted: boolean[] = Utils.initializeArray(
            entries.length,
            true,
        );

        while (dppList.size > 75) {
            const lastEntry: PPEntry = dppList.last()!;

            for (let i = 0; i < entries.length; ++i) {
                if (lastEntry.hash !== entries[i].hash) {
                    continue;
                }

                wasInserted[i] = false;
                break;
            }

            dppList.delete(dppList.lastKey()!);
        }

        return wasInserted;
    }

    /**
     * Checks whether a PP entry will be kept once it's entered to the list.
     *
     * @param dppList The list of dpp plays.
     * @param entry The entry to check.
     * @returns Whether the PP entry will be kept.
     */
    static checkScoreInsertion(
        dppList: Collection<string, PPEntry>,
        entry: PPEntry,
    ): boolean {
        if (dppList.size < 75) {
            return true;
        }

        if (
            dppList.has(entry.hash) &&
            dppList.get(entry.hash)!.pp >= entry.pp
        ) {
            return false;
        }

        return (dppList.last()?.pp ?? 0) < entry.pp;
    }

    /**
     * Converts a score to PP entry.
     *
     * @param beatmapTitle The title of the beatmap.
     * @param score The score to convert.
     * @param attributes The calculation attributes of the score.
     * @returns A PP entry from the score and calculation result.
     */
    static scoreToPPEntry(
        beatmapTitle: string,
        score: Score,
        attributes: CompleteCalculationAttributes<
            DroidDifficultyAttributes,
            DroidPerformanceAttributes
        >,
    ): PPEntry {
        const { params, difficulty, performance } = attributes;
        const { customStatistics, accuracy: accuracyData } = params;
        const accuracy = new Accuracy(accuracyData);

        return {
            uid: score.uid,
            hash: score.hash,
            title: beatmapTitle,
            pp: NumberHelper.round(performance.total, 2),
            mods: difficulty.mods,
            accuracy: NumberHelper.round(accuracy.value() * 100, 2),
            combo: params.combo,
            miss: accuracy.nmiss,
            speedMultiplier:
                customStatistics.speedMultiplier !== 1
                    ? customStatistics.speedMultiplier
                    : undefined,
        };
    }

    /**
     * Calculates the weighted accuracy of a dpp list.
     *
     * @param dppList The list.
     * @returns The weighted accuracy of the list.
     */
    static calculateWeightedAccuracy(
        dppList: Collection<string, PPEntry>,
    ): number {
        if (dppList.size === 0) {
            return 0;
        }

        let accSum: number = 0;
        let weight: number = 0;
        let i: number = 0;

        for (const pp of dppList.values()) {
            accSum += pp.accuracy * Math.pow(0.95, i);
            weight += Math.pow(0.95, i);
            ++i;
        }

        return accSum / weight;
    }

    /**
     * Calculates the final performance points from a list of pp entries.
     *
     * @param list The list.
     * @returns The final performance points.
     */
    static calculateFinalPerformancePoints(
        list: Collection<string, PPEntry>,
        playCount: number,
    ): number {
        return (
            // Main pp portion
            [...list.values()]
                .sort((a, b) => b.pp - a.pp)
                .reduce((a, v, i) => a + v.pp * Math.pow(0.95, i), 0) +
            // Bonus pp portion
            // TODO: uncomment this after rebalance
            // (1250 / 3) * (1 - Math.pow(0.9992, playCount))
            0
        );
    }

    /**
     * Deletes a beatmap with specific hash from all players.
     *
     * @param hash The beatmap's hash.
     */
    static async deletePlays(hash: string): Promise<void> {
        const toUpdateList: Collection<string, UserBind> =
            await DatabaseManager.elainaDb.collections.userBind.get(
                "discordid",
                { "pp.hash": hash },
                { projection: { _id: 0, discordid: 1, pp: 1, playc: 1 } },
            );

        for (const toUpdate of toUpdateList.values()) {
            toUpdate.pp.delete(hash);

            await DiscordBackendRESTManager.updateMetadata(toUpdate.discordid);

            await DatabaseManager.elainaDb.collections.userBind.updateOne(
                { discordid: toUpdate.discordid },
                {
                    $set: {
                        pptotal: this.calculateFinalPerformancePoints(
                            toUpdate.pp,
                            Math.max(0, toUpdate.playc - 1),
                        ),
                        playc: Math.max(0, toUpdate.playc - 1),
                    },
                    $pull: {
                        pp: {
                            hash: hash,
                        },
                    },
                },
            );
        }
    }

    /**
     * Generates a string containing information about a difficulty attributes' star rating.
     *
     * @param attributes The difficulty attributes.
     * @returns The string.
     */
    static getDroidDifficultyAttributesInfo(
        attributes:
            | DroidDifficultyAttributes
            | ResponseDifficultyAttributes<DroidDifficultyAttributes>,
    ): string {
        let string: string = `${attributes.starRating.toFixed(2)} stars (`;
        const starRatingDetails: string[] = [];

        const addDetail = (num: number, suffix: string) =>
            starRatingDetails.push(`${num.toFixed(2)} ${suffix}`);

        addDetail(attributes.aimDifficulty, "aim");
        addDetail(attributes.tapDifficulty, "tap");
        addDetail(attributes.rhythmDifficulty, "rhythm");
        addDetail(attributes.flashlightDifficulty, "flashlight");
        addDetail(attributes.visualDifficulty, "visual");

        string += starRatingDetails.join(", ") + ")";

        return string;
    }

    /**
     * Generates a string containing information about a difficulty attributes' star rating.
     *
     * @param attributes The difficulty attributes.
     * @returns The string.
     */
    static getRebalanceDroidDifficultyAttributesInfo(
        attributes:
            | RebalanceDroidDifficultyAttributes
            | ResponseDifficultyAttributes<RebalanceDroidDifficultyAttributes>,
    ): string {
        let string: string = `${attributes.starRating.toFixed(2)} stars (`;
        const starRatingDetails: string[] = [];

        const addDetail = (num: number, suffix: string) =>
            starRatingDetails.push(`${num.toFixed(2)} ${suffix}`);

        addDetail(attributes.aimDifficulty, "aim");
        addDetail(attributes.tapDifficulty, "tap");
        addDetail(attributes.rhythmDifficulty, "rhythm");
        addDetail(attributes.flashlightDifficulty, "flashlight");
        addDetail(attributes.visualDifficulty, "visual");

        string += starRatingDetails.join(", ") + ")";

        return string;
    }

    /**
     * Generates a string containing information about a difficulty attributes' star rating.
     *
     * @param attributes The difficulty attributes.
     * @returns The string.
     */
    static getOsuDifficultyAttributesInfo(
        attributes:
            | OsuDifficultyAttributes
            | CacheableDifficultyAttributes<OsuDifficultyAttributes>,
    ): string {
        let string: string = `${attributes.starRating.toFixed(2)} stars (`;
        const starRatingDetails: string[] = [];

        const addDetail = (num: number, suffix: string) =>
            starRatingDetails.push(`${num.toFixed(2)} ${suffix}`);

        addDetail(attributes.aimDifficulty, "aim");
        addDetail(attributes.speedDifficulty, "speed");
        addDetail(attributes.flashlightDifficulty, "flashlight");

        string += starRatingDetails.join(", ") + ")";

        return string;
    }

    /**
     * Generates a string containing information about a difficulty attributes' star rating.
     *
     * @param attributes The difficulty attributes.
     * @returns The string.
     */
    static getRebalanceOsuDifficultyAttributesInfo(
        attributes:
            | RebalanceOsuDifficultyAttributes
            | ResponseDifficultyAttributes<RebalanceOsuDifficultyAttributes>,
    ): string {
        let string: string = `${attributes.starRating.toFixed(2)} stars (`;
        const starRatingDetails: string[] = [];

        const addDetail = (num: number, suffix: string) =>
            starRatingDetails.push(`${num.toFixed(2)} ${suffix}`);

        addDetail(attributes.aimDifficulty, "aim");
        addDetail(attributes.speedDifficulty, "speed");
        addDetail(attributes.flashlightDifficulty, "flashlight");

        string += starRatingDetails.join(", ") + ")";

        return string;
    }

    /**
     * Generates a string containing the summary of a performance attributes.
     *
     * @param attributes The performance attributes.
     * @returns The string.
     */
    static getDroidPerformanceAttributesInfo(
        attributes: DroidPerformanceAttributes,
    ): string {
        let string: string = `${attributes.total.toFixed(2)} pp (`;
        const starRatingDetails: string[] = [];

        const addDetail = (num: number, suffix: string) =>
            starRatingDetails.push(`${num.toFixed(2)} ${suffix}`);

        addDetail(attributes.aim, "aim");
        addDetail(attributes.tap, "tap");
        addDetail(attributes.accuracy, "accuracy");
        addDetail(attributes.flashlight, "flashlight");
        addDetail(attributes.visual, "visual");

        string += starRatingDetails.join(", ") + ")";

        return string;
    }

    /**
     * Generates a string containing the summary of a performance attributes.
     *
     * @param attributes The performance attributes.
     * @returns The string.
     */
    static getOsuPerformanceAttributesInfo(
        attributes: OsuPerformanceAttributes,
    ): string {
        let string: string = `${attributes.total.toFixed(2)} pp (`;
        const starRatingDetails: string[] = [];

        const addDetail = (num: number, suffix: string) =>
            starRatingDetails.push(`${num.toFixed(2)} ${suffix}`);

        addDetail(attributes.aim, "aim");
        addDetail(attributes.speed, "speed");
        addDetail(attributes.accuracy, "accuracy");
        addDetail(attributes.flashlight, "flashlight");

        string += starRatingDetails.join(", ") + ")";

        return string;
    }
}
