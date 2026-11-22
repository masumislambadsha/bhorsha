import type { ICustomerProfile } from "@/server/db/models";

/** Never expose PIN hashes or internal profile fields through the API. */
export function toMeDto(
  user: { id: string; name: string; email: string; role: string },
  profile: ICustomerProfile | null,
) {
  return {
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    profile: profile
      ? {
          kycStatus: profile.kycStatus,
          status: profile.status,
          phone: profile.phone ?? null,
          address: profile.address ?? null,
          pinSet: Boolean(profile.pin?.hash),
        }
      : null,
  };
}
