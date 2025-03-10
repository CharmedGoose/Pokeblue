import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
} from "discord.js";
import { PokemonGenerations, PokemonGenerationStarters } from "#lib/pokemon";

export function createPokemonGenerationSelectRow(
	defaultId?: string,
): ActionRowBuilder<StringSelectMenuBuilder> {
	const generationSelectMenu = new StringSelectMenuBuilder()
		.setCustomId("generationSelectMenu")
		.setOptions(
			PokemonGenerations.map((generation, index) =>
				new StringSelectMenuOptionBuilder()
					.setDefault(true)
					.setLabel(generation.name)
					.setValue(generation.id)
					.setDescription(
						PokemonGenerationStarters[index]
							.map((pokemon) => pokemon.name)
							.join(", "),
					)
					.setDefault(generation.id === (defaultId || "1")),
			),
		);

	const selectMenuRow =
		new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
			generationSelectMenu,
		);

	return selectMenuRow;
}

export function createStarterPokemonButtonRow(): ActionRowBuilder<ButtonBuilder> {
	const emptyButton = new ButtonBuilder()
		.setLabel("-")
		.setDisabled(true)
		.setStyle(ButtonStyle.Secondary);

	const grassPokemonButton = new ButtonBuilder()
		.setCustomId("1")
		.setLabel("1")
		.setStyle(ButtonStyle.Success);
	const firePokemonButton = new ButtonBuilder()
		.setCustomId("2")
		.setLabel("2")
		.setStyle(ButtonStyle.Danger);
	const waterPokemonButton = new ButtonBuilder()
		.setCustomId("3")
		.setLabel("3")
		.setStyle(ButtonStyle.Primary);

	const starterButtons = new ActionRowBuilder<ButtonBuilder>().addComponents(
		grassPokemonButton,
		ButtonBuilder.from(emptyButton).setCustomId("empty-0"),
		firePokemonButton,
		ButtonBuilder.from(emptyButton).setCustomId("empty-1"),
		waterPokemonButton,
	);

	return starterButtons;
}
