import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getMissingTextChannelPermissions } from "./permissions";

describe("getMissingTextChannelPermissions", () => {
	it("returns missing Discord permission names", () => {
		assert.deepEqual(
			getMissingTextChannelPermissions({
				canEmbedLinks: false,
				canSendMessages: false,
				canViewChannel: false,
			}),
			["View Channels", "Send Messages", "Embed Links"],
		);
	});

	it("returns an empty list when all permissions are present", () => {
		assert.deepEqual(
			getMissingTextChannelPermissions({
				canEmbedLinks: true,
				canSendMessages: true,
				canViewChannel: true,
			}),
			[],
		);
	});
});
