import { Translation } from "@alice-localization/base/Translation";
import { SubmitStrings } from "../SubmitLocalization";

/**
 * The Korean translation for the `submit` command.
 */
export class SubmitKRTranslation extends Translation<SubmitStrings> {
    override readonly translations: SubmitStrings = {
        commandNotAllowed:
            "죄송해요, 이 명령어는 이 채널에서 사용할 수 없어요.",
        uidIsBanned:
            "죄송해요, 현재 당신이 바인딩된 osu!droid 계정은 dpp-ban을 당했어요.",
        beatmapNotFound: "저기, 제출할 유효한 비트맵을 주세요!",
        beatmapIsBlacklisted: "죄송해요, 이 비트맵은 블랙리스트에 있어요.",
        beatmapNotWhitelisted:
            "죄송해요, 현재 PP 시스템은 오직 ranked, approved, loved 상태 또는 화이트리스트된 비트맵만 받고 있어요!",
        beatmapTooShort:
            "죄송해요, 이 비트맵은 너무 짧거나(30초 미만) 매핑된 부분이 음악 길이의 60% 미만이에요.",
        noScoreSubmitted: "죄송해요, 당신은 이 비트맵에 제출한 기록이 없어요!",
        noScoresInSubmittedList:
            "죄송해요, 당신은 해당 범위에서 제출할 기록을 가지고 있지 않아요!",
        scoreUsesForceAR: "죄송해요, AR 강제(force AR)은 허용되지 않아요!",
        scoreUsesCustomSpeedMultiplier:
            "죄송해요, 커스텀 속도 조절(custom speed multiplier)은 허용되지 않아요!",
        submitSuccessful:
            "성공적으로 기록을 제출했어요. 더 많은 정보는 첨부해 드렸어요.",
        profileNotFound: "죄송해요, 당신의 프로필을 찾을 수 없었어요!",
        totalPP: "총 PP",
        ppGained: "얻은 PP",
        rankedScore: "Ranked 점수",
        scoreGained: "얻은 점수",
        currentLevel: "현재 레벨",
        levelUp: "레벨 업!",
        scoreNeeded: "레벨 업에 필요한 점수",
        ppSubmissionInfo: "PP 제출 정보",
        blacklistedBeatmapReject: "블랙리스트된 비트맵",
        unrankedBeatmapReject: "언랭크드(Unranked) 비트맵",
        beatmapTooShortReject: "비트맵 너무 짧음",
        unrankedFeaturesReject: "Unranked 기능",
        beatmapNotFoundReject: "비트맵 발견되지 않음",
    };
}
