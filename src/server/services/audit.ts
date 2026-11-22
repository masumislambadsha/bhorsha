import "server-only";

import type { Actor } from "@/server/auth/guards";
import { AuditLog } from "@/server/db/models";

export interface AuditEntry {
  action: string;
  entityType: string;
  entityId?: string;
  summary: string;
  before?: unknown;
  after?: unknown;
  reason?: string;
}

export async function writeAuditLog(actor: Actor, entry: AuditEntry): Promise<void> {
  await AuditLog.create([
    {
      actorId: actor.id,
      actorRole: actor.role,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      summary: entry.summary,
      before: entry.before,
      after: entry.after,
      reason: entry.reason,
    },
  ]);
}
