import { DatabaseManager } from "@alice-database/DatabaseManager";
import { OperationResult } from "@alice-interfaces/core/OperationResult";
import { DatabaseGuildSettings } from "@alice-interfaces/database/aliceDb/DatabaseGuildSettings";
import { DisabledCommand } from "@alice-interfaces/moderation/DisabledCommand";
import { DisabledEventUtil } from "@alice-interfaces/moderation/DisabledEventUtil";
import { GuildChannelSettings } from "@alice-interfaces/moderation/GuildChannelSettings";
import { Language } from "@alice-localization/base/Language";
import { Manager } from "@alice-utils/base/Manager";
import { ArrayHelper } from "@alice-utils/helpers/ArrayHelper";
import { Collection, Snowflake } from "discord.js";
import { ObjectId } from "mongodb";

/**
 * Represents a guild's settings with respect to the bot.
 */
export class GuildSettings extends Manager {
    /**
     * The ID of the guild.
     */
    id: Snowflake;

    /**
     * Settings for channels in the guild, mapped by channel ID.
     */
    channelSettings: Collection<Snowflake, GuildChannelSettings>;

    /**
     * The commands that are disabled in the guild, mapped by their name.
     */
    disabledCommands: Collection<string, DisabledCommand>;

    /**
     * The event utilities that are disabled in the guild, mapped by their name.
     */
    disabledEventUtils: DisabledEventUtil[];

    /**
     * The preferred locale of this guild. Should be defaulted to English if unavailable.
     */
    preferredLocale?: Language;

    /**
     * The BSON object ID of this document in the database.
     */
    readonly _id?: ObjectId;

    constructor(
        data: DatabaseGuildSettings = DatabaseManager.aliceDb?.collections
            .guildSettings.defaultDocument ?? {}
    ) {
        super();

        this._id = data._id;
        this.id = data.id;
        this.channelSettings = ArrayHelper.arrayToCollection(
            data.channelSettings ?? [],
            "id"
        );
        this.disabledCommands = ArrayHelper.arrayToCollection(
            data.disabledCommands ?? [],
            "name"
        );
        this.disabledEventUtils = data.disabledEventUtils ?? [];
        this.preferredLocale = data.preferredLocale;
    }

    /**
     * Updates or adds this guild's settings to the database.
     *
     * @returns An object containing information about the operation.
     */
    async updateData(): Promise<OperationResult> {
        return DatabaseManager.aliceDb.collections.guildSettings.update(
            {
                id: this.id,
            },
            {
                $set: {
                    channelSettings: [...this.channelSettings.values()],
                    disabledCommands: [...this.disabledCommands.values()],
                    disabledEventUtils: [...this.disabledEventUtils.values()],
                    preferredLocale: this.preferredLocale,
                },
            },
            { upsert: true }
        );
    }
}
