import { MultiplayerPlayer } from "@alice-structures/multiplayer/MultiplayerPlayer";
import { MultiplayerRoomSettings } from "@alice-structures/multiplayer/MultiplayerRoomSettings";
import { MultiplayerRoomStatus } from "@alice-structures/multiplayer/MultiplayerRoomStatus";
import { MultiplayerScore } from "@alice-structures/multiplayer/MultiplayerScore";
import { Snowflake } from "discord.js";
import { BaseDocument } from "../BaseDocument";

/**
 * Represents a multiplayer room.
 */
export interface DatabaseMultiplayerRoom extends BaseDocument {
    /**
     * The ID of the room.
     */
    readonly roomId: string;

    /**
     * The ID of the text channel at which this room resides.
     */
    textChannelId: Snowflake;

    /**
     * The ID of the thread channel at which this room resides.
     */
    threadChannelId: Snowflake;

    /**
     * The players in this room.
     */
    players: MultiplayerPlayer[];

    /**
     * The status of this room.
     */
    status: MultiplayerRoomStatus;

    /**
     * The room's settings.
     */
    settings: MultiplayerRoomSettings;

    /**
     * The scores from the currently played beatmap that have been set.
     */
    currentScores: MultiplayerScore[];
}
