export interface TextChannelPermissionCapabilities {
	canViewChannel: boolean;
	canSendMessages: boolean;
	canEmbedLinks: boolean;
}

export function getMissingTextChannelPermissions({
	canViewChannel,
	canSendMessages,
	canEmbedLinks,
}: TextChannelPermissionCapabilities): string[] {
	const missingPermissions: string[] = [];

	if (!canViewChannel) {
		missingPermissions.push("View Channels");
	}

	if (!canSendMessages) {
		missingPermissions.push("Send Messages");
	}

	if (!canEmbedLinks) {
		missingPermissions.push("Embed Links");
	}

	return missingPermissions;
}
