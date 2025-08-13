import { ApplicationCommandRegistries, container, LogLevel, SapphireClient } from "@sapphire/framework";
import { ActivityType, GatewayIntentBits } from "discord.js";
import { BunSQLDatabase, drizzle } from "drizzle-orm/bun-sql";
import { SQL, $ } from "bun";
import * as schema from "#db/schema";

export class PokeblueClient extends SapphireClient {
	public constructor() {
		super({
			intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
			presence: {
				activities: [
					{
						name: process.env.DISCORD_PRESENCE_NAME || "with Pokémon",
						type: ActivityType[
							(process.env.DISCORD_PRESENCE_TYPE || "Playing") as keyof typeof ActivityType
						],
					},
				],
			},
			logger: {
				level: process.env.DEBUG ? LogLevel.Debug : LogLevel.Info,
			},
		});
	}

	public override async login(token?: string) {
		if (process.env.DISCORD_GUILD_ID) {
			ApplicationCommandRegistries.setDefaultGuildIds([process.env.DISCORD_GUILD_ID]);
		}

		const client = new SQL(process.env.DATABASE_URL!);
		container.db = drizzle({ client, schema });

		const commitHash = await $`git rev-parse --short HEAD`.text();
		const branch = (await $`git branch --show-current`.text()).trim();
		container.embedFooter = `${branch}@${commitHash}`;

		return super.login(token);
	}
}

declare module "@sapphire/pieces" {
	interface Container {
		db: BunSQLDatabase<typeof schema> & {
			$client: SQL;
		};
		embedFooter: string;
	}
}
