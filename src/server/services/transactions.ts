import "server-only";

import type { Actor } from "@/server/auth/guards";
import { assertRole } from "@/server/auth/guards";
import { BankAccount, TransactionModel } from "@/server/db/models";
import { AppError } from "@/server/http/errors";
import { paginate, type Page } from "@/server/http/pagination";
import { toTransactionDto, type TransactionDto } from "@/server/dto/transactions";

export interface ListTransactionsInput {
  accountId?: string;
  customerId?: string;
  type?: string;
  status?: string;
  flagStatus?: string;
  from?: string;
  to?: string;
  q?: string;
  page: number;
  pageSize: number;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function customerOwnedAccountIds(customerId: string) {
  return BankAccount.find({ kind: "customer", ownerId: customerId }).select("_id").lean().then((docs) => docs.map((d) => d._id));
}

async function buildWhere(input: ListTransactionsInput): Promise<Record<string, unknown>> {
  const where: Record<string, unknown> = {};
  if (input.customerId) where.ownerId = input.customerId;
  if (input.type) where.type = input.type;
  if (input.status) where.status = input.status;
  if (input.flagStatus) where.flagStatus = input.flagStatus;
  const created: Record<string, unknown> = {};
  if (input.from) created.$gte = new Date(input.from);
  if (input.to) created.$lte = new Date(input.to);
  if (Object.keys(created).length > 0) where.createdAt = created;
  if (input.q) {
    where.$or = [
      { reference: input.q },
      { fromAccountNumber: new RegExp(escapeRegExp(input.q), "i") },
      { toAccountNumber: new RegExp(escapeRegExp(input.q), "i") },
    ];
  }
  if (input.accountId) {
    where.$or = [...((where.$or as unknown[]) ?? []), { fromAccountId: input.accountId }, { toAccountId: input.accountId }];
  }
  return where;
}

export async function listTransactions(actor: Actor | null, input: ListTransactionsInput): Promise<Page<TransactionDto>> {
  assertRole(actor, ["staff", "admin"]);
  const where = await buildWhere(input);
  const total = await TransactionModel.countDocuments(where);
  const docs = await TransactionModel.find(where).sort({ createdAt: -1 }).skip((input.page - 1) * input.pageSize).limit(input.pageSize).lean();
  return paginate(docs.map(toTransactionDto), total, input.page, input.pageSize);
}

/** Customers only ever see transactions that touch their own accounts. */
export async function listCustomerTransactions(actor: Actor, input: ListTransactionsInput): Promise<Page<TransactionDto>> {
  const accountIds = await customerOwnedAccountIds(actor.id);
  const where: Record<string, unknown> = {
    $or: [{ fromAccountId: { $in: accountIds } }, { toAccountId: { $in: accountIds } }],
  };
  if (input.type) where.type = input.type;
  if (input.status) where.status = input.status;
  if (input.flagStatus) where.flagStatus = input.flagStatus;
  const created: Record<string, unknown> = {};
  if (input.from) created.$gte = new Date(input.from);
  if (input.to) created.$lte = new Date(input.to);
  if (Object.keys(created).length > 0) where.createdAt = created;
  if (input.q) {
    where.$or = [
      { reference: input.q },
      { fromAccountNumber: new RegExp(escapeRegExp(input.q), "i") },
      { toAccountNumber: new RegExp(escapeRegExp(input.q), "i") },
    ];
  }
  const total = await TransactionModel.countDocuments(where);
  const docs = await TransactionModel.find(where).sort({ createdAt: -1 }).skip((input.page - 1) * input.pageSize).limit(input.pageSize).lean();
  return paginate(docs.map(toTransactionDto), total, input.page, input.pageSize);
}

/** Look up a transaction by id or reference. Customers only see their own. */
export async function getTransaction(actor: Actor | null, idOrReference: string): Promise<TransactionDto> {
  const doc = await getTransactionDocument(actor, idOrReference);
  return toTransactionDto(doc);
}

export async function getTransactionDocument(actor: Actor | null, idOrReference: string) {
  const isId = /^[0-9a-f]{24}$/i.test(idOrReference);
  const doc = await TransactionModel.findOne(isId ? { _id: idOrReference } : { reference: idOrReference }).lean();
  if (!doc) throw new AppError("NOT_FOUND", "Transaction not found.");
  if (actor?.role === "customer") {
    const accountIds = await customerOwnedAccountIds(actor.id);
    const touches = accountIds.some((id) => String(id) === String(doc.fromAccountId) || String(id) === String(doc.toAccountId));
    if (!touches) throw new AppError("NOT_FOUND", "Transaction not found.");
  }
  return doc;
}
