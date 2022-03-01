import { Translation } from "@alice-localization/base/Translation";
import { DailyStrings } from "../DailyLocalization";

/**
 * The Indonesian translation for the `daily` command.
 */
export class DailyIDTranslation extends Translation<DailyStrings> {
    override readonly translations: DailyStrings = {
        tooManyOptions: "",
        noOngoingChallenge: "",
        challengeNotFound: "",
        challengeFromReplayNotFound: "",
        startChallengeFailed: "",
        startChallengeSuccess: "",
        userHasPlayedChallenge: "",
        userHasNotPlayedChallenge: "",
        userHasNotPlayedAnyChallenge: "",
        scoreNotFound: "",
        challengeNotOngoing: "",
        challengeNotCompleted: "",
        challengeCompleted: "",
        invalidReplayURL: "",
        replayDownloadFail: "",
        replayInvalid: "",
        replayDoesntHaveSameUsername: "",
        replayTooOld: "",
        manualSubmissionConfirmation: "",
        aboutTitle: "",
        aboutDescription: "",
        aboutQuestion1: "",
        aboutAnswer1: "",
        aboutQuestion2: "",
        aboutAnswer2: "",
        aboutQuestion3: "",
        aboutAnswer3: "",
        aboutQuestion4: "",
        aboutAnswer4: "",
        aboutQuestion5: "",
        aboutAnswer5: "",
        username: "",
        uid: "",
        points: "",
        scoreStatistics: "",
        totalScore: "",
        maxCombo: "",
        accuracy: "",
        rank: "",
        time: "",
        hitGreat: "",
        hitGood: "",
        hitMeh: "",
        misses: "",
        bonusLevelReached: "",
        geki: "",
        katu: "",
        profile: "",
        challengesCompleted: "",
        statistics: "",
    };
}
