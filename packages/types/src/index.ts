export interface User {
  id: string;
  name: string;
  email: string;
  image: string | null;
  emailVerified: boolean;
}

export interface Session {
  id: string;
  userId: string;
  expiresAt: Date;
  token: string;
}

export interface ApiResponse<T> {
  data: T;
  error: string | null;
}
