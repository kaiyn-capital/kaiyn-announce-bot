require('dotenv').config();

const {
  Client,
  Collection,
  Events,
  GatewayIntentBits,
  MessageFlags
} = require('discord.js');
const announceCommand = require('./commands/announce');
const setupVerifyCommand = require('./commands/setup-verify');

const requiredEnv = ['DISCORD_TOKEN'];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(`Missing environment variable: ${key}`);
    process.exit(1);
  }
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.commands = new Collection();
client.commands.set(announceCommand.data.name, announceCommand);
client.commands.set(setupVerifyCommand.data.name, setupVerifyCommand);

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Logged in as ${readyClient.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isModalSubmit()) {
      const isAnnounceModal = await announceCommand.handleModalSubmit(interaction);

      if (isAnnounceModal) {
        return;
      }

      const isSetupVerifyModal = await setupVerifyCommand.handleModalSubmit(
        interaction
      );

      if (isSetupVerifyModal) {
        return;
      }

      return;
    }

    if (interaction.isButton()) {
      await setupVerifyCommand.handleVerifyButton(interaction);
      return;
    }

    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) return;

    await command.execute(interaction);
  } catch (error) {
    const interactionName = interaction.isChatInputCommand()
      ? `/${interaction.commandName}`
      : interaction.customId || interaction.type;

    console.error(`Error handling ${interactionName}:`, error);

    const payload = {
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

client.login(process.env.DISCORD_TOKEN).catch((error) => {
  console.error('Failed to login:', error);
  process.exit(1);
});
