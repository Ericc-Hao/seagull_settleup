import { isInvalidCredentialsError, isRecoverableAuthSessionError } from '../utils/authErrors';
import { getErrorMessage } from '../utils/errors';

function isExpectedAuthError(error: unknown): boolean {
  if (isRecoverableAuthSessionError(error) || isInvalidCredentialsError(error)) {
    return true;
  }
  if (typeof error === 'object' && error !== null && 'name' in error) {
    const name = String((error as { name?: string }).name ?? '');
    if (name === 'AuthApiError' && isRecoverableAuthSessionError(error)) {
      return true;
    }
    if (name === 'AuthApiError' && isInvalidCredentialsError(error)) {
      return true;
    }
  }
  return false;
}

function messageFromArgs(args: unknown[]): string {
  return args.map((arg) => getErrorMessage(arg)).join(' ');
}

let installed = false;

/**
 * Prevents Expo dev redbox for expected Supabase auth failures that are already
 * handled in AuthContext / login form UI. Unexpected errors still surface normally.
 */
export function installExpectedAuthErrorHandlers(): void {
  if (installed) {
    return;
  }
  installed = true;

  const originalConsoleError = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    const message = messageFromArgs(args);
    if (
      isRecoverableAuthSessionError({ message }) ||
      isInvalidCredentialsError({ message }) ||
      message.toLowerCase().includes('invalid login credentials')
    ) {
      console.warn(...args);
      return;
    }
    originalConsoleError(...args);
  };

  if (typeof __DEV__ !== 'undefined' && __DEV__ && typeof ErrorUtils !== 'undefined') {
    const defaultHandler = ErrorUtils.getGlobalHandler();
    ErrorUtils.setGlobalHandler((error: unknown, isFatal?: boolean) => {
      if (isExpectedAuthError(error)) {
        console.warn('[expectedAuthError]', getErrorMessage(error));
        return;
      }
      defaultHandler(error, isFatal);
    });
  }
}

declare const ErrorUtils: {
  getGlobalHandler: () => (error: unknown, isFatal?: boolean) => void;
  setGlobalHandler: (handler: (error: unknown, isFatal?: boolean) => void) => void;
};
