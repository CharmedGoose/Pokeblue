import { Command } from "@sapphire/framework";

export class PingCommand extends Command {
	public constructor(
		context: Command.LoaderContext,
		options: Command.Options,
	) {
		super(context, { ...options });
	}

	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand(
			(builder) => builder.setName("ping").setDescription("Pong!"),
			{ idHints: ["1341069095642075147"] },
		);
	}

	public override async chatInputRun(
		interaction: Command.ChatInputCommandInteraction,
	) {
		const msg = await interaction.reply({
			content: `Ping?`,
			withResponse: true,
		});

		if (msg.resource?.message) {
			const diff =
				msg.resource.message.createdTimestamp -
				interaction.createdTimestamp;
			const ping = Math.round(this.container.client.ws.ping);
			return interaction.editReply(
				`Pong! (Round trip took: ${diff}ms. Heartbeat: ${ping}ms.)`,
			);
		}

		return interaction.editReply("Failed to retrieve ping");
	}
}
