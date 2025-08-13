import { Command } from "@sapphire/framework";

export class PingCommand extends Command {
	public constructor(context: Command.LoaderContext, options: Command.Options) {
		super(context, {
			...options,
		});
	}

	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) => builder.setName("ping").setDescription("Pong!"));
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		const message = await interaction.reply({
			content: `Ping?`,
			withResponse: true,
		});

		if (message.resource?.message) {
			const diffrence = message.resource.message.createdTimestamp - interaction.createdTimestamp;
			const ping = Math.round(this.container.client.ws.ping);
			return interaction.editReply(`Pong! (Round trip took: ${diffrence}ms. Heartbeat: ${ping}ms.)`);
		}

		return interaction.editReply("Failed to retrieve ping");
	}
}
