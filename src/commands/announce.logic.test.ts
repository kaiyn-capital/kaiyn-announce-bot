import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	buildAnnouncementEmbedPayload,
	isPendingExpired,
	type PendingAnnouncement,
} from "./announce.logic";

const announcement: PendingAnnouncement = {
	channelId: "channel-1",
	expiresAt: 2000,
	footer: "Footer",
	guildId: "guild-1",
	image: "https://example.com/image.png",
	parsedColor: 0x2f80ed,
	thumbnail: "https://example.com/thumb.png",
	timestamp: true,
	title: "Title",
	userId: "user-1",
};

describe("announce logic", () => {
	it("checks pending expiration against the supplied clock", () => {
		assert.equal(isPendingExpired(2000, 1999), false);
		assert.equal(isPendingExpired(2000, 2000), true);
		assert.equal(isPendingExpired(2000, 2001), true);
	});

	it("prepares announcement embed payload data", () => {
		assert.deepEqual(
			buildAnnouncementEmbedPayload(announcement, "Description"),
			{
				color: 0x2f80ed,
				description: "Description",
				footer: "Footer",
				image: "https://example.com/image.png",
				thumbnail: "https://example.com/thumb.png",
				timestamp: true,
				title: "Title",
			},
		);
	});
});
