import { Translation } from "@alice-localization/base/Translation";
import { WhitelistManagerStrings } from "../WhitelistManagerLocalization";

/**
 * The Indonesian translation for the `WhitelistManager` manager utility.
 */
export class WhitelistManagerIDTranslation extends Translation<WhitelistManagerStrings> {
    override readonly translations: WhitelistManagerStrings = {
        beatmapIsBlacklisted: "",
        beatmapIsNotBlacklisted: "",
        beatmapIsNotGraveyarded: "",
    };
}
