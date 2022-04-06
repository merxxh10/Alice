import { DatabaseManager } from "@alice-database/DatabaseManager";
import { Subcommand } from "@alice-interfaces/core/Subcommand";
import { Constants } from "@alice-core/Constants";
import { MessageCreator } from "@alice-utils/creators/MessageCreator";
import { PlayerInfo } from "@alice-database/utils/aliceDb/PlayerInfo";
import { OperationResult } from "@alice-interfaces/core/OperationResult";
import { UserBind } from "@alice-database/utils/elainaDb/UserBind";
import { CoinsLocalization } from "@alice-localization/commands/Fun/coins/CoinsLocalization";
import { CommandHelper } from "@alice-utils/helpers/CommandHelper";
import { ConstantsLocalization } from "@alice-localization/core/constants/ConstantsLocalization";
import { LocaleHelper } from "@alice-utils/helpers/LocaleHelper";

export const run: Subcommand["run"] = async (_, interaction) => {
    const localization: CoinsLocalization = new CoinsLocalization(
        await CommandHelper.getLocale(interaction)
    );

    const playerInfo: PlayerInfo | null =
        await DatabaseManager.aliceDb.collections.playerInfo.getFromUser(
            interaction.user
        );

    if (playerInfo) {
        let dailyCoin: number = 50;
        const streak: number = playerInfo.streak + 1;
        const streakComplete: boolean = streak === 5;

        if (streakComplete) {
            dailyCoin += 100;
        }

        const result: OperationResult = await playerInfo.claimDailyCoins(
            dailyCoin,
            localization.language
        );

        if (!result.success) {
            return interaction.editReply({
                content: MessageCreator.createReject(
                    localization.getTranslation("dailyClaimFailed"),
                    result.reason!
                ),
            });
        }

        interaction.editReply({
            content: MessageCreator.createAccept(
                localization.getTranslation(
                    streakComplete
                        ? "dailyClaimWithStreakSuccess"
                        : "dailyClaimSuccess"
                ),
                dailyCoin.toLocaleString(
                    LocaleHelper.convertToBCP47(localization.language)
                ),
                streak.toString(),
                (playerInfo.alicecoins + dailyCoin).toLocaleString(
                    LocaleHelper.convertToBCP47(localization.language)
                )
            ),
        });
    } else {
        const bindInfo: UserBind | null =
            await DatabaseManager.elainaDb.collections.userBind.getOne({
                discordid: interaction.user.id,
            });

        if (!bindInfo) {
            const constantsLocalization: ConstantsLocalization =
                new ConstantsLocalization(localization.language);

            return interaction.editReply({
                content: MessageCreator.createReject(
                    constantsLocalization.getTranslation(
                        Constants.selfNotBindedReject
                    )
                ),
            });
        }

        const result: OperationResult =
            await DatabaseManager.aliceDb.collections.playerInfo.insert({
                username: bindInfo.username,
                uid: bindInfo.uid,
                discordid: interaction.user.id,
                hasClaimedDaily: true,
                alicecoins: 50,
                streak: 1,
            });

        if (!result.success) {
            return interaction.editReply({
                content: MessageCreator.createReject(
                    localization.getTranslation("dailyClaimFailed"),
                    result.reason!
                ),
            });
        }

        interaction.editReply({
            content: MessageCreator.createAccept(
                localization.getTranslation("dailyClaimSuccess"),
                "50",
                "1",
                "50"
            ),
        });
    }
};

export const config: Subcommand["config"] = {
    permissions: [],
};
