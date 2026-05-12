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
const presentRequiredEnv = [];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(`Missing environment variable: ${key}`);
    process.exit(1);
  }

  presentRequiredEnv.push(key);
}

const discordToken = process.env.DISCORD_TOKEN;

if (!discordToken) {
  console.error('Missing environment variable: DISCORD_TOKEN');
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

let isShuttingDown = false;

function shutdown(reason: string, exitCode: 0 | 1, error?: unknown): void {
  if (isShuttingDown) {
    console.warn(`Shutdown already in progress; ignoring ${reason}.`);
    return;
  }

  isShuttingDown = true;

  if (error) {
    console.error(`${reason}:`, error);
  } else {
    console.log(`${reason}.`);
  }

  try {
    client.destroy();
    console.log('Discord client destroyed.');
  } catch (destroyError) {
    console.error('Failed to destroy Discord client during shutdown:', destroyError);
  }

  process.exit(exitCode);
}

process.on('SIGINT', () => {
  shutdown('Received SIGINT, shutting down', 0);
});

process.on('SIGTERM', () => {
  shutdown('Received SIGTERM, shutting down', 0);
});

process.on('unhandledRejection', (reason) => {
  shutdown('Unhandled promise rejection', 1, reason);
});

process.on('uncaughtException', (error) => {
  shutdown('Uncaught exception', 1, error);
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

console.log(
  `Starting Kaiyn Announce Bot with Node ${process.version}; required env present: ${presentRequiredEnv.join(
    ', '
  )}.`
);

client.login(discordToken).catch((error) => {
  shutdown('Failed to login', 1, error);
});
