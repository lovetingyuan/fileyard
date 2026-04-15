import type { AuthVariables } from "./auth/middleware";

export type AppBindings = Env & {
  FILE_YARD_KV: KVNamespace;
  APP_URL?: string;
  BETTER_AUTH_SECRET?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  MAX_UPLOAD_BYTES?: string;
  RESEND_API_KEY?: string;
  SHARE_LINK_SECRET?: string;
  SENDER_EMAIL?: string;
  AUTH_DB: D1Database;
};

export type AppContext = {
  Bindings: AppBindings;
  Variables: AuthVariables;
};
