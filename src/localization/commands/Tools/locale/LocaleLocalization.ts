import { Localization } from "@alice-localization/base/Localization";
import { Translations } from "@alice-localization/base/Translations";
import { LocaleENTranslation } from "./translations/LocaleENTranslation";
import { LocaleIDTranslation } from "./translations/LocaleIDTranslation";
import { LocaleKRTranslation } from "./translations/LocaleKRTranslation";

export interface LocaleStrings {
    readonly selectLanguage: string;
    readonly clearLocaleFailed: string;
    readonly clearLocaleSuccess: string;
    readonly setLocaleFailed: string;
    readonly setLocaleSuccess: string;
}

/**
 * Localization for the `locale` command.
 */
export class LocaleLocalization extends Localization<LocaleStrings> {
    protected override readonly localizations: Readonly<
        Translations<LocaleStrings>
    > = {
        en: new LocaleENTranslation(),
        kr: new LocaleKRTranslation(),
        id: new LocaleIDTranslation(),
    };
}
