import { Command } from "@sapphire/framework";
import { ChannelType } from "discord.js";
import { eq } from "drizzle-orm";
import { MIN_SPAWN_MESSAGES, MIN_MAX_MESSAGES, DEFAULT_MIN_SPAWN_MESSAGES, DEFAULT_MAX_SPAWN_MESSAGES } from "#config";
import { createErrorEmbed, PokeblueEmbed } from "#lib/utils/embed";
import { getGuildFromId } from "#lib/utils/db";
import { guilds } from "#db/schema";
import * as Sentry from "@sentry/bun";

export class SetSpawnCommand extends Command {
	public constructor(context: Command.LoaderContext, options: Command.Options) {
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
						.setName("min-messages")
						.setDescription(
							`The minimum messages between Pokémon spawns (min. ${MIN_SPAWN_MESSAGES}). Default: ${DEFAULT_MIN_SPAWN_MESSAGES}`,
						)
						.setMinValue(MIN_SPAWN_MESSAGES),
				)
				.addIntegerOption((option) =>
					option
						.setName("max-messages")
						.setDescription(
							`The maximum messages between Pokémon spawns (min. ${MIN_MAX_MESSAGES} more than the min. messages). Default: ${DEFAULT_MAX_SPAWN_MESSAGES}`,
						)
						.setMinValue(MIN_SPAWN_MESSAGES + MIN_MAX_MESSAGES),
				),
		);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
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

		const dbGuild = await getGuildFromId(guild.id);

		const minMessages =
			interaction.options.getInteger("min-messages") ||
			(dbGuild ? dbGuild.minSpawnMessages : DEFAULT_MIN_SPAWN_MESSAGES);
		const maxMessages =
			interaction.options.getInteger("max-messages") ||
			(dbGuild ? dbGuild.maxSpawnMessages : DEFAULT_MAX_SPAWN_MESSAGES);

		if (maxMessages < minMessages + MIN_MAX_MESSAGES) {
			return interaction.reply({
				embeds: [
					createErrorEmbed(
						`The maximum messages must be at least ${MIN_MAX_MESSAGES} more than the minimun messages`,
					),
				],
				flags: ["Ephemeral"],
			});
		}

		if (!channel.permissionsFor(guild.members.me!)?.has("SendMessages")) {
			return interaction.reply({
				embeds: [createErrorEmbed(`Pokéblue needs the \`Send Messages\` permission in <#${channelOption.id}>`)],
				flags: ["Ephemeral"],
			});
		}

		try {
			if (!dbGuild) {
				await this.container.db.insert(guilds).values({
					id: guild.id,
					spawnChannel: channel.id,
					minSpawnMessages: minMessages,
					maxSpawnMessages: maxMessages,
					messagesSinceLastSpawn: 0,
				});
			} else {
				await this.container.db
					.update(guilds)
					.set({
						spawnChannel: channel.id,
						minSpawnMessages: minMessages,
						maxSpawnMessages: maxMessages,
					})
					.where(eq(guilds.id, guild.id));
			}
		} catch (err) {
			Sentry.captureException(err);
			this.container.logger.error(err);
			return interaction.reply({
				embeds: [createErrorEmbed("Failed to set spawn channel")],
				flags: ["Ephemeral"],
			});
		}

		return interaction.reply({
			embeds: [
				new PokeblueEmbed()
					.setTitle("Success")
					.setDescription(
						`Pokémon spawn channel set to <#${channel.id}> with \`${minMessages}\` minimum messages and \`${maxMessages}\` maximum messages for a Pokémon to spawn.`,
					),
			],
		});
	}
}
