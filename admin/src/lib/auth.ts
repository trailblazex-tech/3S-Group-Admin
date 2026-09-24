/**
 * Cognito sign-in (SRP - the password never leaves the browser) with
 * mandatory authenticator-app MFA. Amplify keeps the session and refreshes
 * tokens; the API receives the ID token, which carries the user's groups.
 */
import { Amplify } from 'aws-amplify';
import {
  confirmResetPassword,
  confirmSignIn,
  fetchAuthSession,
  resetPassword,
  signIn,
  signOut,
  type SignInOutput,
} from 'aws-amplify/auth';
import { config } from './config';

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: config.userPoolId,
      userPoolClientId: config.userPoolClientId,
      loginWith: { email: true },
    },
  },
});

export type SignInStep =
  | { kind: 'done' }
  | { kind: 'newPassword' }
  | { kind: 'totpSetup'; setupUri: string; secret: string }
  | { kind: 'totp' }
  | { kind: 'resetPassword' };

async function toStep(output: SignInOutput, email: string): Promise<SignInStep> {
  if (output.isSignedIn) return { kind: 'done' };
  const next = output.nextStep;

  switch (next.signInStep) {
    case 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED':
      return { kind: 'newPassword' };
    case 'CONTINUE_SIGN_IN_WITH_TOTP_SETUP':
      return {
        kind: 'totpSetup',
        setupUri: next.totpSetupDetails.getSetupUri('3S Admin', email).toString(),
        secret: next.totpSetupDetails.sharedSecret,
      };
    case 'CONFIRM_SIGN_IN_WITH_TOTP_CODE':
      return { kind: 'totp' };
    // Only authenticator apps are enabled, so any MFA choice is TOTP.
    case 'CONTINUE_SIGN_IN_WITH_MFA_SELECTION':
    case 'CONTINUE_SIGN_IN_WITH_MFA_SETUP_SELECTION':
      return toStep(await confirmSignIn({ challengeResponse: 'TOTP' }), email);
    case 'RESET_PASSWORD':
      return { kind: 'resetPassword' };
    default:
      throw new Error('This account needs a sign-in step the admin does not support. Contact your administrator.');
  }
}

export const auth = {
  async start(email: string, password: string) {
    try {
      return await toStep(await signIn({ username: email, password }), email);
    } catch (error) {
      if (error instanceof Error && error.name === 'UserAlreadyAuthenticatedException') return { kind: 'done' } as const;
      throw error;
    }
  },

  async answer(response: string, email: string) {
    return toStep(await confirmSignIn({ challengeResponse: response }), email);
  },

  requestPasswordReset(email: string) {
    return resetPassword({ username: email });
  },

  confirmPasswordReset(email: string, code: string, newPassword: string) {
    return confirmResetPassword({ username: email, confirmationCode: code, newPassword });
  },

  async idToken(): Promise<string | null> {
    try {
      const session = await fetchAuthSession();
      return session.tokens?.idToken?.toString() ?? null;
    } catch {
      return null;
    }
  },

  async signOut() {
    await signOut().catch(() => undefined);
  },
};

const friendlyErrors: Record<string, string> = {
  NotAuthorizedException: 'That email or password is not right.',
  UserNotFoundException: 'That email or password is not right.',
  CodeMismatchException: 'That code is not right. Check the app and try the newest code.',
  EnableSoftwareTokenMFAException: 'That code is not right. Check the app and try the newest code.',
  ExpiredCodeException: 'That code has expired. Start again to get a new one.',
  LimitExceededException: 'Too many attempts. Wait a few minutes and try again.',
  TooManyRequestsException: 'Too many attempts. Wait a few minutes and try again.',
  PasswordResetRequiredException: 'You need to set a new password. Use "Forgot password?" below.',
  NetworkError: 'Could not reach the sign-in service. Check your connection.',
};

export function authErrorMessage(error: unknown) {
  if (error instanceof Error) {
    if (error.name === 'NotAuthorizedException' && /session is expired/i.test(error.message)) {
      return 'That took too long. Start signing in again.';
    }
    if (error.name === 'InvalidPasswordException') {
      return 'Choose a stronger password: at least 12 characters with upper and lower case letters, a number and a symbol.';
    }
    return friendlyErrors[error.name] ?? error.message;
  }
  return 'Something went wrong. Please try again.';
}
