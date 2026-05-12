import 'dotenv/config';

import {
  Client,
  Collection,
  Events,
  GatewayIntentBits,
  type InteractionReplyOptions,
  MessageFlags
} from 'discord.js';
import announceCommand from './commands/announce';
import setupVerifyCommand from './commands/setup-verify';
import type { BotCommand } from './types/command';

const requiredEnv = ['DISCORD_TOKEN'];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(`Missing environment variable: ${key}`);
    process.exit(1);
  }
}

const discordToken = process.env.DISCORD_TOKEN;

if (!discordToken) {
  console.error('Missing environment variable: DISCORD_TOKEN');
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.commands = new Collection<string, BotCommand>();
client.commands.set(announceCommand.data.name, announceCommand);
client.commands.set(setupVerifyCommand.data.name, setupVerifyCommand);

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Logged in as ${readyClient.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isModalSubmit()) {
      const isAnnounceModal =
        (await announceCommand.handleModalSubmit?.(interaction)) ?? false;

      if (isAnnounceModal) {
        return;
      }

      const isSetupVerifyModal =
        (await setupVerifyCommand.handleModalSubmit?.(interaction)) ?? false;

      if (isSetupVerifyModal) {
        return;
      }

      return;
    }

    if (interaction.isButton()) {
      await setupVerifyCommand.handleVerifyButton?.(interaction);
      return;
    }

    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) return;

    await command.execute(interaction);
  } catch (error) {
    const interactionName = interaction.isChatInputCommand()
      ? `/${interaction.commandName}`
      : 'customId' in interaction
        ? interaction.customId
        : interaction.type;

    console.error(`Error handling ${interactionName}:`, error);

    if (!interaction.isRepliable()) {
      return;
    }

    const payload: InteractionReplyOptions = {
      content: '執行指令時發生錯誤，請稍後再試。',
      flags: MessageFlags.Ephemeral
    };

    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(payload);
      } else {
        await interaction.reply(payload);
      }
    } catch (replyError) {
      console.error('Failed to send interaction error response:', replyError);
    }
  }
});

client.login(discordToken).catch((error) => {
  console.error('Failed to login:', error);
  process.exit(1);
});
