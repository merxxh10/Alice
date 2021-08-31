import { Bot } from "@alice-core/Bot";
import { DatabaseManager } from "@alice-database/DatabaseManager";
import { DatabasePlayerSkin } from "@alice-interfaces/database/aliceDb/DatabasePlayerSkin";
import { Manager } from "@alice-utils/base/Manager";
import { ObjectId } from "bson";
import { Snowflake } from "discord.js";

/**
 * Represents an information about a Discord user's osu!/osu!droid skin.
 */
export class PlayerSkin extends Manager implements DatabasePlayerSkin {
    discordid: Snowflake;
    skin: string;
    readonly _id?: ObjectId;

    constructor(client: Bot, data: DatabasePlayerSkin = DatabaseManager.aliceDb.collections.playerSkins.defaultDocument) {
        super(client);

        this._id = data._id;
        this.discordid = data.discordid;
        this.skin = data.skin;
    }
}