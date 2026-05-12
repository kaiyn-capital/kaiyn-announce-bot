export interface PendingAnnouncement {
  channelId: string;
  expiresAt: number;
  footer: string | null;
  guildId: string | null;
  image: string | null;
  parsedColor: number;
  thumbnail: string | null;
  timestamp: boolean;
  title: string;
  userId: string;
}

export interface AnnouncementEmbedPayload {
  title: string;
  description: string;
  color: number;
  footer: string | null;
  image: string | null;
  thumbnail: string | null;
  timestamp: boolean;
}

export function isPendingExpired(expiresAt: number, now: number): boolean {
  return expiresAt <= now;
}

export function buildAnnouncementEmbedPayload(
  announcement: PendingAnnouncement,
  description: string
): AnnouncementEmbedPayload {
  return {
    color: announcement.parsedColor,
    description,
    footer: announcement.footer,
    image: announcement.image,
    thumbnail: announcement.thumbnail,
    timestamp: announcement.timestamp,
    title: announcement.title
  };
}
