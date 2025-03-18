import { createErrorEmbed } from "#lib/utils/embed";
import { Events, Listener, type ChatInputCommandDeniedPayload, type UserError } from "@sapphire/framework";

export class ChatInputCommandDenied extends Listener<typeof Events.ChatInputCommandDenied> {
	public run(error: UserError, { interaction }: ChatInputCommandDeniedPayload) {
		if (error.identifier === "preconditionClientPermissions") {
			const context = error.context as { missing: string[] };

			return interaction.reply({
				embeds: [createErrorEmbed(`Pokéblue needs: \`${context.missing.join("`, `")}\` to run this command.`)],
			});
		}
		if (error.identifier === "preconditionUserPermissions") {
			const context = error.context as { missing: string[] };

			return interaction.reply({
				embeds: [createErrorEmbed(`You need: \`${context.missing.join("`, `")}\` to run this command.`)],
			});
		}

		if (interaction.deferred || interaction.replied) {
			return interaction.editReply({
				embeds: [createErrorEmbed(error.message)],
			});
		}

		return interaction.reply({
			embeds: [createErrorEmbed(error.message)],
			flags: ["Ephemeral"],
		});
	}
}
