import { createErrorEmbed } from "#lib/utils/embed";
import {
	Events,
	Listener,
	type ChatInputCommandErrorPayload,
} from "@sapphire/framework";

export class ChatInputCommandError extends Listener<
	typeof Events.ChatInputCommandError
> {
	public run(_error: unknown, { interaction }: ChatInputCommandErrorPayload) {
		if (interaction.deferred || interaction.replied) {
			return interaction.editReply({
				embeds: [createErrorEmbed("Something went wrong")],
			});
		}

		return interaction.reply({
			embeds: [createErrorEmbed("Something went wrong")],
			flags: ["Ephemeral"],
		});
	}
}
