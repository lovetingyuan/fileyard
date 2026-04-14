import { describe, expect, it } from "vitest";
import { ensureLocalNoProxy } from "../scripts/ensure-local-no-proxy";

describe("ensureLocalNoProxy", () => {
  it("adds local development hosts when no NO_PROXY value exists", () => {
    const env = {} as NodeJS.ProcessEnv;

    ensureLocalNoProxy(env);

    expect(env.NO_PROXY).toBe("localhost,127.0.0.1,::1");
    expect(env.no_proxy).toBe("localhost,127.0.0.1,::1");
  });

  it("preserves existing entries while appending missing local hosts", () => {
    const env = {
      NO_PROXY: "example.com,localhost",
    } as NodeJS.ProcessEnv;

    ensureLocalNoProxy(env);

    expect(env.NO_PROXY).toBe("example.com,localhost,127.0.0.1,::1");
    expect(env.no_proxy).toBe("example.com,localhost,127.0.0.1,::1");
  });

  it("merges uppercase and lowercase values without duplicates", () => {
    const env = {
      NO_PROXY: "example.com,127.0.0.1",
      no_proxy: "localhost,.internal",
    } as NodeJS.ProcessEnv;

    ensureLocalNoProxy(env);

    expect(env.NO_PROXY).toBe("example.com,127.0.0.1,localhost,.internal,::1");
    expect(env.no_proxy).toBe("example.com,127.0.0.1,localhost,.internal,::1");
  });
});
