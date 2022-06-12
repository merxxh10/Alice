import {
    ApplicationCommandOptionTypes,
    ApplicationCommandTypes,
} from "discord.js/typings/enums";
import { CommandCategory } from "@alice-enums/core/CommandCategory";
import { SlashCommand } from "@alice-interfaces/core/SlashCommand";
import { MessageCreator } from "@alice-utils/creators/MessageCreator";
import { ApplicationCommandData } from "discord.js";
import { DeployLocalization } from "@alice-localization/commands/Bot Creators/deploy/DeployLocalization";
import { CommandHelper } from "@alice-utils/helpers/CommandHelper";
import { InteractionHelper } from "@alice-utils/helpers/InteractionHelper";
import { ContextMenuCommand } from "@alice-interfaces/core/ContextMenuCommand";

export const run: SlashCommand["run"] = async (client, interaction) => {
    const localization: DeployLocalization = new DeployLocalization(
        await CommandHelper.getLocale(interaction)
    );

    const commandName: string = interaction.options.getString("command", true);

    let data: ApplicationCommandData;

    const type: ApplicationCommandTypes =
        interaction.options.getInteger("type") ??
        ApplicationCommandTypes.CHAT_INPUT;

    if (type === ApplicationCommandTypes.CHAT_INPUT) {
        const command: SlashCommand | undefined =
            client.interactions.chatInput.get(commandName);

        if (!command) {
            return InteractionHelper.reply(interaction, {
                content: MessageCreator.createReject(
                    localization.getTranslation("commandNotFound")
                ),
            });
        }

        data = {
            name: command.config.name,
            description: command.config.description,
            options: command.config.options,
        };
    } else {
        const command: ContextMenuCommand | undefined = (
            type === ApplicationCommandTypes.MESSAGE
                ? client.interactions.contextMenu.message
                : client.interactions.contextMenu.user
        ).get(commandName);

        if (!command) {
            return InteractionHelper.reply(interaction, {
                content: MessageCreator.createReject(
                    localization.getTranslation("commandNotFound")
                ),
            });
        }

        data = {
            name: command.config.name,
            description: "",
            type: type,
        };
    }

    data.type ??= type;

    await (interaction.options.getBoolean("serveronly")
        ? interaction.guild!
        : client.application!
    ).commands.create(data);

    InteractionHelper.reply(interaction, {
        content: MessageCreator.createAccept(
            localization.getTranslation("commandDeploySuccessful"),
            commandName
        ),
    });
};

export const category: SlashCommand["category"] = CommandCategory.BOT_CREATORS;

export const config: SlashCommand["config"] = {
    name: "deploy",
    description: "Deploys a command to Discord.",
    options: [
        {
            name: "command",
            required: true,
            type: ApplicationCommandOptionTypes.STRING,
            description: "The command name.",
        },
        {
            name: "serveronly",
            type: ApplicationCommandOptionTypes.BOOLEAN,
            description:
                "Whether to only deploy the command in the server this command is executed in.",
        },
        {
            name: "type",
            type: ApplicationCommandOptionTypes.INTEGER,
            description: "The type of the command. Defaults to chat input.",
            choices: [
                {
                    name: "Chat Input",
                    value: ApplicationCommandTypes.CHAT_INPUT,
                },
                {
                    name: "User Context Menu",
                    value: ApplicationCommandTypes.USER,
                },
                {
                    name: "Message Context Menu",
                    value: ApplicationCommandTypes.MESSAGE,
                },
            ],
        },
    ],
    example: [
        {
            command: "deploy",
            arguments: [
                {
                    name: "command",
                    value: "blacklist",
                },
            ],
            description:
                'will deploy the command with name "blacklist" globally.',
        },
        {
            command: "deploy",
            arguments: [
                {
                    name: "command",
                    value: "help",
                },
                {
                    name: "debug",
                    value: true,
                },
            ],
            description:
                'will deploy the command with name "help" in debug server.',
        },
    ],
    permissions: ["BOT_OWNER"],
    scope: "ALL",
};
