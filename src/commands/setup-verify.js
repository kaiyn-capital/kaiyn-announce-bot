const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  MessageFlags,
  ModalBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');
const { randomUUID } = require('node:crypto');
const { DEFAULT_COLOR, parseHexColor } = require('../utils/color');

const SETUP_VERIFY_MODAL_PREFIX = 'setup-verify:';
const VERIFY_CUSTOM_ID_PREFIX = 'verify:';
const PENDING_VERIFY_PANEL_TTL_MS = 15 * 60 * 1000;
const DEFAULT_TITLE = 'Kaiyn Capital｜社群驗證';
const DEFAULT_DESCRIPTION =
  '歡迎加入 Kaiyn Capital。請點擊下方按鈕完成驗證，驗證成功後即可查看社群頻道。';
const DEFAULT_BUTTON_LABEL = '✅ 完成驗證';
const pendingVerifyPanels = new Map();

async function replyEphemeral(interaction, content) {
  const payload = {
    content,
    flags: MessageFlags.Ephemeral
  };

  if (interaction.replied || interaction.deferred) {
    return interaction.followUp(payload);
  }

  return interaction.reply(payload);
}

function hasSetupPermission(interaction) {
  const permissions = interaction.memberPermissions;

  return Boolean(
    permissions?.has(PermissionFlagsBits.Administrator) ||
    permissions?.has(PermissionFlagsBits.ManageGuild)
  );
}

async function getBotMember(guild) {
  return guild.members.me || guild.members.fetchMe();
}

function getMissingChannelPermissions(channel, botMember) {
  const botPermissions = channel.permissionsFor(botMember);

  if (!botPermissions) {
    return null;
  }

  const missingPermissions = [];

  if (!botPermissions.has(PermissionFlagsBits.ViewChannel)) {
    missingPermissions.push('View Channels');
  }

  if (!botPermissions.has(PermissionFlagsBits.SendMessages)) {
    missingPermissions.push('Send Messages');
  }

  if (!botPermissions.has(PermissionFlagsBits.EmbedLinks)) {
    missingPermissions.push('Embed Links');
  }

  return missingPermissions;
}

function getRoleValidationError(guild, botMember, role) {
  if (role.id === guild.id) {
    return '不能將 @everyone 作為驗證身分組。';
  }

  if (role.managed) {
    return '不能發放由 Discord 或整合服務管理的身分組。';
  }

  if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
    return '機器人缺少 Manage Roles 權限。';
  }

  if (botMember.roles.highest.comparePositionTo(role) <= 0) {
    return '機器人的最高身分組必須高於要發放的 Verified 身分組。';
  }

  return null;
}

function buildVerifyPanel({
  title,
  description,
  parsedColor,
  roleId,
  buttonLabel,
  image
}) {
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(parsedColor)
    .setTimestamp();

  if (image) {
    embed.setImage(image);
  }

  const button = new ButtonBuilder()
    .setCustomId(`${VERIFY_CUSTOM_ID_PREFIX}${roleId}`)
    .setLabel(buttonLabel)
    .setStyle(ButtonStyle.Success);

  const row = new ActionRowBuilder().addComponents(button);

  return {
    components: [row],
    embeds: [embed]
  };
}

function cleanupExpiredVerifyPanels() {
  const now = Date.now();

  for (const [id, panel] of pendingVerifyPanels.entries()) {
    if (panel.expiresAt <= now) {
      pendingVerifyPanels.delete(id);
    }
  }
}

async function getInteractionGuildMember(interaction) {
  try {
    return await interaction.guild.members.fetch({
      force: true,
      user: interaction.user.id
    });
  } catch (error) {
    if (
      interaction.member &&
      interaction.member.roles &&
      typeof interaction.member.roles.add === 'function'
    ) {
      return interaction.member;
    }

    throw error;
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-verify')
    .setDescription('發送中文社群驗證面板')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)
    .addChannelOption((option) =>
      option
        .setName('channel')
        .setDescription('要發送驗證面板的文字頻道')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(true)
    )
    .addRoleOption((option) =>
      option
        .setName('role')
        .setDescription('驗證成功後要給予的身分組')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('title')
        .setDescription('驗證面板標題')
        .setMaxLength(256)
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName('color')
        .setDescription('Embed 顏色，例如 #2F80ED')
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName('image')
        .setDescription('驗證面板大圖 URL')
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName('button_label')
        .setDescription('驗證按鈕文字')
        .setMaxLength(80)
        .setRequired(false)
    ),

  async execute(interaction) {
    try {
      if (!interaction.inGuild()) {
        return replyEphemeral(interaction, '此指令只能在伺服器中使用。');
      }

      if (!hasSetupPermission(interaction)) {
        return replyEphemeral(interaction, '你沒有權限使用此指令。');
      }

      const channel = interaction.options.getChannel('channel', true);
      const selectedRole = interaction.options.getRole('role', true);
      const role = await interaction.guild.roles.fetch(selectedRole.id);
      const title = interaction.options.getString('title') || DEFAULT_TITLE;
      const colorInput = interaction.options.getString('color') || DEFAULT_COLOR;
      const image = interaction.options.getString('image');
      const buttonLabel =
        interaction.options.getString('button_label') || DEFAULT_BUTTON_LABEL;

      const parsedColor = parseHexColor(colorInput);

      if (parsedColor === null) {
        return replyEphemeral(
          interaction,
          '色碼格式錯誤，請使用 #RRGGBB，例如 #2F80ED。'
        );
      }

      if (!channel.isTextBased() || typeof channel.send !== 'function') {
        return replyEphemeral(interaction, '請選擇可發送訊息的文字頻道。');
      }

      if (!role) {
        return replyEphemeral(interaction, '找不到指定的驗證身分組。');
      }

      const botMember = await getBotMember(interaction.guild);
      const missingChannelPermissions = getMissingChannelPermissions(channel, botMember);

      if (!missingChannelPermissions) {
        return replyEphemeral(interaction, '無法檢查機器人在目標頻道的權限。');
      }

      if (missingChannelPermissions.length > 0) {
        return replyEphemeral(
          interaction,
          `機器人在 ${channel} 缺少以下權限：${missingChannelPermissions.join(
            '、'
          )}。`
        );
      }

      const roleValidationError = getRoleValidationError(
        interaction.guild,
        botMember,
        role
      );

      if (roleValidationError) {
        return replyEphemeral(interaction, roleValidationError);
      }

      cleanupExpiredVerifyPanels();

      const modalId = randomUUID();

      pendingVerifyPanels.set(modalId, {
        buttonLabel,
        channelId: channel.id,
        expiresAt: Date.now() + PENDING_VERIFY_PANEL_TTL_MS,
        guildId: interaction.guildId,
        image,
        parsedColor,
        roleId: role.id,
        title,
        userId: interaction.user.id
      });

      const modal = new ModalBuilder()
        .setCustomId(`${SETUP_VERIFY_MODAL_PREFIX}${modalId}`)
        .setTitle('建立驗證面板內容');

      const descriptionInput = new TextInputBuilder()
        .setCustomId('description')
        .setLabel('驗證面板內容')
        .setPlaceholder(DEFAULT_DESCRIPTION)
        .setStyle(TextInputStyle.Paragraph)
        .setMaxLength(4000)
        .setRequired(true);

      const row = new ActionRowBuilder().addComponents(descriptionInput);

      modal.addComponents(row);

      return interaction.showModal(modal);
    } catch (error) {
      console.error('Failed to execute /setup-verify:', error);

      const reason = error instanceof Error && error.message ? error.message : '未知錯誤';

      try {
        await replyEphemeral(interaction, `驗證面板建立失敗：${reason}`);
      } catch (replyError) {
        console.error('Failed to send setup verify error response:', replyError);
      }
    }
  },

  async handleModalSubmit(interaction) {
    if (!interaction.customId.startsWith(SETUP_VERIFY_MODAL_PREFIX)) {
      return false;
    }

    try {
      if (!interaction.inGuild()) {
        await replyEphemeral(interaction, '此指令只能在伺服器中使用。');
        return true;
      }

      const modalId = interaction.customId.slice(SETUP_VERIFY_MODAL_PREFIX.length);
      const pendingPanel = pendingVerifyPanels.get(modalId);

      if (!pendingPanel || pendingPanel.expiresAt <= Date.now()) {
        pendingVerifyPanels.delete(modalId);
        await replyEphemeral(
          interaction,
          '驗證面板表單已過期，請重新使用 /setup-verify。'
        );
        return true;
      }

      pendingVerifyPanels.delete(modalId);

      if (
        pendingPanel.userId !== interaction.user.id ||
        pendingPanel.guildId !== interaction.guildId
      ) {
        await replyEphemeral(
          interaction,
          '這不是你的驗證面板表單，請重新使用 /setup-verify。'
        );
        return true;
      }

      if (!hasSetupPermission(interaction)) {
        await replyEphemeral(interaction, '你沒有權限使用此指令。');
        return true;
      }

      const description = interaction.fields.getTextInputValue('description');

      if (!description.trim()) {
        await replyEphemeral(interaction, '驗證面板內容不能為空。');
        return true;
      }

      const channel = await interaction.guild.channels.fetch(pendingPanel.channelId);

      if (!channel || !channel.isTextBased() || typeof channel.send !== 'function') {
        await replyEphemeral(interaction, '找不到可發送訊息的目標文字頻道。');
        return true;
      }

      const role = await interaction.guild.roles.fetch(pendingPanel.roleId);

      if (!role) {
        await replyEphemeral(interaction, '找不到指定的驗證身分組。');
        return true;
      }

      const botMember = await getBotMember(interaction.guild);
      const missingChannelPermissions = getMissingChannelPermissions(channel, botMember);

      if (!missingChannelPermissions) {
        await replyEphemeral(interaction, '無法檢查機器人在目標頻道的權限。');
        return true;
      }

      if (missingChannelPermissions.length > 0) {
        await replyEphemeral(
          interaction,
          `機器人在 ${channel} 缺少以下權限：${missingChannelPermissions.join(
            '、'
          )}。`
        );
        return true;
      }

      const roleValidationError = getRoleValidationError(
        interaction.guild,
        botMember,
        role
      );

      if (roleValidationError) {
        await replyEphemeral(interaction, roleValidationError);
        return true;
      }

      const panel = buildVerifyPanel({
        buttonLabel: pendingPanel.buttonLabel,
        description,
        image: pendingPanel.image,
        parsedColor: pendingPanel.parsedColor,
        roleId: pendingPanel.roleId,
        title: pendingPanel.title
      });

      await channel.send(panel);
      await replyEphemeral(interaction, `驗證面板已發送到 ${channel}`);

      return true;
    } catch (error) {
      console.error('Failed to submit setup verify modal:', error);

      const reason = error instanceof Error && error.message ? error.message : '未知錯誤';

      try {
        await replyEphemeral(interaction, `驗證面板建立失敗：${reason}`);
      } catch (replyError) {
        console.error('Failed to send setup verify modal error response:', replyError);
      }

      return true;
    }
  },

  async handleVerifyButton(interaction) {
    if (!interaction.customId.startsWith(VERIFY_CUSTOM_ID_PREFIX)) {
      return false;
    }

    try {
      if (!interaction.inGuild()) {
        await replyEphemeral(interaction, '验证失败，请联络管理员。 Verification failed, please contact the administrator.');
        return true;
      }

      const roleId = interaction.customId.slice(VERIFY_CUSTOM_ID_PREFIX.length);
      const role = await interaction.guild.roles.fetch(roleId);

      if (!role) {
        console.error(`Verify role not found: ${roleId}`);
        await replyEphemeral(interaction, '验证失败，请联络管理员。 Verification failed, please contact the administrator.');
        return true;
      }

      const botMember = await getBotMember(interaction.guild);
      const roleValidationError = getRoleValidationError(
        interaction.guild,
        botMember,
        role
      );

      if (roleValidationError) {
        console.error(`Verify role validation failed: ${roleValidationError}`);
        await replyEphemeral(interaction, '验证失败，请联络管理员。 Verification failed, please contact the administrator.');
        return true;
      }

      const member = await getInteractionGuildMember(interaction);

      if (member.roles.cache.has(role.id)) {
        await replyEphemeral(interaction, '你已经完成验证。 You have already completed verification.');
        return true;
      }

      await member.roles.add(role);
      await replyEphemeral(
        interaction,
        '✅ 验证成功，你现在可以查看社群频道。 Verification successful. You can now view the community channel.'
      );

      return true;
    } catch (error) {
      console.error('Failed to handle verify button:', error);

      try {
        await replyEphemeral(interaction, '验证失败，请联络管理员。 Verification failed, please contact the administrator.');
      } catch (replyError) {
        console.error('Failed to send verify button error response:', replyError);
      }

      return true;
    }
  }
};
