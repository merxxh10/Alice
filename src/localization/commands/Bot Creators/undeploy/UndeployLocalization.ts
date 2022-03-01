import { Localization } from "@alice-localization/base/Localization";
import { Translations } from "@alice-localization/base/Translations";
import { UndeployENTranslation } from "./translations/UndeployENTranslation";
import { UndeployIDTranslation } from "./translations/UndeployIDTranslation";
import { UndeployKRTranslation } from "./translations/UndeployKRTranslation";

export interface UndeployStrings {
    readonly commandNotFound: string;
    readonly commandUndeploySuccessful: string;
}

/**
 * Localizations for the `undeploy` command.
 */
export class UndeployLocalization extends Localization<UndeployStrings> {
    protected override readonly localizations: Readonly<
        Translations<UndeployStrings>
    > = {
        en: new UndeployENTranslation(),
        kr: new UndeployKRTranslation(),
        id: new UndeployIDTranslation(),
    };
}
