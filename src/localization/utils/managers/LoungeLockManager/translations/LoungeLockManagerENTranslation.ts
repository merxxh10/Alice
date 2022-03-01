import { Translation } from "@alice-localization/base/Translation";
import { LoungeLockManagerStrings } from "../LoungeLockManagerLocalization";

/**
 * The English translation for the `LoungeLockManager` manager utility.
 */
export class LoungeLockManagerENTranslation extends Translation<LoungeLockManagerStrings> {
    override readonly translations: LoungeLockManagerStrings = {
        userNotLocked: "User is not locked from lounge",
    };
}
