import "server-only";

import { ObjectId } from "mongodb";
import type { Actor } from "@/server/auth/guards";
import { assertRole } from "@/server/auth/guards";
import {
  AuthUser,
  BankAccount,
  CustomerProfile,
  DepositWithdrawalRequest,
  Loan,
  TransactionModel,
} from "@/server/db/models";
import type { AdminStats, CustomerStats, MonthlySeries, StaffStats } from "@/features/stats/types";

const TIME_ZONE = "Asia/Dhaka";

/** Last `months` calendar months as "YYYY-MM" keys, oldest first. */
function monthKeys(months: number): string[] {
  const now = new Date();
  const keys: string[] = [];
  for (let i = months - 1; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    keys.push(d.toISOString().slice(0, 7));
  }
  return keys;
}

function zeroMonthly(keys: string[]): Map<string, MonthlySeries> {
  return new Map(
    keys.map((month) => [
      month,
      { month, deposit: 0, withdrawal: 0, transfer: 0, loanDisbursement: 0, loanRepayment: 0 },
    ]),
  );
}

function txTypeKey(type: string): keyof Omit<MonthlySeries, "month"> | null {
  switch (type) {
    case "deposit": return "deposit";
    case "withdrawal": return "withdrawal";
    case "transfer": return "transfer";
    case "loan_disbursement": return "loanDisbursement";
    case "loan_repayment": return "loanRepayment";
    default: return null;
  }
}

export async function getAdminStats(months = 12): Promise<AdminStats> {
  const keys = monthKeys(months);
  const since = new Date(`${keys[0]}-01T00:00:00.000Z`);

  const [
    totalCustomers,
    totalAccounts,
    balanceRows,
    typeTotals,
    totalTransactions,
    pendingLoans,
    monthlyRows,
    accountRows,
    loanRows,
    openFlags,
    heldTransfers,
    pendingRequests,
    loansUnderReview,
  ] = await Promise.all([
    AuthUser.countDocuments({ role: "customer" }),
    BankAccount.countDocuments({ kind: "customer" }),
    BankAccount.aggregate<{ _id: null; total: number }>([
      { $match: { kind: "customer" } },
      { $group: { _id: null, total: { $sum: "$balanceMinor" } } },
    ]),
    TransactionModel.aggregate<{ _id: string; total: number }>([
      { $match: { status: "completed" } },
      { $group: { _id: "$type", total: { $sum: "$amountMinor" } } },
    ]),
    TransactionModel.countDocuments({ status: "completed" }),
    Loan.countDocuments({ status: { $in: ["pending", "under_review"] } }),
    TransactionModel.aggregate<{ month: string; type: string; amountMinor: number; count: number }>([
      { $match: { status: "completed", createdAt: { $gte: since } } },
      {
        $group: {
          _id: { month: { $dateToString: { format: "%Y-%m", date: "$createdAt", timezone: TIME_ZONE } }, type: "$type" },
          amountMinor: { $sum: "$amountMinor" },
          count: { $sum: 1 },
        },
      },
      { $project: { _id: 0, month: "$_id.month", type: "$_id.type", amountMinor: 1, count: 1 } },
    ]),
    BankAccount.aggregate<{ _id: string; count: number; balanceMinor: number }>([
      { $match: { kind: "customer" } },
      { $group: { _id: "$type", count: { $sum: 1 }, balanceMinor: { $sum: "$balanceMinor" } } },
    ]),
    Loan.aggregate<{ _id: string; count: number }>([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    TransactionModel.countDocuments({ flagStatus: "open" }),
    TransactionModel.countDocuments({ status: "pending", "review.required": true }),
    DepositWithdrawalRequest.countDocuments({ status: "pending" }),
    Loan.countDocuments({ status: "under_review" }),
  ]);

  const monthly = zeroMonthly(keys);
  const activity = zeroMonthly(keys);
  const volume = new Map<string, number>();
  for (const row of monthlyRows) {
    const bucket = monthly.get(row.month);
    const activityBucket = activity.get(row.month);
    const key = txTypeKey(row.type);
    if (bucket && key) bucket[key] = (bucket[key] as number) + row.amountMinor;
    if (activityBucket && key) activityBucket[key] = (activityBucket[key] as number) + row.count;
    volume.set(row.month, (volume.get(row.month) ?? 0) + row.amountMinor);
  }

  const typeTotal = (type: string) => typeTotals.find((row) => row._id === type)?.total ?? 0;
  const loanCount = (status: string) => loanRows.find((row) => row._id === status)?.count ?? 0;
  const statusLabels: Record<string, string> = {
    approved: "Approved", rejected: "Rejected", pending: "Pending", under_review: "Under review",
  };

  return {
    totalCustomers,
    totalAccounts,
    totalBankBalance: balanceRows[0]?.total ?? 0,
    totalDeposits: typeTotal("deposit"),
    totalWithdrawals: typeTotal("withdrawal"),
    totalTransactions,
    pendingLoanApplications: pendingLoans,
    monthlyTransactionVolume: keys.map((month) => ({ month, amountMinor: volume.get(month) ?? 0 })),
    depositVsWithdrawal: keys.map((month) => ({
      month,
      deposit: monthly.get(month)?.deposit ?? 0,
      withdrawal: monthly.get(month)?.withdrawal ?? 0,
    })),
    accountDistribution: accountRows.map((row) => ({
      label: row._id, count: row.count, amountMinor: row.balanceMinor,
    })),
    loanApprovalStats: ["approved", "rejected", "pending", "under_review"].map((status) => ({
      label: statusLabels[status] ?? status, count: loanCount(status),
    })),
    monthlyBankingActivity: keys.map((month) => activity.get(month)!),
    needsAttention: {
      openFlags,
      heldTransfers,
      largeRequests: pendingRequests,
      loansUnderReview,
    },
  };
}

export async function getStaffStats(): Promise<StaffStats> {
  const [kycPending, pendingRequests, heldTransfers, openFlags, loansAwaitingReview] = await Promise.all([
    CustomerProfile.countDocuments({ kycStatus: "pending" }),
    DepositWithdrawalRequest.countDocuments({ status: "pending" }),
    TransactionModel.countDocuments({ status: "pending", "review.required": true }),
    TransactionModel.countDocuments({ flagStatus: "open" }),
    Loan.countDocuments({ status: { $in: ["pending", "under_review"] } }),
  ]);
  return { kycPending, pendingRequests, heldTransfers, openFlags, loansAwaitingReview };
}

export async function getCustomerStats(
  account: Actor | null,
  accountId?: string,
  months = 12,
): Promise<CustomerStats> {
  assertRole(account, ["customer"]);
  const keys = monthKeys(months);
  const since = new Date(`${keys[0]}-01T00:00:00.000Z`);
  const ownerId = account!.id;
  const accountObjectId = accountId ? new ObjectId(accountId) : null;
  if (accountId) {
    const owns = await BankAccount.exists({ _id: accountObjectId, kind: "customer", ownerId });
    if (!owns) return emptyCustomerStats(months);
  }

  const accountFilter: Record<string, unknown> = { kind: "customer", ownerId };
  if (accountObjectId) accountFilter._id = accountObjectId;
  const txFilter = accountObjectId
    ? { $or: [{ fromAccountId: accountObjectId }, { toAccountId: accountObjectId }] }
    : { $or: [{ fromOwnerId: ownerId }, { toOwnerId: ownerId }] };

  const [accounts, deposits, withdrawals, activeLoans, monthlyRows, distributionRows, recent] = await Promise.all([
    BankAccount.find(accountFilter).select("balanceMinor").lean(),
    TransactionModel.aggregate<{ total: number }>([
      { $match: { status: "completed", type: "deposit", createdAt: { $gte: since }, ...txFilter } },
      { $group: { _id: null, total: { $sum: "$amountMinor" } } },
    ]),
    TransactionModel.aggregate<{ total: number }>([
      { $match: { status: "completed", type: "withdrawal", createdAt: { $gte: since }, ...txFilter } },
      { $group: { _id: null, total: { $sum: "$amountMinor" } } },
    ]),
    Loan.aggregate<{ count: number; outstandingMinor: number }>([
      { $match: { applicantId: ownerId, status: "active" } },
      { $group: { _id: null, count: { $sum: 1 }, outstandingMinor: { $sum: "$outstandingMinor" } } },
    ]),
    TransactionModel.aggregate<{ month: string; type: string; amountMinor: number }>([
      { $match: { status: "completed", createdAt: { $gte: since }, ...txFilter } },
      {
        $group: {
          _id: { month: { $dateToString: { format: "%Y-%m", date: "$createdAt", timezone: TIME_ZONE } }, type: "$type" },
          amountMinor: { $sum: "$amountMinor" },
        },
      },
      { $project: { _id: 0, month: "$_id.month", type: "$_id.type", amountMinor: 1 } },
    ]),
    TransactionModel.aggregate<{ _id: string; count: number }>([
      { $match: { status: "completed", createdAt: { $gte: since }, ...txFilter } },
      { $group: { _id: "$type", count: { $sum: 1 } } },
    ]),
    TransactionModel.find({ status: "completed", ...txFilter }).sort({ createdAt: -1 }).limit(8).lean(),
  ]);

  const spending = new Map<string, number>();
  const depositPoints = new Map<string, number>();
  for (const row of monthlyRows) {
    if (row.type === "deposit") depositPoints.set(row.month, (depositPoints.get(row.month) ?? 0) + row.amountMinor);
    if (["withdrawal", "transfer", "loan_repayment"].includes(row.type)) {
      spending.set(row.month, (spending.get(row.month) ?? 0) + row.amountMinor);
    }
  }

  return {
    totalBalance: accounts.reduce((sum, acc) => sum + acc.balanceMinor, 0),
    totalDeposits: deposits[0]?.total ?? 0,
    totalWithdrawals: withdrawals[0]?.total ?? 0,
    activeLoans: {
      count: activeLoans[0]?.count ?? 0,
      outstandingMinor: activeLoans[0]?.outstandingMinor ?? 0,
    },
    recentTransactions: recent.map((tx) => ({
      id: String(tx._id),
      reference: tx.reference,
      type: tx.type,
      status: tx.status,
      amountMinor: tx.amountMinor,
      description: tx.description ?? null,
      createdAt: new Date(tx.createdAt).toISOString(),
    })),
    monthlySpending: keys.map((month) => ({ month, amountMinor: spending.get(month) ?? 0 })),
    monthlyDeposits: keys.map((month) => ({ month, amountMinor: depositPoints.get(month) ?? 0 })),
    transactionDistribution: distributionRows.map((row) => ({ label: row._id, count: row.count })),
  };
}

function emptyCustomerStats(months: number): CustomerStats {
  return {
    totalBalance: 0,
    totalDeposits: 0,
    totalWithdrawals: 0,
    activeLoans: { count: 0, outstandingMinor: 0 },
    recentTransactions: [],
    monthlySpending: monthKeys(months).map((month) => ({ month, amountMinor: 0 })),
    monthlyDeposits: monthKeys(months).map((month) => ({ month, amountMinor: 0 })),
    transactionDistribution: [],
  };
}
