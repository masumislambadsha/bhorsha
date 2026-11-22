export interface MeDto {
  user: { id: string; name: string; email: string; role: string };
  profile: {
    kycStatus: string;
    status: string;
    phone: string | null;
    address: string | null;
    pinSet: boolean;
  } | null;
}
