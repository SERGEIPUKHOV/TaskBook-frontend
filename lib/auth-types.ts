export type AuthUser = {
  created_at: string;
  email: string;
  id: string;
  is_active: boolean;
  is_admin: boolean;
  role: "admin" | "user";
};

export type AuthResponse = {
  access_token: string;
  refresh_token: string;
  user: AuthUser;
};

export type ChangePasswordRequest = {
  current_password: string;
  new_password: string;
};

export type ResetPasswordRequest = {
  new_password: string;
  token: string;
};

export type DeleteAccountRequest = {
  password: string;
};

export type ForgotPasswordRequest = {
  email: string;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type RegisterRequest = {
  email: string;
  password: string;
};

export type ApiError = Error & {
  status?: number;
};
