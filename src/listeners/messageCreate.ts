import { Events, Listener } from "@sapphire/framework";
import { randomNumber } from "#lib/utils/math";
import { Message } from "discord.js";
import { guilds } from "#db/schema";
import { eq } from "drizzle-orm";

export class MessageCreateListener extends Listener<typeof Events.MessageCreate> {
	public async run(message: Message) {
		if (message.author.bot || !message.guild) return;

		const guild = await this.container.db.query.guilds.findFirst({
			where: eq(guilds.id, message.guild.id),
		});

		if (!guild) return;

		const messagesSinceLastSpawn = guild.messagesSinceLastSpawn + 1;

		await this.container.db
			.update(guilds)
			.set({
				messagesSinceLastSpawn,
			})
			.where(eq(guilds.id, message.guild.id));

		if (messagesSinceLastSpawn >= guild.minSpawnMessages) {
			if (randomNumber(0, 100) === 0 || messagesSinceLastSpawn >= guild.maxSpawnMessages) {
				await this.container.db
					.update(guilds)
					.set({
						messagesSinceLastSpawn: 0,
					})
					.where(eq(guilds.id, message.guild.id));

				const channel = message.guild.channels.cache.get(guild.spawnChannel);
				if (!channel || !channel.isTextBased()) return;

				await channel.send("A wild pokémon has appeared!");
			}
		}
	}
}
