import { createErrorEmbed, PokeblueEmbed } from "#lib/utils/embed";
import { ChannelType } from "discord.js";
import { Command } from "@sapphire/framework";
import { guilds } from "#db/schema";
import { eq } from "drizzle-orm";
import {
	MIN_SPAWN_TIME,
	MIN_TIME_BETWEEN_SPAWNS,
	DEFAULT_MIN_SPAWN_TIME,
	DEFAULT_MAX_SPAWN_TIME,
} from "#config";
import * as Sentry from "@sentry/bun";

const MIN_MAX_SPAWN_TIME = MIN_SPAWN_TIME + MIN_TIME_BETWEEN_SPAWNS;

export class SetSpawnCommand extends Command {
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
							`The minimum time between Pokémon spawns in seconds (min ${MIN_SPAWN_TIME}). Default is ${DEFAULT_MIN_SPAWN_TIME}`,
						)
						.setMinValue(MIN_SPAWN_TIME),
				)
				.addIntegerOption((option) =>
					option
						.setName("maxtime")
						.setDescription(
							`The maximum time between Pokémon spawns in seconds (min ${MIN_MAX_SPAWN_TIME}). Default is ${DEFAULT_MAX_SPAWN_TIME}`,
						)
						.setMinValue(MIN_MAX_SPAWN_TIME),
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

		const minTime =
			interaction.options.getInteger("mintime") || DEFAULT_MIN_SPAWN_TIME;
		const maxTime =
			interaction.options.getInteger("maxtime") || DEFAULT_MAX_SPAWN_TIME;
		if (minTime > maxTime + MIN_TIME_BETWEEN_SPAWNS) {
			return interaction.reply({
				embeds: [
					createErrorEmbed(
						`The minimum time between Pokémon spawns must be less than the maximum time by ${MIN_TIME_BETWEEN_SPAWNS} seconds`,
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
			Sentry.captureException(err);
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
