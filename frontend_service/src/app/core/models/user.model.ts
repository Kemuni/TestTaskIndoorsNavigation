export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
}

export interface UserWithTokens {
  user: User;
  access: string;
  refresh: string;
}

export interface AuthUserResponse {
  success: boolean;
  data: UserWithTokens;
  error: null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  first_name: string;
  last_name: string;
  password: string;
}

export interface TokenRefreshRequest {
  refresh: string;
}

export interface TokenRefreshResponse {
  success: boolean;
  data: { access: string; refresh: string };
  error: null;
}
