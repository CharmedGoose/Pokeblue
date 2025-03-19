import { Events, Listener } from "@sapphire/framework";
import { Message } from "discord.js";
import { getGuildFromId, updateMessagesSinceSpawnCount } from "#lib/utils/db";
import { randomNumber } from "#lib/utils/math";

export class MessageCreateListener extends Listener<typeof Events.MessageCreate> {
	public async run(message: Message) {
		if (message.author.bot || !message.guild) return;

		const guild = await getGuildFromId(message.guild.id);

		if (!guild) return;

		const messagesSinceLastSpawn = guild.messagesSinceLastSpawn + 1;

		await updateMessagesSinceSpawnCount(guild.id, messagesSinceLastSpawn);

		if (messagesSinceLastSpawn >= guild.minSpawnMessages) {
			if (randomNumber(0, 100) === 0 || messagesSinceLastSpawn >= guild.maxSpawnMessages) {
				await updateMessagesSinceSpawnCount(guild.id, 0);

				const channel = message.guild.channels.cache.get(guild.spawnChannel);
				if (!channel || !channel.isTextBased()) return;

				await channel.send("A wild pokémon has appeared!");
			}
		}
	}
}
