import { Command } from "@sapphire/framework";
import { AttachmentBuilder, EmbedBuilder } from "discord.js";
import { createGIF, decodeGIFFramesFromURL } from "#lib/gif";
import { createErrorEmbed } from "#lib/embed";

export class SartCommand extends Command {
	public constructor(
		context: Command.LoaderContext,
		options: Command.Options,
	) {
		super(context, { ...options });
	}

	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand(
			(builder) =>
				builder
					.setName("start")
					.setDescription("Start your adventure!"),
			{
				guildIds: [process.env.GUILD_ID!],
			},
		);
	}

	public override async chatInputRun(
		interaction: Command.ChatInputCommandInteraction,
	) {
		await interaction.deferReply();

		let gif: Buffer = Buffer.alloc(0);

		try {
			const bulbasaur = await decodeGIFFramesFromURL(
				"https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/1.gif",
			);
			const charmander = await decodeGIFFramesFromURL(
				"https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/4.gif",
			);
			const squirtle = await decodeGIFFramesFromURL(
				"https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/7.gif",
			);

			gif = await createGIF(
				1000,
				500,
				[
					{
						frames: bulbasaur,
						x: 250,
						y: 450,
						widthMultiplier: 4,
						heightMultiplier: 4,
						bottomCenterPivot: true,
					},
					{
						frames: charmander,
						x: 500,
						y: 450,
						widthMultiplier: 4,
						heightMultiplier: 4,
						bottomCenterPivot: true,
					},
					{
						frames: squirtle,
						x: 750,
						y: 450,
						widthMultiplier: 4,
						heightMultiplier: 4,
						bottomCenterPivot: true,
					},
				],
				"./src/assets/starterBackground.jpg",
			);
		} catch (error) {
			this.container.logger.error(error);
			return await interaction.editReply({
				embeds: [createErrorEmbed("Failed to create GIF")],
			});
		}

		const attachment = new AttachmentBuilder(gif, {
			name: "starters.gif",
		});

		const startEmbed = new EmbedBuilder()
			.setColor(0x0099ff)
			.setTitle("Welcome to Pokéblue!")
			.setDescription("Please select your starter")
			.setImage("attachment://starters.gif")
			.setFooter({
				text: this.container.embedFooter,
			});

		await interaction.editReply({
			embeds: [startEmbed],
			files: [attachment],
		});
	}
}
