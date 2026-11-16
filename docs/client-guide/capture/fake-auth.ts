// Test stand-in for admin/src/lib/auth.ts: always signed in. Used only by
// the local test harness; never part of the admin build.
export type SignInStep =
  | { kind: 'done' }
  | { kind: 'newPassword' }
  | { kind: 'totpSetup'; setupUri: string; secret: string }
  | { kind: 'totp' }
  | { kind: 'resetPassword' };

export const idleLimitMs = 2 * 60 * 60 * 1000;

const signedIn = () => sessionStorage.getItem('harness-signed-out') !== '1';

export const auth = {
  async start(): Promise<SignInStep> {
    sessionStorage.removeItem('harness-signed-out');
    return { kind: 'done' };
  },
  async answer(): Promise<SignInStep> {
    return { kind: 'done' };
  },
  async requestPasswordReset() {},
  async confirmPasswordReset() {},
  async requestAccess() {},
  async confirmEmail() {},
  async resendEmailCode() {},
  async refresh() {},
  async idToken(): Promise<string | null> {
    return signedIn() ? 'harness-token' : null;
  },
  async signOut() {
    sessionStorage.setItem('harness-signed-out', '1');
  },
};

export function authErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
