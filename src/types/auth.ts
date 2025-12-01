export interface AuthError {
  code: string;
  message: string;
}

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  getIdToken: () => Promise<string>;
}
