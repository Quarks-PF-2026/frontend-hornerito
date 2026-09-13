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
