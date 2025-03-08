import { container } from "@sapphire/framework";
import { EmbedBuilder } from "discord.js";

export class PokeblueEmbed extends EmbedBuilder {
	public constructor() {
		super({ color: 0x0099ff, footer: { text: container.embedFooter } });
	}
}

export function createErrorEmbed(message: string): EmbedBuilder {
	return new PokeblueEmbed()
		.setColor("Red")
		.setTitle("ERROR")
		.setDescription(message)
}
