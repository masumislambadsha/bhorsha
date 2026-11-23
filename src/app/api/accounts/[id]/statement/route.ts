import { z } from "zod";
import { withHandler } from "@/server/http/handler";
import { buildStatement, statementCsv } from "@/server/services/statement";
import { buildStatementPdf } from "@/server/pdf/statement";

const querySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  format: z.enum(["csv", "pdf"]).default("csv"),
});

export const GET = withHandler(
  { params: z.object({ id: z.string().min(1) }), query: querySchema },
  async ({ actor, params, query }) => {
    const data = await buildStatement(actor, params.id, query.from, query.to);
    if (query.format === "pdf") {
      const pdf = await buildStatementPdf(data);
      return new Response(pdf as unknown as BodyInit, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="statement-${data.account.number}-${query.from}-${query.to}.pdf"`,
        },
      });
    }
    return new Response(statementCsv(data), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="statement-${data.account.number}-${query.from}-${query.to}.csv"`,
      },
    });
  },
);
