export const STORAGE_PENDING_PASSWORD_SETUP = 'kaboo_pending_password_setup';

export const markPendingPasswordSetup = (): void => {
  try {
    localStorage.setItem(STORAGE_PENDING_PASSWORD_SETUP, '1');
  } catch {
    // noop
  }
};

export const clearPendingPasswordSetup = (): void => {
  try {
    localStorage.removeItem(STORAGE_PENDING_PASSWORD_SETUP);
  } catch {
    // noop
  }
};

export const hasPendingPasswordSetup = (): boolean => {
  try {
    return localStorage.getItem(STORAGE_PENDING_PASSWORD_SETUP) === '1';
  } catch {
    return false;
  }
};

export const isInvitedAuthUser = (user?: { invited_at?: string | null } | null): boolean => {
  return Boolean(user?.invited_at);
};