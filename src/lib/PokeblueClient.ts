import { container, LogLevel, SapphireClient } from "@sapphire/framework";
import { ActivityType, GatewayIntentBits } from "discord.js";
import { $ } from "bun";
import Pokedex from "pokedex-promise-v2";

export class PokeblueClient extends SapphireClient {
	public constructor() {
		super({
			intents: [
				GatewayIntentBits.Guilds,
				GatewayIntentBits.GuildMessages,
			],
			presence: {
				activities: [
					{ name: "i don't wanna die", type: ActivityType.Custom },
				],
			},
			logger: {
				level:
					process.env.DEBUG == "1"
						? LogLevel.Debug
						: LogLevel.Info,
			},
		});
	}

	public override async login(token?: string) {
		container.pokedex = new Pokedex();
		container.version = await $`git rev-parse --short HEAD`.text();
		container.branch = (await $`git branch --show-current`.text()).trim();
		return super.login(token);
	}
}

declare module "@sapphire/pieces" {
	interface Container {
		pokedex: Pokedex;
		version: string;
		branch: string;
	}
}
