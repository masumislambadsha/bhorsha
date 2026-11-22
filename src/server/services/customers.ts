import "server-only";

import { randomBytes } from "node:crypto";
import type { CustomerDto } from "@/features/customers/types";
import { escapeRegExp } from "@/lib/domain";
import type { Actor } from "@/server/auth/guards";
import { assertRole } from "@/server/auth/guards";
import { auth } from "@/server/auth/auth";
import { AuthUser, BankAccount, CustomerProfile, TransactionModel, Loan } from "@/server/db/models";
import { AppError } from "@/server/http/errors";
import { paginate, type Page } from "@/server/http/pagination";
import { toCustomerDto } from "@/server/dto/customers";
import { toAccountDto } from "@/server/dto/accounts";
import type { AccountDto } from "@/features/accounts/types";
import { toLoanDto, type LoanDto } from "@/server/dto/loans";
import { toTransactionDto, type TransactionDto } from "@/server/dto/transactions";
import { writeAuditLog } from "./audit";
import { createNotification } from "./notifications";

export interface CustomerListFilters {
  q?: string;
  kyc?: string;
  status?: string;
  page: number;
  pageSize: number;
}

export interface CustomerDetail {
  customer: CustomerDto;
  accounts: AccountDto[];
  recentTransactions: TransactionDto[];
  loans: LoanDto[];
}

export function generateTempPassword(): string {
  return randomBytes(12).toString("hex");
}

export async function listCustomers(actor: Actor | null, filters: CustomerListFilters): Promise<Page<CustomerDto>> {
  assertRole(actor, ["staff", "admin"]);
  const regex = filters.q ? new RegExp(escapeRegExp(filters.q), "i") : null;
  const baseQuery: Record<string, unknown> = {};
  if (filters.kyc) baseQuery.kycStatus = filters.kyc;
  if (filters.status) baseQuery.status = filters.status;

  const candidateIds = new Set<string>();
  if (regex) {
    const byText = await AuthUser.find({ role: "customer", $or: [{ name: regex }, { email: regex }, { phone: regex }] }).select("_id").lean();
    for (const user of byText) candidateIds.add(String(user._id));
    const byNumber = await BankAccount.find({ kind: "customer", accountNumber: regex }).select("ownerId").lean();
    for (const account of byNumber) if (account.ownerId) candidateIds.add(account.ownerId);
  } else {
    const users = await AuthUser.find({ role: "customer" }).select("_id").lean();
    for (const user of users) candidateIds.add(String(user._id));
  }

  const profiles = await CustomerProfile.find({ userId: { $in: [...candidateIds] }, ...baseQuery }).lean();
  const profileIds = new Set(profiles.map((p) => String(p.userId)));
  const ids = [...profileIds];
  const total = ids.length;
  const pageIds = ids.slice((filters.page - 1) * filters.pageSize, filters.page * filters.pageSize);
  const items: CustomerDto[] = [];
  for (const id of pageIds) {
    const user = await AuthUser.findOne({ _id: id }).lean();
    const profile = await CustomerProfile.findOne({ userId: id }).lean();
    if (user && profile) items.push(toCustomerDto(user, profile));
  }
  return paginate(items, total, filters.page, filters.pageSize);
}

export async function getCustomer(actor: Actor | null, customerId: string): Promise<CustomerDetail> {
  assertRole(actor, ["staff", "admin"]);
  const user = await AuthUser.findOne({ _id: customerId }).lean();
  const profile = await CustomerProfile.findOne({ userId: customerId }).lean();
  if (!user || !profile) throw new AppError("NOT_FOUND", "Customer not found.");
  const accounts = (await BankAccount.find({ kind: "customer", ownerId: customerId }).sort({ createdAt: -1 }).lean()).map(toAccountDto);
  const accountIds = accounts.map((a) => a.id);
  const transactions = await TransactionModel.find({
    $or: [{ fromAccountId: { $in: accountIds } }, { toAccountId: { $in: accountIds } }],
  })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();
  const loans = await Loan.find({ applicantId: customerId }).sort({ createdAt: -1 }).limit(10).lean();
  return {
    customer: toCustomerDto(user, profile),
    accounts,
    recentTransactions: transactions.map(toTransactionDto),
    loans: loans.map(toLoanDto),
  };
}

export async function reviewKYC(actor: Actor | null, customerId: string, input: { decision: "verified" | "rejected"; note?: string }): Promise<void> {
  assertRole(actor, ["staff", "admin"]);
  const profile = await CustomerProfile.findOne({ userId: customerId }).lean();
  if (!profile) throw new AppError("NOT_FOUND", "Customer not found.");
  await CustomerProfile.updateOne(
    { userId: customerId },
    { $set: { kycStatus: input.decision, kycNote: input.note ?? null, kycReviewedBy: actor.id, kycReviewedAt: new Date() } },
  );
  await writeAuditLog(actor, {
    action: input.decision === "verified" ? "KYC_VERIFIED" : "KYC_REJECTED",
    entityType: "customer",
    entityId: customerId,
    summary: `KYC ${input.decision} for ${customerId}.`,
  });
  await createNotification(customerId, {
    type: input.decision === "verified" ? "kyc_verified" : "kyc_rejected",
    title: input.decision === "verified" ? "Identity verified" : "Identity review rejected",
    body:
      input.decision === "verified"
        ? "Your identity has been verified by staff. You can now open an account."
        : input.note
          ? `Your identity was not verified. ${input.note}`
          : "Your identity was not verified. Review the note for details.",
    link: "/customer",
  });
}

export async function setCustomerStatus(actor: Actor | null, customerId: string, status: "active" | "inactive", reason?: string): Promise<void> {
  assertRole(actor, ["admin"]);
  const profile = await CustomerProfile.findOne({ userId: customerId }).lean();
  if (!profile) throw new AppError("NOT_FOUND", "Customer not found.");
  await CustomerProfile.updateOne({ userId: customerId }, { $set: { status, statusReason: reason ?? null } });
  await writeAuditLog(actor, {
    action: "CUSTOMER_STATUS",
    entityType: "customer",
    entityId: customerId,
    summary: `Customer status set to ${status}.`,
    before: { status: profile.status },
    after: { status },
  });
}

export async function blockCustomer(actor: Actor | null, customerId: string, input: { reason: string; freezeAccounts?: boolean }, headers: Headers): Promise<void> {
  assertRole(actor, ["admin"]);
  const user = await AuthUser.findOne({ _id: customerId }).lean();
  if (!user) throw new AppError("NOT_FOUND", "Customer not found.");
  await auth.api.banUser({ body: { userId: customerId, banReason: input.reason }, headers });
  const freeze = input.freezeAccounts !== false;
  if (freeze) {
    const accounts = await BankAccount.find({ kind: "customer", ownerId: customerId, status: { $ne: "closed" } }).select("_id").lean();
    for (const account of accounts) {
      await BankAccount.updateOne({ _id: account._id }, {
        $set: { status: "frozen", statusReason: input.reason, statusChangedBy: actor.id, statusChangedAt: new Date() },
      });
    }
  }
  await writeAuditLog(actor, {
    action: "CUSTOMER_BLOCKED",
    entityType: "customer",
    entityId: customerId,
    summary: `Customer blocked${freeze ? " (accounts frozen)" : ""}.`,
  });
}

export async function unblockCustomer(actor: Actor | null, customerId: string, headers: Headers): Promise<void> {
  assertRole(actor, ["admin"]);
  const user = await AuthUser.findOne({ _id: customerId }).lean();
  if (!user) throw new AppError("NOT_FOUND", "Customer not found.");
  await auth.api.unbanUser({ body: { userId: customerId }, headers });
  await writeAuditLog(actor, { action: "CUSTOMER_UNBLOCKED", entityType: "customer", entityId: customerId, summary: "Customer unblocked." });
}

export async function createCustomerByStaff(
  actor: Actor | null,
  input: { name: string; email: string; phone?: string; address?: string; dateOfBirth?: string; occupation?: string },
  tempPassword: string,
  headers: Headers,
): Promise<{ userId: string }> {
  assertRole(actor, ["staff", "admin"]);
  const email = input.email.trim().toLowerCase();
  const existing = await AuthUser.findOne({ email }).lean();
  if (existing) throw new AppError("CONFLICT", "An account with that email already exists.");
  const response = await auth.api.createUser({
    body: { name: input.name.trim(), email, password: tempPassword, role: "customer" },
    headers,
  });
  const userId = String((response as { user?: { id?: string } }).user?.id ?? "");
  if (!userId) throw new AppError("INTERNAL_ERROR", "Could not create the customer.");
  try {
    await CustomerProfile.updateOne(
      { userId },
      {
        $set: {
          phone: input.phone?.replace(/\D/g, "") || null,
          address: input.address?.trim() || null,
          dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
          occupation: input.occupation?.trim() || null,
          registeredBy: actor.id,
        },
      },
    );
  } catch (error) {
    // Compensate: the raw collection delete is the trusted internal path (the
    // read-only model intentionally throws on save/update operations).
    try {
      await AuthUser.collection.deleteOne({ email });
    } catch {
      // Best effort: the caller gets the original error.
    }
    throw error;
  }
  await writeAuditLog(actor, {
    action: "CUSTOMER_REGISTERED",
    entityType: "customer",
    entityId: userId,
    summary: `Customer ${input.name} registered by ${actor.role}.`,
    after: { email, phone: input.phone ?? null },
  });
  return { userId };
}

/** PATCH /api/me/profile [customer] — phone and address. */
export async function updateProfile(actor: Actor | null, input: { phone?: string; address?: string }): Promise<void> {
  assertRole(actor, ["customer"]);
  const $set: Record<string, string | null> = {};
  if (input.phone !== undefined) $set.phone = input.phone ? input.phone.replace(/\D/g, "") : null;
  if (input.address !== undefined) $set.address = input.address?.trim() || null;
  if (Object.keys($set).length > 0) await CustomerProfile.updateOne({ userId: actor.id }, { $set });
}
