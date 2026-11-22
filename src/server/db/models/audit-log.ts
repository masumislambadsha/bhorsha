import "server-only";

import { Schema, model, models, type Model } from "mongoose";

export interface IAuditLog {
  actorId?: string;
  actorRole?: string;
  action: string;
  entityType: string;
  entityId?: string;
  summary: string;
  before?: unknown;
  after?: unknown;
  reason?: string;
  ip?: string;
  userAgent?: string;
  createdAt: Date;
}

const schema = new Schema<IAuditLog>({
  actorId: { type: String },
  actorRole: { type: String },
  action: { type: String, required: true },
  entityType: { type: String, required: true },
  entityId: { type: String },
  summary: { type: String, required: true },
  before: { type: Schema.Types.Mixed },
  after: { type: Schema.Types.Mixed },
  reason: { type: String },
  ip: { type: String },
  userAgent: { type: String },
  createdAt: { type: Date, default: Date.now, required: true },
});

schema.index({ action: 1, createdAt: -1 });
schema.index({ actorId: 1, createdAt: -1 });
schema.index({ createdAt: -1 });

function appendOnly(): never {
  throw new Error("Audit logs are append-only.");
}

for (const operation of [
  "updateOne",
  "updateMany",
  "findOneAndUpdate",
  "deleteOne",
  "deleteMany",
  "findOneAndDelete",
] as const) {
  schema.pre(operation, function () {
    appendOnly();
  });
}

export const AuditLog: Model<IAuditLog> =
  (models.AuditLog as Model<IAuditLog>) ?? model<IAuditLog>("AuditLog", schema);
