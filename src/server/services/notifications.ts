import "server-only";

import { Notification } from "@/server/db/models";

export interface NotificationInput {
  type: string;
  title: string;
  body: string;
  link?: string;
}

export async function createNotification(userId: string, input: NotificationInput): Promise<void> {
  await Notification.create([
    {
      userId,
      type: input.type,
      title: input.title,
      body: input.body,
      link: input.link,
      createdAt: new Date(),
    },
  ]);
}
