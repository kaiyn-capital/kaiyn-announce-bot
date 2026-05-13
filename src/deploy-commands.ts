import "dotenv/config";

import { REST, Routes } from "discord.js";
import announceCommand from "./commands/announce";
import setupVerifyCommand from "./commands/setup-verify";

const requiredEnv = ["DISCORD_TOKEN", "CLIENT_ID", "GUILD_ID"];

for (const key of requiredEnv) {
	if (!process.env[key]) {
		console.error(`Missing environment variable: ${key}`);
		process.exit(1);
	}
}

function getRequiredEnv(key: string): string {
	const value = process.env[key];

	if (!value) {
		console.error(`Missing environment variable: ${key}`);
		process.exit(1);
	}

	return value;
}

const discordToken = getRequiredEnv("DISCORD_TOKEN");
const clientId = getRequiredEnv("CLIENT_ID");
const guildId = getRequiredEnv("GUILD_ID");

const commands = [
	announceCommand.data.toJSON(),
	setupVerifyCommand.data.toJSON(),
];

const rest = new REST({
	version: "10",
}).setToken(discordToken);

async function main() {
	try {
		console.log("Started refreshing guild slash commands.");

		await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
			body: commands,
		});

		console.log("Successfully registered guild slash commands.");
	} catch (error) {
		console.error("Failed to register guild slash commands:", error);
		process.exit(1);
	}
}

main();
