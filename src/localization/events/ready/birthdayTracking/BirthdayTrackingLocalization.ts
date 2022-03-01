import { Localization } from "@alice-localization/base/Localization";
import { Translations } from "@alice-localization/base/Translations";
import { BirthdayTrackingENTranslation } from "./translations/BirthdayTrackingENTranslation";
import { BirthdayTrackingIDTranslation } from "./translations/BirthdayTrackingIDTranslation";
import { BirthdayTrackingKRTranslation } from "./translations/BirthdayTrackingKRTranslation";

export interface BirthdayTrackingStrings {
    readonly happyBirthday: string;
}

/**
 * Localizations for the `birthdayTracking` event utility in `ready` event.
 */
export class BirthdayTrackingLocalization extends Localization<BirthdayTrackingStrings> {
    protected override readonly localizations: Readonly<
        Translations<BirthdayTrackingStrings>
    > = {
        en: new BirthdayTrackingENTranslation(),
        kr: new BirthdayTrackingKRTranslation(),
        id: new BirthdayTrackingIDTranslation(),
    };
}
