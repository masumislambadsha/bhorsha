import "server-only";

import type { Actor } from "@/server/auth/guards";
import { assertRole } from "@/server/auth/guards";
import { auth } from "@/server/auth/auth";
import { AppError } from "@/server/http/errors";
import { paginate, type Page } from "@/server/http/pagination";
import { AuditLog, AuthUser, BankSettings } from "@/server/db/models";
import type { IBankSettings } from "@/server/db/models";
import { getSettings } from "@/server/services/settings";
import { writeAuditLog } from "@/server/services/audit";

export interface AuditLogDto {
  id: string;
  actorId: string | null;
  actorRole: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  summary: string;
  reason: string | null;
  createdAt: string;
}

export interface StaffDto {
  id: string;
  name: string;
  email: string;
  role: string;
  banned: boolean;
  createdAt: string;
}

export async function updateSettings(
  actor: Actor | null,
  input: Partial<Omit<IBankSettings, "key" | "updatedBy" | "updatedAt">>,
): Promise<IBankSettings> {
  assertRole(actor, ["admin"]);
  const before = await getSettings();
  const next: IBankSettings = { ...before, ...input, key: "default", updatedBy: actor.id, updatedAt: new Date() };
  await BankSettings.updateOne({ key: "default" }, { $set: next }, { upsert: true });
  await writeAuditLog(actor, {
    action: "SETTINGS_UPDATED",
    entityType: "bank_settings",
    entityId: "default",
    summary: "Bank settings updated.",
    before,
    after: next,
  });
  return next;
}

export async function listStaff(actor: Actor | null): Promise<StaffDto[]> {
  assertRole(actor, ["admin"]);
  const users = await AuthUser.find({ role: { $in: ["staff", "admin"] } }).sort({ name: 1 }).lean();
  return users.map((user) => ({
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    banned: user.banned ?? false,
    createdAt: new Date(user.createdAt).toISOString(),
  }));
}

export async function createStaff(
  actor: Actor | null,
  input: { name: string; email: string; password: string },
  headers: Headers,
): Promise<StaffDto> {
  assertRole(actor, ["admin"]);
  const email = input.email.trim().toLowerCase();
  if (await AuthUser.exists({ email })) throw new AppError("CONFLICT", "An account with that email already exists.");
  const response = await auth.api.createUser({
    body: { name: input.name.trim(), email, password: input.password, role: "staff" },
    headers,
  });
  const id = String((response as { user?: { id?: string } }).user?.id ?? "");
  if (!id) throw new AppError("INTERNAL_ERROR", "Could not create the staff user.");
  await writeAuditLog(actor, {
    action: "STAFF_CREATED",
    entityType: "user",
    entityId: id,
    summary: `Staff user ${input.name} created.`,
    after: { email },
  });
  return { id, name: input.name.trim(), email, role: "staff", banned: false, createdAt: new Date().toISOString() };
}

export async function listAuditLogs(
  actor: Actor | null,
  input: { action?: string; actorId?: string; from?: string; to?: string; page: number; pageSize: number },
): Promise<Page<AuditLogDto>> {
  assertRole(actor, ["admin"]);
  const where: Record<string, unknown> = {};
  if (input.action) where.action = input.action;
  if (input.actorId) where.actorId = input.actorId;
  if (input.from || input.to) {
    where.createdAt = {
      ...(input.from ? { $gte: new Date(`${input.from}T00:00:00.000Z`) } : {}),
      ...(input.to ? { $lte: new Date(`${input.to}T23:59:59.999Z`) } : {}),
    };
  }
  const total = await AuditLog.countDocuments(where);
  const docs = await AuditLog.find(where)
    .sort({ createdAt: -1 })
    .skip((input.page - 1) * input.pageSize)
    .limit(input.pageSize)
    .lean();
  return paginate(
    docs.map((doc) => ({
      id: String(doc._id),
      actorId: doc.actorId ?? null,
      actorRole: doc.actorRole ?? null,
      action: doc.action,
      entityType: doc.entityType,
      entityId: doc.entityId ?? null,
      summary: doc.summary,
      reason: doc.reason ?? null,
      createdAt: new Date(doc.createdAt).toISOString(),
    })),
    total,
    input.page,
    input.pageSize,
  );
}
