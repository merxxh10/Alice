import { Translation } from "@alice-localization/base/Translation";
import { BirthdayStrings } from "../BirthdayLocalization";

/**
 * The Korean translation for the `birthday` command.
 */
export class BirthdayKRTranslation extends Translation<BirthdayStrings> {
    override readonly translations: BirthdayStrings = {
        selfBirthdayNotExist: "죄송해요, 아직 생일을 설정하지 않으셨어요!",
        userBirthdayNotExist:
            "죄송해요, 이 유저는 아직 생일을 설정하지 않았어요!",
        setBirthdayFailed: "죄송해요, %s 로 생일을 설정할 수 없어요.",
        setBirthdaySuccess:
            "성공적으로 생일을 다음과 같이 설정했어요: %s/%s, 시간대 UTC%s.",
        birthdayInfo: "",
        date: "",
        timezone: "",
    };
}
