import { toUserFriendlyAuthError } from '../../utils/authErrors';

export function authRoute(path: '/login' | '/register', inviteToken?: string) {
  return inviteToken ? { pathname: path, params: { invite: inviteToken } } : path;
}

export function screenAuthError(error: unknown): string {
  const friendly = toUserFriendlyAuthError(error);
  if (friendly !== 'Something went wrong. Please try again.') {
    return friendly;
  }
  return error instanceof Error ? error.message : friendly;
}
