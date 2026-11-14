import { useAuth } from '@clerk/react';

/** Single source of truth for "may we load personal data right now". */
export function usePersonal() {
  const { isLoaded, isSignedIn, userId } = useAuth();
  return {
    isLoaded,
    signedIn: Boolean(isLoaded && isSignedIn),
    userId: userId ?? null,
  };
}

export const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
