import type { AuthVariables } from "./auth/middleware";

export type AppBindings = Env;

export type AppContext = {
  Bindings: AppBindings;
  Variables: AuthVariables;
};
