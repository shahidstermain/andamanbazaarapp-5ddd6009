/**
 * DEPRECATED: Lovable Cloud Auth
 *
 * This module was replaced with native Supabase OAuth in src/pages/AuthView.tsx
 * during the migration from Lovable Cloud to self-hosted Supabase.
 *
 * The `@lovable.dev/cloud-auth-js` package has been removed from package.json.
 * Kept this file for git history; safe to delete.
 */

export const lovable = {
  auth: {
    signInWithOAuth: async () => {
      throw new Error("Lovable OAuth is deprecated. Use supabase.auth.signInWithOAuth() instead.");
    },
  },
};
