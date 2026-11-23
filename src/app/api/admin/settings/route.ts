import { z } from "zod";
import { withHandler } from "@/server/http/handler";
import { getSettings } from "@/server/services/settings";
import { updateSettings } from "@/server/services/admin";

const limitsSchema = z.record(z.string(), z.object({
  perTransactionMinor: z.number().int().min(0),
  dailyTransferMinor: z.number().int().min(0),
  minimumBalanceMinor: z.number().int().min(0),
}));

const updateSchema = z.object({
  transferFeeMinor: z.number().int().min(0).optional(),
  reviewThresholdMinor: z.number().int().min(0).optional(),
  staffApprovalLimitMinor: z.number().int().min(0).optional(),
  limits: limitsSchema.optional(),
  loanProducts: z.record(z.string(), z.unknown()).optional(),
  risk: z.record(z.string(), z.unknown()).optional(),
});

export const GET = withHandler({ roles: ["staff", "admin"] }, async () => {
  return Response.json(await getSettings());
});

export const PUT = withHandler({ roles: ["admin"], body: updateSchema }, async ({ actor, body }) => {
  await updateSettings(actor, body as Parameters<typeof updateSettings>[1]);
  return Response.json(await getSettings());
});
