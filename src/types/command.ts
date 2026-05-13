import type {
	ButtonInteraction,
	ChatInputCommandInteraction,
	ModalSubmitInteraction,
	SlashCommandBuilder,
	SlashCommandOptionsOnlyBuilder,
} from "discord.js";

export interface BotCommand {
	data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder;
	execute(interaction: ChatInputCommandInteraction): Promise<unknown>;
	handleModalSubmit?(interaction: ModalSubmitInteraction): Promise<boolean>;
	handleVerifyButton?(interaction: ButtonInteraction): Promise<boolean>;
}
