import { Command } from "@sapphire/framework";
import { eq } from "drizzle-orm";
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle,
} from "discord.js";
import { PokeblueEmbed, createErrorEmbed } from "#lib/embed";
import { createStarterGIF } from "#lib/gif";
import { pokemons, users } from "#db/schema";

export class SartCommand extends Command {
	public constructor(
		context: Command.LoaderContext,
		options: Command.Options,
	) {
		super(context, {
			...options,
			requiredClientPermissions: ["SendMessages", "AttachFiles"],
			requiredUserPermissions: ["UseApplicationCommands"],
		});
	}

	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder.setName("start").setDescription("Start your adventure!"),
		);
	}

	public override async chatInputRun(
		interaction: Command.ChatInputCommandInteraction,
	) {
		const user = await this.container.db
			.select()
			.from(users)
			.where(eq(users.id, interaction.user.id));

		if (user.length > 0) {
			return await interaction.reply({
				embeds: [createErrorEmbed("You have already have a account!")],
				flags: ["Ephemeral"],
			});
		}

		await interaction.showModal(
			createNameModal(
				"What's your name?",
				"playerNameModal",
				"playerNameInput",
				interaction.user.displayName,
			),
		);

		const nameInteraction = await interaction.awaitModalSubmit({
			filter: (i) => i.customId === "playerNameModal",
			time: 3_600_000,
		});

		let name = nameInteraction.fields.getTextInputValue("playerNameInput");
		if (!name) name = nameInteraction.user.displayName;

		const response = await nameInteraction.reply({
			content: "Getting starters please wait...",
			withResponse: true,
		});

		const gifURL = await createStarterGIF().catch(async (err) => {
			this.container.logger.error(err);
			await nameInteraction.editReply({
				content: null,
				embeds: [createErrorEmbed("Failed to get starter GIF")],
			});
		});
		if (!gifURL) return;

		const starterEmbed = new PokeblueEmbed()
			.setTitle("Welcome to Pokéblue!")
			.setDescription("Please select your starter")
			.setImage(gifURL);

		await nameInteraction.editReply({
			content: null,
			embeds: [starterEmbed],
			components: [createStarterButtons()],
		});

		const starterInteraction = await response.resource?.message
			?.awaitMessageComponent({
				filter: (i) => i.user.id === nameInteraction.user.id,
				time: 3_600_000,
			})
			.catch(async () => {
				await nameInteraction.editReply({
					content: null,
					embeds: [createErrorEmbed("Timed out")],
					components: [],
				});
			});
		if (!starterInteraction) return;

		let starter: string;
		let starterId: string;
		switch (starterInteraction.customId) {
			case "2":
				starter = "Charmander";
				starterId = "4";
				break;
			case "3":
				starter = "Squirtle";
				starterId = "7";
				break;
			default:
				starter = "Bulbasaur";
				starterId = "1";
				break;
		}

		await starterInteraction.showModal(
			createNameModal(
				"Name your Pokémon",
				"pokemonNameModal",
				"pokemonNameInput",
				starter,
			),
		);

		const pokemonNameInteraction =
			await starterInteraction.awaitModalSubmit({
				filter: (i) => i.customId === "pokemonNameModal",
				time: 3_600_000,
			});

		let pokemonName =
			pokemonNameInteraction.fields.getTextInputValue("pokemonNameInput");
		if (!pokemonName) pokemonName = starter;

		pokemonNameInteraction.deferUpdate();

		try {
			await this.container.db.insert(users).values({
				id: pokemonNameInteraction.user.id,
				name,
			});

			await this.container.db.insert(pokemons).values({
				name: pokemonName,
				pokemonId: starterId,
				userId: pokemonNameInteraction.user.id,
			});
		} catch (err) {
			this.container.logger.error(err);
			return await starterInteraction.editReply({
				content: null,
				embeds: [createErrorEmbed("Failed create user")],
				components: [],
			});
		}

		const success = new PokeblueEmbed()
			.setTitle("Welcome to Pokéblue!")
			.setDescription(
				`You have selected ${starter} as your starter!\nYou can now start catching pokémons!`,
			);

		nameInteraction.editReply({
			content: null,
			embeds: [success],
			components: [],
		});
	}
}

function createNameModal(
	title: string,
	id: string,
	textId: string,
	name: string,
): ModalBuilder {
	const nameModal = new ModalBuilder()
		.setCustomId(id)
		.setTitle("Welcome to Pokéblue!");

	const nameTextInput = new TextInputBuilder()
		.setCustomId(textId)
		.setLabel(title)
		.setMaxLength(28)
		.setStyle(TextInputStyle.Short)
		.setRequired(false)
		.setPlaceholder(name);

	const nameActionRow =
		new ActionRowBuilder<TextInputBuilder>().addComponents(nameTextInput);

	nameModal.addComponents(nameActionRow);

	return nameModal;
}

function createStarterButtons(): ActionRowBuilder<ButtonBuilder> {
	const emptyButton = new ButtonBuilder()
		.setCustomId("empty-0")
		.setLabel("-")
		.setDisabled(true)
		.setStyle(ButtonStyle.Secondary);
	const emptyButton2 = new ButtonBuilder()
		.setCustomId("empty-1")
		.setLabel("-")
		.setDisabled(true)
		.setStyle(ButtonStyle.Secondary);

	const bulbasaurButton = new ButtonBuilder()
		.setCustomId("1")
		.setLabel("1")
		.setStyle(ButtonStyle.Success);
	const charmanderButton = new ButtonBuilder()
		.setCustomId("2")
		.setLabel("2")
		.setStyle(ButtonStyle.Danger);
	const squirtleButton = new ButtonBuilder()
		.setCustomId("3")
		.setLabel("3")
		.setStyle(ButtonStyle.Primary);

	const starterButtons = new ActionRowBuilder<ButtonBuilder>().addComponents(
		bulbasaurButton,
		emptyButton,
		charmanderButton,
		emptyButton2,
		squirtleButton,
	);

	return starterButtons;
}
