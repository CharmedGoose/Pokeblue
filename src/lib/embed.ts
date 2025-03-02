import { container } from "@sapphire/framework";
import { EmbedBuilder } from "discord.js";

export function createErrorEmbed(
	message: string,
): EmbedBuilder {
	return new EmbedBuilder()
		.setColor("Red")
		.setTitle("ERROR")
		.setDescription(message)
		.setFooter({
			text: container.embedFooter,
		});
}
