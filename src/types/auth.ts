export interface User {
  id: string;
  email?: string;
  isAnonymous: boolean;
  createdAt: Date;
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}