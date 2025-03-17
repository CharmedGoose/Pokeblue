import { PokeblueClient } from "#lib/PokeblueClient";
import { container } from "@sapphire/framework";
import * as Sentry from "@sentry/bun";
import "@sapphire/plugin-logger/register";

const client = new PokeblueClient();

Sentry.init({
	dsn: process.env.SENTRY_URL,
	environment: process.env.NODE_ENV,
	integrations: [Sentry.consoleIntegration()],
});

try {
	await client.login(process.env.DISCORD_TOKEN);
} catch (error) {
	container.logger.error(error);
	await client.destroy();
	process.exit(1);
}
