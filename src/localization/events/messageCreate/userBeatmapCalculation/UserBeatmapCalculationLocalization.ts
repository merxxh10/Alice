import { Localization } from "@alice-localization/base/Localization";
import { Translations } from "@alice-localization/base/Translations";
import { UserBeatmapCalculationENTranslation } from "./translations/UserBeatmapCalculationENTranslation";
import { UserBeatmapCalculationIDTranslation } from "./translations/UserBeatmapCalculationIDTranslation";
import { UserBeatmapCalculationKRTranslation } from "./translations/UserBeatmapCalculationKRTranslation";

export interface UserBeatmapCalculationStrings {
    readonly droidStars: string;
    readonly droidPP: string;
    readonly pcStars: string;
    readonly pcPP: string;
    readonly beatmapLimitation: string;
}

/**
 * Localizations for the `userBeatmapCalculation` event utility in `messageCreate` event.
 */
export class UserBeatmapCalculationLocalization extends Localization<UserBeatmapCalculationStrings> {
    protected override readonly localizations: Readonly<
        Translations<UserBeatmapCalculationStrings>
    > = {
        en: new UserBeatmapCalculationENTranslation(),
        kr: new UserBeatmapCalculationKRTranslation(),
        id: new UserBeatmapCalculationIDTranslation(),
    };
}
