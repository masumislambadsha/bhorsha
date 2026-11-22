import { beforeAll, describe, expect, it } from "vitest";
import { AuthUser, CustomerProfile } from "@/server/db/models";
import { connectDB } from "@/server/db/mongoose";
import { listCustomers, reviewKYC, setCustomerStatus } from "@/server/services/customers";

const staffActor = { id: "staff-1", role: "admin" as const };

describe("customer services", () => {
  beforeAll(async () => {
    await connectDB();
    await AuthUser.insertMany([
      { _id: "cust-1", name: "Rahim Uddin", email: "rahim@test.example", role: "customer" },
      { _id: "cust-2", name: "Nusrat Jahan", email: "nusrat@test.example", role: "customer" },
      { _id: "cust-3", name: "Karim Chowdhury", email: "karim@test.example", role: "customer" },
    ]);
    await CustomerProfile.insertMany([
      { userId: "cust-1", kycStatus: "verified", status: "active" },
      { userId: "cust-2", kycStatus: "pending", status: "active" },
      { userId: "cust-3", kycStatus: "verified", status: "inactive" },
    ]);
  });

  it("lists customers, searching by email/name and filtering by kyc/status", async () => {
    const all = await listCustomers(staffActor, { page: 1, pageSize: 10 });
    expect(all.total).toBe(3);
    expect(all.items.map((c) => c.id).sort()).toEqual(["cust-1", "cust-2", "cust-3"]);

    const byEmail = await listCustomers(staffActor, { q: "nusrat", page: 1, pageSize: 10 });
    expect(byEmail.total).toBe(1);
    expect(byEmail.items[0].name).toBe("Nusrat Jahan");

    const verified = await listCustomers(staffActor, { kyc: "verified", page: 1, pageSize: 10 });
    expect(verified.total).toBe(2);

    const inactive = await listCustomers(staffActor, { status: "inactive", page: 1, pageSize: 10 });
    expect(inactive.total).toBe(1);
    expect(inactive.items[0].id).toBe("cust-3");
  });

  it("reviews KYC and sets customer status", async () => {
    await reviewKYC(staffActor, "cust-2", { decision: "verified", note: "ID verified" });
    let profile = await CustomerProfile.findOne({ userId: "cust-2" });
    expect(profile?.kycStatus).toBe("verified");
    expect(profile?.kycNote).toBe("ID verified");

    await reviewKYC(staffActor, "cust-2", { decision: "rejected", note: "bad id" });
    profile = await CustomerProfile.findOne({ userId: "cust-2" });
    expect(profile?.kycStatus).toBe("rejected");

    await setCustomerStatus(staffActor, "cust-1", "inactive", "Due diligence");
    const p1 = await CustomerProfile.findOne({ userId: "cust-1" });
    expect(p1?.status).toBe("inactive");
  });
});
