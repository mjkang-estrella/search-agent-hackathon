import { defineApp } from "convex/server";
import { v } from "convex/values";
import agent from "@convex-dev/agent/convex.config";
import auth from "@convex-dev/auth/convex.config";
import authGoogle from "@convex-dev/auth/components/google/convex.config";

const app = defineApp({
  // The Google OAuth client. Its redirect URI is <CONVEX_SITE_URL>/oauth/google/callback.
  env: { AUTH_GOOGLE_CLIENT_ID: v.string(), AUTH_GOOGLE_CLIENT_SECRET: v.string() },
});
app.use(agent);
app.use(auth);
app.use(authGoogle, {
  httpPrefix: "/oauth/google",
  env: {
    CLIENT_ID: app.env.AUTH_GOOGLE_CLIENT_ID,
    CLIENT_SECRET: app.env.AUTH_GOOGLE_CLIENT_SECRET,
  },
});

export default app;
