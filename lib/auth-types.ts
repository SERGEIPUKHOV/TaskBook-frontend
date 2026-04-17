export type ApiAuthUser = {
  created_at: string;
  email: string;
  id: string;
  is_active: boolean;
  is_admin: boolean;
  role: "admin" | "user";
  tasktracker_enabled?: boolean;
};

export type AuthResponse = {
  access_token: string;
  refresh_token: string;
  user: ApiAuthUser;
};

export type AuthUser = Omit<ApiAuthUser, "tasktracker_enabled"> & {
  tasktrackerEnabled: boolean;
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
