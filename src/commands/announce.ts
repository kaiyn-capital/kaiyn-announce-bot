import {
  ActionRowBuilder,
  ChannelType,
  EmbedBuilder,
  MessageFlags,
  ModalBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js';
import { randomUUID } from 'node:crypto';
import {
  buildAnnouncementEmbedPayload,
  isPendingExpired,
  type PendingAnnouncement
} from './announce.logic';
import { DEFAULT_COLOR, parseHexColor } from '../utils/color';
import { getMissingTextChannelPermissions } from '../utils/permissions';
import type {
  ChatInputCommandInteraction,
  GuildMember,
  InteractionReplyOptions,
  ModalSubmitInteraction,
  PermissionsBitField
} from 'discord.js';
import type { BotCommand } from '../types/command';

type AnnounceInteraction = ChatInputCommandInteraction | ModalSubmitInteraction;

interface SendableAnnouncementChannel {
  id: string;
  isTextBased(): boolean;
  permissionsFor(member: GuildMember): Readonly<PermissionsBitField> | null;
  send(payload: { embeds: EmbedBuilder[] }): Promise<unknown>;
  toString(): string;
}

const ANNOUNCE_MODAL_PREFIX = 'announce:';
const PENDING_MODAL_TTL_MS = 15 * 60 * 1000;
const pendingAnnouncements = new Map<string, PendingAnnouncement>();

async function replyEphemeral(
  interaction: AnnounceInteraction,
  content: string
): Promise<unknown> {
  const payload: InteractionReplyOptions = {
    content,
    flags: MessageFlags.Ephemeral
  };

  if (interaction.replied || interaction.deferred) {
    return interaction.followUp(payload);
  }

  return interaction.reply(payload);
}

function hasAnnouncePermission(interaction: AnnounceInteraction): boolean {
  const permissions = interaction.memberPermissions;

  return Boolean(
    permissions?.has(PermissionFlagsBits.ManageMessages) ||
      permissions?.has(PermissionFlagsBits.Administrator)
  );
}

function cleanupExpiredAnnouncements() {
  const now = Date.now();

  for (const [id, announcement] of pendingAnnouncements.entries()) {
    if (isPendingExpired(announcement.expiresAt, now)) {
      pendingAnnouncements.delete(id);
    }
  }
}

function isSendableAnnouncementChannel(
  channel: unknown
): channel is SendableAnnouncementChannel {
  if (!channel || typeof channel !== 'object') {
    return false;
  }

  const candidate = channel as Partial<SendableAnnouncementChannel>;

  return Boolean(
    typeof candidate.isTextBased === 'function' &&
      candidate.isTextBased() &&
      typeof candidate.permissionsFor === 'function' &&
      typeof candidate.send === 'function'
  );
}

async function getMissingBotPermissions(
  interaction: AnnounceInteraction,
  channel: SendableAnnouncementChannel
): Promise<string[] | null> {
  if (!interaction.guild) {
    return null;
  }

  const botMember =
    interaction.guild.members.me || (await interaction.guild.members.fetchMe());
  const botPermissions = channel.permissionsFor(botMember);

  if (!botPermissions) {
    return null;
  }

  return getMissingTextChannelPermissions({
    canEmbedLinks: botPermissions.has(PermissionFlagsBits.EmbedLinks),
    canSendMessages: botPermissions.has(PermissionFlagsBits.SendMessages),
    canViewChannel: botPermissions.has(PermissionFlagsBits.ViewChannel)
  });
}

function buildAnnouncementEmbed(
  announcement: PendingAnnouncement,
  description: string
): EmbedBuilder {
  const payload = buildAnnouncementEmbedPayload(announcement, description);
  const embed = new EmbedBuilder()
    .setTitle(payload.title)
    .setDescription(payload.description)
    .setColor(payload.color);

  if (payload.footer) {
    embed.setFooter({ text: payload.footer });
  }

  if (payload.image) {
    embed.setImage(payload.image);
  }

  if (payload.thumbnail) {
    embed.setThumbnail(payload.thumbnail);
  }

  if (payload.timestamp) {
    embed.setTimestamp();
  }

  return embed;
}

const announceCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('announce')
    .setDescription('開啟多行輸入框並發送彩色 Embed 公告訊息')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .setDMPermission(false)
    .addChannelOption((option) =>
      option
        .setName('channel')
        .setDescription('公告要發送到哪個文字頻道')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('title')
        .setDescription('Embed 標題')
        .setMaxLength(256)
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('color')
        .setDescription('Embed 左側顏色，例如 #2F80ED')
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName('footer')
        .setDescription('底部文字')
        .setMaxLength(2048)
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName('image')
        .setDescription('大圖 URL')
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName('thumbnail')
        .setDescription('縮圖 URL')
        .setRequired(false)
    )
    .addBooleanOption((option) =>
      option
        .setName('timestamp')
        .setDescription('是否加上時間戳，預設 true')
        .setRequired(false)
    ),

  async execute(interaction) {
    try {
      if (!interaction.inGuild()) {
        return replyEphemeral(interaction, '此指令只能在伺服器中使用。');
      }

      if (!hasAnnouncePermission(interaction)) {
        return replyEphemeral(interaction, '你沒有權限使用此指令。');
      }

      const channel = interaction.options.getChannel('channel', true);
      const title = interaction.options.getString('title', true);
      const colorInput = interaction.options.getString('color') || DEFAULT_COLOR;
      const footer = interaction.options.getString('footer');
      const image = interaction.options.getString('image');
      const thumbnail = interaction.options.getString('thumbnail');
      const timestamp = interaction.options.getBoolean('timestamp') ?? true;

      const parsedColor = parseHexColor(colorInput);

      if (parsedColor === null) {
        return replyEphemeral(
          interaction,
          '色碼格式錯誤，請使用 #RRGGBB，例如 #2F80ED。'
        );
      }

      if (!isSendableAnnouncementChannel(channel)) {
        return replyEphemeral(interaction, '請選擇可發送訊息的文字頻道。');
      }

      const targetChannel = channel;
      const missingPermissions = await getMissingBotPermissions(
        interaction,
        targetChannel
      );

      if (!missingPermissions) {
        return replyEphemeral(interaction, '無法檢查機器人在目標頻道的權限。');
      }

      if (missingPermissions.length > 0) {
        return replyEphemeral(
          interaction,
          `機器人在 ${targetChannel} 缺少以下權限：${missingPermissions.join('、')}。`
        );
      }

      cleanupExpiredAnnouncements();

      const modalId = randomUUID();

      pendingAnnouncements.set(modalId, {
        channelId: targetChannel.id,
        expiresAt: Date.now() + PENDING_MODAL_TTL_MS,
        footer,
        guildId: interaction.guildId,
        image,
        parsedColor,
        thumbnail,
        timestamp,
        title,
        userId: interaction.user.id
      });

      const modal = new ModalBuilder()
        .setCustomId(`${ANNOUNCE_MODAL_PREFIX}${modalId}`)
        .setTitle('建立公告內容');

      const descriptionInput = new TextInputBuilder()
        .setCustomId('description')
        .setLabel('公告內容')
        .setPlaceholder('請貼上公告內容，可保留換行與空行。')
        .setStyle(TextInputStyle.Paragraph)
        .setMaxLength(4000)
        .setRequired(true);

      const row = new ActionRowBuilder<TextInputBuilder>().addComponents(
        descriptionInput
      );

      modal.addComponents(row);

      return interaction.showModal(modal);
    } catch (error) {
      console.error('Failed to execute /announce:', error);

      const reason = error instanceof Error && error.message ? error.message : '未知錯誤';

      try {
        await replyEphemeral(interaction, `公告發送失敗：${reason}`);
      } catch (replyError) {
        console.error('Failed to send error response:', replyError);
      }
    }
  },

  async handleModalSubmit(interaction) {
    if (!interaction.customId.startsWith(ANNOUNCE_MODAL_PREFIX)) {
      return false;
    }

    try {
      if (!interaction.inGuild()) {
        await replyEphemeral(interaction, '此指令只能在伺服器中使用。');
        return true;
      }

      const modalId = interaction.customId.slice(ANNOUNCE_MODAL_PREFIX.length);
      const announcement = pendingAnnouncements.get(modalId);

      if (!announcement || isPendingExpired(announcement.expiresAt, Date.now())) {
        pendingAnnouncements.delete(modalId);
        await replyEphemeral(interaction, '公告表單已過期，請重新使用 /announce。');
        return true;
      }

      pendingAnnouncements.delete(modalId);

      if (
        announcement.userId !== interaction.user.id ||
        announcement.guildId !== interaction.guildId
      ) {
        await replyEphemeral(interaction, '這不是你的公告表單，請重新使用 /announce。');
        return true;
      }

      if (!hasAnnouncePermission(interaction)) {
        await replyEphemeral(interaction, '你沒有權限使用此指令。');
        return true;
      }

      const guild = interaction.guild;

      if (!guild) {
        await replyEphemeral(interaction, '此指令只能在伺服器中使用。');
        return true;
      }

      const channel = await guild.channels.fetch(announcement.channelId);

      if (!isSendableAnnouncementChannel(channel)) {
        await replyEphemeral(interaction, '找不到可發送訊息的目標文字頻道。');
        return true;
      }

      const targetChannel = channel;
      const missingPermissions = await getMissingBotPermissions(
        interaction,
        targetChannel
      );

      if (!missingPermissions) {
        await replyEphemeral(interaction, '無法檢查機器人在目標頻道的權限。');
        return true;
      }

      if (missingPermissions.length > 0) {
        await replyEphemeral(
          interaction,
          `機器人在 ${targetChannel} 缺少以下權限：${missingPermissions.join('、')}。`
        );
        return true;
      }

      const description = interaction.fields.getTextInputValue('description');

      if (!description.trim()) {
        await replyEphemeral(interaction, '公告內容不能為空。');
        return true;
      }

      const embed = buildAnnouncementEmbed(announcement, description);

      await targetChannel.send({
        embeds: [embed]
      });

      await replyEphemeral(interaction, `公告已發送到 ${targetChannel}`);
      return true;
    } catch (error) {
      console.error('Failed to submit announce modal:', error);

      const reason = error instanceof Error && error.message ? error.message : '未知錯誤';

      try {
        await replyEphemeral(interaction, `公告發送失敗：${reason}`);
      } catch (replyError) {
        console.error('Failed to send modal error response:', replyError);
      }

      return true;
    }
  }
};

export default announceCommand;
