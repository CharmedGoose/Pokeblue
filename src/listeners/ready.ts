import { Listener } from "@sapphire/framework";
import { Client } from "discord.js";

export class ReadyListener extends Listener {
	public constructor(
		context: Listener.LoaderContext,
		options: Listener.Options,
	) {
		super(context, {
			...options,
			once: true,
			event: "ready",
		});
	}
	public run(client: Client) {
		const { tag } = client.user!;
		this.container.logger.info(
			`Successfully logged in as ${tag}`,
		);
	}
}
