import { REST, Routes } from "discord.js";

if (!process.env.DISCORD_TOKEN) {
	console.error("No token provided.");
	process.exit(1);
}
if (!process.env.DISCORD_CLIENT_ID) {
	console.error("No client ID provided.");
	process.exit(1);
}

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

try {
	if (process.env.DISCORD_GUILD_ID) {
		rest.put(Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, process.env.DISCORD_GUILD_ID), {
			body: [],
		});
	}

	rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID), {
		body: [],
	});
} catch (error) {
	console.error(error);
}

console.log("Successfully cleared all commands.");
