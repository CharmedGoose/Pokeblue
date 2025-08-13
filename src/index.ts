import { PokeblueClient } from "#lib/PokeblueClient";
import "@sapphire/plugin-logger/register";

const client = new PokeblueClient();

await client.login(process.env.DISCORD_TOKEN);
