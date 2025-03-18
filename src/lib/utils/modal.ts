import { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";

export function createNameModal(title: string, type: "player" | "pokemon", name: string): ModalBuilder {
	const isPlayer = type === "player";

	const nameModal = new ModalBuilder()
		.setCustomId(isPlayer ? "playerNameModal" : "pokemonNameModal")
		.setTitle("Welcome to Pokéblue!");

	const nameTextInput = new TextInputBuilder()
		.setCustomId(isPlayer ? "playerNameInput" : "pokemonNameInput")
		.setLabel(title)
		.setMaxLength(28)
		.setStyle(TextInputStyle.Short)
		.setRequired(false)
		.setPlaceholder(name);

	const nameActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(nameTextInput);

	nameModal.addComponents(nameActionRow);

	return nameModal;
}
