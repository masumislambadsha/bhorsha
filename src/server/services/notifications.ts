import "server-only";

import type { ClientSession } from "mongoose";
import { Notification } from "@/server/db/models";

export async function createNotification(
  userId: string,
  input: { type: string; title: string; body: string; link?: string },
  session?: ClientSession,
): Promise<void> {
  await Notification.create(
    [{ userId, type: input.type, title: input.title, body: input.body, link: input.link }],
    { session },
  );
}

export interface NotificationDto {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string;
  readAt: string | null;
  createdAt: string;
}

function toDto(doc: {
  _id: unknown;
  type: string;
  title: string;
  body: string;
  link?: string;
  readAt?: Date;
  createdAt: Date;
}): NotificationDto {
  return {
    id: String(doc._id),
    type: doc.type,
    title: doc.title,
    body: doc.body,
    link: doc.link ?? "",
    readAt: doc.readAt ? new Date(doc.readAt).toISOString() : null,
    createdAt: new Date(doc.createdAt).toISOString(),
  };
}

export async function listNotifications(userId: string, filter?: "unread" | "read"): Promise<NotificationDto[]> {
  const where: Record<string, unknown> = { userId };
  if (filter === "unread") where.readAt = null;
  if (filter === "read") where.readAt = { $ne: null };
  const docs = await Notification.find(where).sort({ createdAt: -1 }).limit(100).lean();
  return docs.map(toDto);
}

export async function unreadCount(userId: string): Promise<number> {
  return Notification.countDocuments({ userId, readAt: null });
}

export async function markRead(userId: string, input: { ids?: string[]; all?: boolean }): Promise<void> {
  const where: Record<string, unknown> = { userId, readAt: null };
  if (!input.all) {
    if (!input.ids?.length) return;
    const { ObjectId } = await import("mongodb");
    where._id = { $in: input.ids.map((id) => new ObjectId(id)) };
  }
  await Notification.updateMany(where, { $set: { readAt: new Date() } });
}
