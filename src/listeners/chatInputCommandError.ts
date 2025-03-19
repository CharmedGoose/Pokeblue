import { Events, Listener, type ChatInputCommandErrorPayload } from "@sapphire/framework";
import { createErrorEmbed } from "#lib/utils/embed";
import * as Sentry from "@sentry/bun";

export class ChatInputCommandError extends Listener<typeof Events.ChatInputCommandError> {
	public run(error: unknown, { interaction }: ChatInputCommandErrorPayload) {
		Sentry.captureException(error);
		this.container.logger.error(error);

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
