// Google sign-in through Convex Auth v2. Signing in claims the board the visitor built as a guest.
import { v } from "convex/values";
import { setupConvexAuth } from "@convex-dev/auth/server";
import { setupGoogle, vGoogleProfile } from "@convex-dev/auth/methods/google/server";
import { components, internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";

const auth = setupConvexAuth({ component: components.auth, sessionMaxLifetimeSeconds: 90 * 24 * 60 * 60 });
export const { signOut, refreshSession, isAuthenticated } = auth;

/** Origins Google may send people back to, comma-separated, for example the Vercel domain and localhost. */
const redirectOrigins = (process.env.AUTH_REDIRECT_ORIGINS ?? "http://localhost:3000")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

export const { startSignInWithGoogle, completeSignInWithGoogle } = setupGoogle(auth, {
  component: components.authGoogle,
  allowedRedirectOrigins: redirectOrigins,
}).attachUserCallbacks({
  createUser: internal.auth.createUser,
  onSignIn: internal.auth.syncProfile,
});

const vMethod = v.object({ name: v.literal("google"), profile: vGoogleProfile });

export const createUser = internalMutation({
  args: { method: vMethod },
  returns: v.id("users"),
  handler: async (ctx) => ctx.db.insert("users", {}),
});

/** Keeps the name, email, and picture current with Google on every sign-in. */
export const syncProfile = internalMutation({
  args: { method: vMethod, userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, { method, userId }) => {
    const { name, email, picture } = method.profile;
    await ctx.db.patch(userId, { name, email, image: picture });
    return null;
  },
});
