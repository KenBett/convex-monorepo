export interface User {
  id: string;
  name?: string;
  email?: string;
  image?: string;
  emailVerificationTime?: number;
  isAnonymous?: boolean;
}

export interface ApiResponse<T> {
  data: T;
  error: string | null;
}
