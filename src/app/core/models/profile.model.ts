import { MonetaryDonationStatus } from './monetary-donation.model';

/** Perfil de la persona (no de la organización): nombre, teléfono y el email de sesión. */
export interface Profile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
}

export interface UpdateProfileRequest {
  name: string;
  phone?: string | null;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

/** Una donación económica de la persona logueada (`GET /profile/donations`). */
export interface MyDonation {
  id: string;
  organizationId: string;
  organizationName: string;
  amount: number;
  status: MonetaryDonationStatus;
  isAnonymous: boolean;
  createdAt: string;
}

export interface MyDonationView extends MyDonation {
  amountLabel: string;
  date: string;
  statusLabel: string;
  statusBg: string;
  statusInk: string;
}
