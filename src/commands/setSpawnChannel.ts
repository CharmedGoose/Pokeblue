import { createErrorEmbed, PokeblueEmbed } from "#lib/embed";
import { ChannelType } from "discord.js";
import { Command } from "@sapphire/framework";
import { guilds } from "#db/schema";
import { eq } from "drizzle-orm";

export class PingCommand extends Command {
	public constructor(
		context: Command.LoaderContext,
		options: Command.Options,
	) {
		super(context, {
			...options,
			requiredClientPermissions: ["SendMessages"],
			requiredUserPermissions: ["UseApplicationCommands", "ManageGuild"],
			runIn: ["GUILD_ANY"],
		});
	}

	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName("setspawnchannel")
				.setDescription("Sets the Pokémon spawn channel")
				.addChannelOption((option) =>
					option
						.setName("channel")
						.setDescription(
							"The channel to set as the Pokémon spawn channel. Must have 'Send Messages' permissions in channel",
						)
						.addChannelTypes(ChannelType.GuildText)
						.setRequired(true),
				)
				.addIntegerOption((option) =>
					option
						.setName("mintime")
						.setDescription(
							"The minimum time between Pokémon spawns in seconds (min 300). Default is 300",
						)
						.setMinValue(300),
				)
				.addIntegerOption((option) =>
					option
						.setName("maxtime")
						.setDescription(
							"The maximum time between Pokémon spawns in seconds (min 360). Default is 360",
						)
						.setMinValue(360),
				),
		);
	}

	public override async chatInputRun(
		interaction: Command.ChatInputCommandInteraction,
	) {
		const guild = interaction.guild;
		const channelOption = interaction.options.getChannel("channel");
		if (!channelOption || !guild) return;

		const channel = guild.channels.cache.get(channelOption.id);
		if (!channel) {
			return interaction.reply({
				embeds: [createErrorEmbed("Channel not found")],
				flags: ["Ephemeral"],
			});
		}

		const minTime = interaction.options.getInteger("mintime") || 300;
		const maxTime = interaction.options.getInteger("maxtime") || 360;
		if (minTime > maxTime + 60) {
			return interaction.reply({
				embeds: [
					createErrorEmbed(
						"The minimum time between Pokémon spawns must be less than the maximum time by 60 seconds",
					),
				],
				flags: ["Ephemeral"],
			});
		}

		if (!channel.permissionsFor(guild.members.me!)?.has("SendMessages")) {
			return interaction.reply({
				embeds: [
					createErrorEmbed(
						`Pokéblue needs the \`Send Messages\` permission in <#${channelOption.id}>`,
					),
				],
				flags: ["Ephemeral"],
			});
		}

		try {
			const dbGuild = await this.container.db
				.select()
				.from(guilds)
				.where(eq(guilds.id, guild.id));

			if (dbGuild.length > 0) {
				await this.container.db.update(guilds).set({
					spawnChannel: channel.id,
					minSpawnTime: minTime.toString(),
					maxSpawnTime: maxTime.toString(),
				});
			} else {
				await this.container.db.insert(guilds).values({
					id: guild.id,
					spawnChannel: channel.id,
					minSpawnTime: minTime.toString(),
					maxSpawnTime: maxTime.toString(),
				});
			}
		} catch (err) {
			this.container.logger.error(err);
			return interaction.reply({
				embeds: [createErrorEmbed("Failed to set spawn channel")],
				ephemeral: true,
			});
		}

		return interaction.reply({
			embeds: [
				new PokeblueEmbed()
					.setTitle("Success")
					.setDescription(
						`Pokémon spawn channel set to <#${channel.id}> with a minimum spawn time of ${minTime} seconds and a maximum spawn time of ${maxTime} seconds`,
					),
			],
		});
	}
}
