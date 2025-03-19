import { Command } from "@sapphire/framework";
import { ComponentType } from "discord.js";
import { createPokemonGenerationSelectRow, createStarterPokemonButtonRow } from "#lib/utils/actionRow";
import { createStarterGIF, getPublicGIFURL } from "#lib/utils/gif";
import { PokeblueEmbed, createErrorEmbed } from "#lib/utils/embed";
import { PokemonGenerationStarters } from "#lib/pokemon";
import { createNameModal } from "#lib/utils/modal";
import { getUserFromId } from "#lib/utils/db";
import { pokemons, users } from "#db/schema";
import * as Sentry from "@sentry/bun";

export class StartCommand extends Command {
	public constructor(context: Command.LoaderContext, options: Command.Options) {
		super(context, {
			...options,
			requiredClientPermissions: ["SendMessages"],
			requiredUserPermissions: ["UseApplicationCommands"],
		});
	}

	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder.setName("start").setDescription("Start your adventure!"),
		);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		const user = interaction.user;

		const dbUser = await getUserFromId(user.id);
		if (dbUser) {
			return await interaction.reply({
				embeds: [createErrorEmbed(`"What are you doing here? You already have a pokemon!" said the professor`)],
				flags: ["Ephemeral"],
			});
		}

		await interaction.showModal(createNameModal("What's your name?", "player", user.displayName));
		const nameInteraction = await interaction
			.awaitModalSubmit({
				filter: (i) => i.customId === "playerNameModal",
				time: 600_000,
			})
			.catch(async () => {
				await interaction.reply({
					embeds: [
						createErrorEmbed(
							`"You had 10 minutes to choose a name and you couldn't think of one?" said the professor \nRun \`/start\` to start again`,
						),
					],
					flags: ["Ephemeral"],
				});
			});
		if (!nameInteraction) return;

		let name = nameInteraction.fields.getTextInputValue("playerNameInput");
		if (!name) name = user.displayName;

		const gettingStartersEmbed = new PokeblueEmbed()
			.setTitle("Welcome to Pokéblue!")
			.setDescription("Getting starters please wait...");

		const response = await nameInteraction.reply({
			embeds: [gettingStartersEmbed],
			withResponse: true,
		});
		if (!response.resource?.message) {
			return await nameInteraction.editReply({
				embeds: [createErrorEmbed("Something went wrong")],
			});
		}

		const gifURL = await createStarterGIF("1").catch(async (err) => {
			Sentry.captureException(err);
			this.container.logger.error(err);
			await nameInteraction.editReply({
				embeds: [createErrorEmbed("Failed to get starters")],
			});
		});
		if (!gifURL) return;

		const starterEmbed = new PokeblueEmbed()
			.setTitle("Welcome to Pokéblue!")
			.setDescription("Choose your starter")
			.setImage(gifURL);

		await nameInteraction.editReply({
			embeds: [starterEmbed],
			components: [createPokemonGenerationSelectRow(), createStarterPokemonButtonRow()],
		});

		let currentGeneration = "1";

		const generationCollector = response.resource.message.createMessageComponentCollector({
			componentType: ComponentType.StringSelect,
			filter: (i) => i.user.id === user.id,
			time: 870_000,
		});

		generationCollector.on("collect", async (selectInteraction) => {
			await selectInteraction.deferUpdate();

			const selection = selectInteraction.values[0];

			const gifPath = `starters-${selection}.gif`;

			let gifURL: string | void;
			if (await Bun.s3.exists(`images/${gifPath}`)) {
				gifURL = getPublicGIFURL(gifPath);
			} else {
				await selectInteraction.editReply({
					embeds: [gettingStartersEmbed],
					components: [],
				});

				gifURL = await createStarterGIF(selection).catch(async (err) => {
					Sentry.captureException(err);
					this.container.logger.error(err);
					await selectInteraction.editReply({
						embeds: [starterEmbed],
						components: [
							createPokemonGenerationSelectRow(currentGeneration),
							createStarterPokemonButtonRow(),
						],
					});
					await selectInteraction.followUp({
						embeds: [createErrorEmbed("Failed to get starters")],
						flags: ["Ephemeral"],
					});
				});
			}
			if (!gifURL) return;

			await selectInteraction.editReply({
				embeds: [starterEmbed.setImage(gifURL)],
				components: [createPokemonGenerationSelectRow(selection), createStarterPokemonButtonRow()],
			});
			currentGeneration = selection;
		});

		const starterCollector = response.resource.message.createMessageComponentCollector({
			componentType: ComponentType.Button,
			filter: (i) => i.user.id === user.id,
			time: 870_000,
		});

		starterCollector.on("collect", async (buttonInteraction) => {
			const currentPokemons = PokemonGenerationStarters[parseInt(currentGeneration) - 1];

			const starter = currentPokemons[parseInt(buttonInteraction.customId) - 1].name;
			const starterId = currentPokemons[parseInt(buttonInteraction.customId) - 1].id;

			await buttonInteraction.showModal(createNameModal("Name your Pokémon", "pokemon", starter));
			const pokemonNameInteraction = await buttonInteraction
				.awaitModalSubmit({
					filter: (i) => i.customId === "pokemonNameModal",
					time: 600_000,
				})
				.catch(async () => {
					await buttonInteraction.followUp({
						embeds: [
							createErrorEmbed(
								`"Think of a name faster next time! I don't have all day" said the professor`,
							),
						],
						flags: ["Ephemeral"],
					});
				});
			if (!pokemonNameInteraction) return;
			pokemonNameInteraction.deferUpdate();

			let pokemonName = pokemonNameInteraction.fields.getTextInputValue("pokemonNameInput");
			if (!pokemonName) pokemonName = starter;

			try {
				await this.container.db.insert(users).values({
					id: user.id,
					name,
				});

				await this.container.db.insert(pokemons).values({
					name: pokemonName,
					pokemonId: starterId.toString(),
					userId: user.id,
				});
			} catch (err) {
				Sentry.captureException(err);
				this.container.logger.error(err);
				return await nameInteraction
					.editReply({
						embeds: [createErrorEmbed("Failed to create user")],
						components: [],
					})
					.catch(async () => {
						await nameInteraction.followUp({
							embeds: [createErrorEmbed("Failed to create user")],
						});
						await nameInteraction.deleteReply();
					});
			}

			const success = new PokeblueEmbed()
				.setTitle("Welcome to Pokéblue!")
				.setDescription(
					`You have selected ${pokemonName === starter ? pokemonName : `${pokemonName} (${starter})`} as your starter!\nYou can now start catching Pokémons!`,
				);

			await nameInteraction
				.editReply({
					embeds: [success],
					components: [],
				})
				.catch(async () => {
					await nameInteraction.followUp({
						embeds: [success],
					});
					await nameInteraction.deleteReply();
				});
		});

		starterCollector.on("end", async () => {
			await nameInteraction.editReply({
				embeds: [createErrorEmbed("You were so slow the professor left")],
				components: [],
			});
		});
	}
}
