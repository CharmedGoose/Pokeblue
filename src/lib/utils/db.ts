import { container } from "@sapphire/framework";
import { eq } from "drizzle-orm";
import { guilds, users } from "#db/schema";

export async function getUserFromId(id: string) {
	return await container.db.query.users.findFirst({
		where: eq(users.id, id),
	});
}

export async function getGuildFromId(id: string) {
	return await container.db.query.guilds.findFirst({
		where: eq(guilds.id, id),
	});
}

export async function updateMessagesSinceSpawnCount(id: string, count: number) {
	return await container.db
		.update(guilds)
		.set({
			messagesSinceLastSpawn: count,
		})
		.where(eq(guilds.id, id));
}
