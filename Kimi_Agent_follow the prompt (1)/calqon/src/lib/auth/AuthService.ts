/**
 * Authentication Service Abstraction
 * This layer abstracts authentication logic so that providers (like Auth0 or Clerk) 
 * can be integrated or swapped easily without tightly coupling to the rest of the application.
 */

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  image?: string;
}

export class AuthService {
  /**
   * Retrieves the currently authenticated user.
   */
  static async getCurrentUser(): Promise<UserProfile | null> {
    // TODO: Integrate Clerk or Auth0 logic here.
    return null;
  }

  /**
   * Initiates the sign-in flow.
   */
  static async signIn(provider?: string): Promise<void> {
    // TODO: Initiate Auth0 or Clerk login.
  }

  /**
   * Initiates the sign-out flow.
   */
  static async signOut(): Promise<void> {
    // TODO: Initiate Auth0 or Clerk logout.
  }
}
