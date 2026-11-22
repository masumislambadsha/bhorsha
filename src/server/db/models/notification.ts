import "server-only";

import { Schema, model, models, type Model } from "mongoose";

export interface INotification {
  userId: string;
  type: string;
  title: string;
  body: string;
  link?: string;
  readAt?: Date;
  createdAt: Date;
}

const schema = new Schema<INotification>({
  userId: { type: String, required: true },
  type: { type: String, required: true },
  title: { type: String, required: true },
  body: { type: String, required: true },
  link: { type: String },
  readAt: { type: Date },
  createdAt: { type: Date, default: Date.now, required: true },
});

schema.index({ userId: 1, readAt: 1, createdAt: -1 });

export const Notification: Model<INotification> =
  (models.Notification as Model<INotification>) ?? model<INotification>("Notification", schema);
