require('dotenv').config();

const { REST, Routes } = require('discord.js');
const announceCommand = require('./commands/announce');
const setupVerifyCommand = require('./commands/setup-verify');

const requiredEnv = ['DISCORD_TOKEN', 'CLIENT_ID', 'GUILD_ID'];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(`Missing environment variable: ${key}`);
    process.exit(1);
  }
}

const commands = [announceCommand.data.toJSON(), setupVerifyCommand.data.toJSON()];

const rest = new REST({
  version: '10'
}).setToken(process.env.DISCORD_TOKEN);

async function main() {
  try {
    console.log('Started refreshing guild slash commands.');

    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      {
        body: commands
      }
    );

    console.log('Successfully registered guild slash commands.');
  } catch (error) {
    console.error('Failed to register guild slash commands:', error);
    process.exit(1);
  }
}

main();
