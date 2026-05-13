import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ChannelType,
	EmbedBuilder,
	GuildMember,
	MessageFlags,
	ModalBuilder,
	PermissionFlagsBits,
	SlashCommandBuilder,
	TextInputBuilder,
	TextInputStyle,
} from "discord.js";
import { randomUUID } from "node:crypto";
import {
	buildVerifyPanelPayload,
	getRoleValidationError as getRoleValidationErrorFromData,
	isPendingExpired,
	type PendingVerifyPanel,
	type VerifyPanelInput,
} from "./setup-verify.logic";
import { DEFAULT_COLOR, parseHexColor } from "../utils/color";
import { getMissingTextChannelPermissions } from "../utils/permissions";
import type {
	ButtonInteraction,
	ChatInputCommandInteraction,
	Guild,
	InteractionReplyOptions,
	ModalSubmitInteraction,
	PermissionsBitField,
	Role,
} from "discord.js";
import type { BotCommand } from "../types/command";

type VerifyInteraction =
	| ButtonInteraction
	| ChatInputCommandInteraction
	| ModalSubmitInteraction;

interface SendableVerifyChannel {
	id: string;
	isTextBased(): boolean;
	permissionsFor(member: GuildMember): Readonly<PermissionsBitField> | null;
	send(payload: VerifyPanelPayload): Promise<unknown>;
	toString(): string;
}

interface VerifyPanelPayload {
	components: ActionRowBuilder<ButtonBuilder>[];
	embeds: EmbedBuilder[];
}

const SETUP_VERIFY_MODAL_PREFIX = "setup-verify:";
const VERIFY_CUSTOM_ID_PREFIX = "verify:";
const PENDING_VERIFY_PANEL_TTL_MS = 15 * 60 * 1000;
const DEFAULT_TITLE = "Kaiyn Capital｜社群驗證";
const DEFAULT_DESCRIPTION =
	"歡迎加入 Kaiyn Capital。請點擊下方按鈕完成驗證，驗證成功後即可查看社群頻道。";
const DEFAULT_BUTTON_LABEL = "✅ 完成驗證";
const pendingVerifyPanels = new Map<string, PendingVerifyPanel>();

async function replyEphemeral(
	interaction: VerifyInteraction,
	content: string,
): Promise<unknown> {
	const payload: InteractionReplyOptions = {
		content,
		flags: MessageFlags.Ephemeral,
	};

	if (interaction.deferred && !interaction.replied) {
		return interaction.editReply({ content });
	}

	if (interaction.replied) {
		return interaction.followUp(payload);
	}

	return interaction.reply(payload);
}

function hasSetupPermission(
	interaction: ChatInputCommandInteraction | ModalSubmitInteraction,
): boolean {
	const permissions = interaction.memberPermissions;

	return Boolean(
		permissions?.has(PermissionFlagsBits.Administrator) ||
			permissions?.has(PermissionFlagsBits.ManageGuild),
	);
}

async function getBotMember(guild: Guild): Promise<GuildMember> {
	return guild.members.me || guild.members.fetchMe();
}

function getMissingChannelPermissions(
	channel: SendableVerifyChannel,
	botMember: GuildMember,
): string[] | null {
	const botPermissions = channel.permissionsFor(botMember);

	if (!botPermissions) {
		return null;
	}

	return getMissingTextChannelPermissions({
		canEmbedLinks: botPermissions.has(PermissionFlagsBits.EmbedLinks),
		canSendMessages: botPermissions.has(PermissionFlagsBits.SendMessages),
		canViewChannel: botPermissions.has(PermissionFlagsBits.ViewChannel),
	});
}

function isSendableVerifyChannel(
	channel: unknown,
): channel is SendableVerifyChannel {
	if (!channel || typeof channel !== "object") {
		return false;
	}

	const candidate = channel as Partial<SendableVerifyChannel>;

	return Boolean(
		typeof candidate.isTextBased === "function" &&
			candidate.isTextBased() &&
			typeof candidate.permissionsFor === "function" &&
			typeof candidate.send === "function",
	);
}

function getRoleValidationError(
	guild: Guild,
	botMember: GuildMember,
	role: Role,
): string | null {
	return getRoleValidationErrorFromData({
		botCanManageRoles: botMember.permissions.has(
			PermissionFlagsBits.ManageRoles,
		),
		botHighestRoleCompareToRole:
			botMember.roles.highest.comparePositionTo(role),
		guildId: guild.id,
		roleId: role.id,
		roleManaged: role.managed,
	});
}

function buildVerifyPanel({
	title,
	description,
	parsedColor,
	roleId,
	buttonLabel,
	image,
}: VerifyPanelInput): VerifyPanelPayload {
	const payload = buildVerifyPanelPayload({
		buttonLabel,
		description,
		image,
		parsedColor,
		roleId,
		title,
	});
	const embed = new EmbedBuilder()
		.setTitle(payload.title)
		.setDescription(payload.description)
		.setColor(payload.color)
		.setTimestamp();

	if (payload.image) {
		embed.setImage(payload.image);
	}

	const button = new ButtonBuilder()
		.setCustomId(`${VERIFY_CUSTOM_ID_PREFIX}${payload.roleId}`)
		.setLabel(payload.buttonLabel)
		.setStyle(ButtonStyle.Success);

	const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

	return {
		components: [row],
		embeds: [embed],
	};
}

function cleanupExpiredVerifyPanels() {
	const now = Date.now();

	for (const [id, panel] of pendingVerifyPanels.entries()) {
		if (isPendingExpired(panel.expiresAt, now)) {
			pendingVerifyPanels.delete(id);
		}
	}
}

async function getInteractionGuildMember(
	interaction: ButtonInteraction,
): Promise<GuildMember> {
	if (!interaction.guild) {
		throw new Error("Missing guild for verify interaction.");
	}

	try {
		return await interaction.guild.members.fetch({
			force: true,
			user: interaction.user.id,
		});
	} catch (error) {
		if (interaction.member instanceof GuildMember) {
			return interaction.member;
		}

		throw error;
	}
}

const setupVerifyCommand: BotCommand = {
	data: new SlashCommandBuilder()
		.setName("setup-verify")
		.setDescription("發送中文社群驗證面板")
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
		.setDMPermission(false)
		.addChannelOption((option) =>
			option
				.setName("channel")
				.setDescription("要發送驗證面板的文字頻道")
				.addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
				.setRequired(true),
		)
		.addRoleOption((option) =>
			option
				.setName("role")
				.setDescription("驗證成功後要給予的身分組")
				.setRequired(true),
		)
		.addStringOption((option) =>
			option
				.setName("title")
				.setDescription("驗證面板標題")
				.setMaxLength(256)
				.setRequired(false),
		)
		.addStringOption((option) =>
			option
				.setName("color")
				.setDescription("Embed 顏色，例如 #87CEEB")
				.setRequired(false),
		)
		.addStringOption((option) =>
			option
				.setName("image")
				.setDescription("驗證面板大圖 URL")
				.setRequired(false),
		)
		.addStringOption((option) =>
			option
				.setName("button_label")
				.setDescription("驗證按鈕文字")
				.setMaxLength(80)
				.setRequired(false),
		),

	async execute(interaction) {
		try {
			if (!interaction.inGuild()) {
				return replyEphemeral(interaction, "此指令只能在伺服器中使用。");
			}

			const guild = interaction.guild;

			if (!guild) {
				return replyEphemeral(interaction, "此指令只能在伺服器中使用。");
			}

			if (!hasSetupPermission(interaction)) {
				return replyEphemeral(interaction, "你沒有權限使用此指令。");
			}

			const channel = interaction.options.getChannel("channel", true);
			const selectedRole = interaction.options.getRole("role", true);
			const role = await guild.roles.fetch(selectedRole.id);
			const title = interaction.options.getString("title") || DEFAULT_TITLE;
			const colorInput =
				interaction.options.getString("color") || DEFAULT_COLOR;
			const image = interaction.options.getString("image");
			const buttonLabel =
				interaction.options.getString("button_label") || DEFAULT_BUTTON_LABEL;

			const parsedColor = parseHexColor(colorInput);

			if (parsedColor === null) {
				return replyEphemeral(
					interaction,
					"色碼格式錯誤，請使用 #RRGGBB，例如 #87CEEB。",
				);
			}

			if (!isSendableVerifyChannel(channel)) {
				return replyEphemeral(interaction, "請選擇可發送訊息的文字頻道。");
			}

			if (!role) {
				return replyEphemeral(interaction, "找不到指定的驗證身分組。");
			}

			const botMember = await getBotMember(guild);
			const targetChannel = channel;
			const missingChannelPermissions = getMissingChannelPermissions(
				targetChannel,
				botMember,
			);

			if (!missingChannelPermissions) {
				return replyEphemeral(interaction, "無法檢查機器人在目標頻道的權限。");
			}

			if (missingChannelPermissions.length > 0) {
				return replyEphemeral(
					interaction,
					`機器人在 ${targetChannel} 缺少以下權限：${missingChannelPermissions.join(
						"、",
					)}。`,
				);
			}

			const roleValidationError = getRoleValidationError(
				guild,
				botMember,
				role,
			);

			if (roleValidationError) {
				return replyEphemeral(interaction, roleValidationError);
			}

			cleanupExpiredVerifyPanels();

			const modalId = randomUUID();

			pendingVerifyPanels.set(modalId, {
				buttonLabel,
				channelId: targetChannel.id,
				expiresAt: Date.now() + PENDING_VERIFY_PANEL_TTL_MS,
				guildId: interaction.guildId,
				image,
				parsedColor,
				roleId: role.id,
				title,
				userId: interaction.user.id,
			});

			const modal = new ModalBuilder()
				.setCustomId(`${SETUP_VERIFY_MODAL_PREFIX}${modalId}`)
				.setTitle("建立驗證面板內容");

			const descriptionInput = new TextInputBuilder()
				.setCustomId("description")
				.setLabel("驗證面板內容")
				.setPlaceholder(DEFAULT_DESCRIPTION)
				.setStyle(TextInputStyle.Paragraph)
				.setMaxLength(4000)
				.setRequired(true);

			const row = new ActionRowBuilder<TextInputBuilder>().addComponents(
				descriptionInput,
			);

			modal.addComponents(row);

			return interaction.showModal(modal);
		} catch (error) {
			console.error("Failed to execute /setup-verify:", error);

			const reason =
				error instanceof Error && error.message ? error.message : "未知錯誤";

			try {
				await replyEphemeral(interaction, `驗證面板建立失敗：${reason}`);
			} catch (replyError) {
				console.error(
					"Failed to send setup verify error response:",
					replyError,
				);
			}
		}
	},

	async handleModalSubmit(interaction) {
		if (!interaction.customId.startsWith(SETUP_VERIFY_MODAL_PREFIX)) {
			return false;
		}

		try {
			await interaction.deferReply({ flags: MessageFlags.Ephemeral });

			if (!interaction.inGuild()) {
				await replyEphemeral(interaction, "此指令只能在伺服器中使用。");
				return true;
			}

			const guild = interaction.guild;

			if (!guild) {
				await replyEphemeral(interaction, "此指令只能在伺服器中使用。");
				return true;
			}

			const modalId = interaction.customId.slice(
				SETUP_VERIFY_MODAL_PREFIX.length,
			);
			const pendingPanel = pendingVerifyPanels.get(modalId);

			if (
				!pendingPanel ||
				isPendingExpired(pendingPanel.expiresAt, Date.now())
			) {
				pendingVerifyPanels.delete(modalId);
				await replyEphemeral(
					interaction,
					"驗證面板表單已過期，請重新使用 /setup-verify。",
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
					"這不是你的驗證面板表單，請重新使用 /setup-verify。",
				);
				return true;
			}

			if (!hasSetupPermission(interaction)) {
				await replyEphemeral(interaction, "你沒有權限使用此指令。");
				return true;
			}

			const description = interaction.fields.getTextInputValue("description");

			if (!description.trim()) {
				await replyEphemeral(interaction, "驗證面板內容不能為空。");
				return true;
			}

			const channel = await guild.channels.fetch(pendingPanel.channelId);

			if (!isSendableVerifyChannel(channel)) {
				await replyEphemeral(interaction, "找不到可發送訊息的目標文字頻道。");
				return true;
			}

			const role = await guild.roles.fetch(pendingPanel.roleId);

			if (!role) {
				await replyEphemeral(interaction, "找不到指定的驗證身分組。");
				return true;
			}

			const botMember = await getBotMember(guild);
			const targetChannel = channel;
			const missingChannelPermissions = getMissingChannelPermissions(
				targetChannel,
				botMember,
			);

			if (!missingChannelPermissions) {
				await replyEphemeral(interaction, "無法檢查機器人在目標頻道的權限。");
				return true;
			}

			if (missingChannelPermissions.length > 0) {
				await replyEphemeral(
					interaction,
					`機器人在 ${targetChannel} 缺少以下權限：${missingChannelPermissions.join(
						"、",
					)}。`,
				);
				return true;
			}

			const roleValidationError = getRoleValidationError(
				guild,
				botMember,
				role,
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
				title: pendingPanel.title,
			});

			await targetChannel.send(panel);
			await replyEphemeral(interaction, `驗證面板已發送到 ${targetChannel}`);

			return true;
		} catch (error) {
			console.error("Failed to submit setup verify modal:", error);

			const reason =
				error instanceof Error && error.message ? error.message : "未知錯誤";

			try {
				await replyEphemeral(interaction, `驗證面板建立失敗：${reason}`);
			} catch (replyError) {
				console.error(
					"Failed to send setup verify modal error response:",
					replyError,
				);
			}

			return true;
		}
	},

	async handleVerifyButton(interaction) {
		if (!interaction.customId.startsWith(VERIFY_CUSTOM_ID_PREFIX)) {
			return false;
		}

		try {
			await interaction.deferReply({ flags: MessageFlags.Ephemeral });

			if (!interaction.inGuild()) {
				await replyEphemeral(
					interaction,
					"验证失败，请联络管理员。 Verification failed, please contact the administrator.",
				);
				return true;
			}

			const guild = interaction.guild;

			if (!guild) {
				await replyEphemeral(
					interaction,
					"验证失败，请联络管理员。 Verification failed, please contact the administrator.",
				);
				return true;
			}

			const roleId = interaction.customId.slice(VERIFY_CUSTOM_ID_PREFIX.length);
			const role = await guild.roles.fetch(roleId);

			if (!role) {
				console.error(`Verify role not found: ${roleId}`);
				await replyEphemeral(
					interaction,
					"验证失败，请联络管理员。 Verification failed, please contact the administrator.",
				);
				return true;
			}

			const botMember = await getBotMember(guild);
			const roleValidationError = getRoleValidationError(
				guild,
				botMember,
				role,
			);

			if (roleValidationError) {
				console.error(`Verify role validation failed: ${roleValidationError}`);
				await replyEphemeral(
					interaction,
					"验证失败，请联络管理员。 Verification failed, please contact the administrator.",
				);
				return true;
			}

			const member = await getInteractionGuildMember(interaction);

			if (member.roles.cache.has(role.id)) {
				await replyEphemeral(
					interaction,
					"你已经完成验证。 You have already completed verification.",
				);
				return true;
			}

			await member.roles.add(role);
			await replyEphemeral(
				interaction,
				"✅ 验证成功，你现在可以查看社群频道。 Verification successful. You can now view the community channel.",
			);

			return true;
		} catch (error) {
			console.error("Failed to handle verify button:", error);

			try {
				await replyEphemeral(
					interaction,
					"验证失败，请联络管理员。 Verification failed, please contact the administrator.",
				);
			} catch (replyError) {
				console.error(
					"Failed to send verify button error response:",
					replyError,
				);
			}

			return true;
		}
	},
};

export default setupVerifyCommand;
