import type { IAuthUser, ICustomerProfile } from "@/server/db/models";
import type { CustomerDto } from "@/features/customers/types";

export type { CustomerDto };

export function toCustomerDto(user: IAuthUser, profile: ICustomerProfile): CustomerDto {
  return {
    id: user._id,
    name: user.name ?? "",
    email: user.email ?? "",
    role: user.role ?? "customer",
    banned: Boolean(user.banned),
    banReason: user.banReason ?? null,
    kycStatus: profile.kycStatus,
    kycNote: profile.kycNote ?? null,
    kycReviewedBy: profile.kycReviewedBy ?? null,
    kycReviewedAt: profile.kycReviewedAt ? new Date(profile.kycReviewedAt).toISOString() : null,
    status: profile.status,
    statusReason: profile.statusReason ?? null,
    phone: profile.phone ?? null,
    address: profile.address ?? null,
    dateOfBirth: profile.dateOfBirth ? new Date(profile.dateOfBirth).toISOString() : null,
    occupation: profile.occupation ?? null,
    createdAt: profile.createdAt ? new Date(profile.createdAt).toISOString() : null,
  };
}
