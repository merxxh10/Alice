import { Translation } from "@alice-localization/base/Translation";
import { MusicStrings } from "../MusicLocalization";

/**
 * The Indonesian translation for the `music` command.
 */
export class MusicIDTranslation extends Translation<MusicStrings> {
    override readonly translations: MusicStrings = {
        userIsNotInVoiceChannel:
            "Maaf, kamu harus berada dalam voice channel untuk menggunakan perintah ini!",
        botIsNotInVoiceChannel: "",
        noMusicIsPlaying: "",
        noTracksFound: "",
        playTrackFailed: "",
        playTrackSuccess: "",
        skipTrackFailed: "",
        skipTrackSuccess: "",
        pauseTrackFailed: "",
        pauseTrackSuccess: "",
        resumeTrackFailed: "",
        resumeTrackSuccess: "",
        leaveChannelFailed: "",
        leaveChannelSuccess: "",
        repeatModeFailed: "",
        repeatModeEnableSuccess: "",
        repeatModeDisableSuccess: "",
        shuffleFailed: "",
        shuffleSuccess: "",
        addQueueFailed: "",
        addQueueSuccess: "",
        removeQueueFailed: "",
        removeQueueSuccess: "",
        createCollectionFailed: "",
        createCollectionSuccess: "",
        deleteCollectionFailed: "",
        deleteCollectionSuccess: "",
        addVideoToCollectionFailed: "",
        addVideoToCollectionSuccess: "",
        removeVideoFromCollectionFailed: "",
        removeVideoFromCollectionSuccess: "",
        queueIsEmpty: "",
        selfHasNoCollection: "",
        userHasNoCollection: "",
        noCollectionWithName: "",
        collectionWithNameAlreadyExists: "",
        userDoesntOwnCollection: "",
        collectionLimitReached: "",
        enqueueFromCollectionSuccess: "",
        chooseVideo: "",
        currentQueue: "",
        requestedBy: "",
        musicInfo: "",
        playingSince: "",
        currentlyPlaying: "",
        channel: "",
        duration: "",
        none: "",
        playbackSettings: "",
        repeatMode: "",
        enabled: "",
        disabled: "",
        queue: "",
        totalCollections: "",
        createdAt: "",
        collectionOwner: "",
        creationDate: "",
        collectionLinks: "",
    };
}
