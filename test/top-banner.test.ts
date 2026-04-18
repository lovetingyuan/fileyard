import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUseTopBanner = vi.fn();

vi.mock("../src/react-app/hooks/useTopBanner", () => ({
  useTopBanner: () => mockUseTopBanner(),
}));

vi.mock("@iconify/react", () => ({
  Icon: ({ icon, className }: { icon: string; className?: string }) =>
    createElement("span", { "data-icon": icon, className }),
}));

vi.mock("react-hot-toast", () => ({
  Toaster: () => createElement("div", { "data-testid": "toaster" }),
}));

vi.mock("../src/react-app/context/AuthContext", () => ({
  AuthProvider: ({ children }: { children: ReactNode }) =>
    createElement("div", { "data-testid": "auth-provider" }, children),
}));

vi.mock("../src/react-app/routes", () => ({
  buildAppRouteElements: () => createElement("div", { "data-testid": "routes" }, "routes"),
  renderProtectedRoute: (_user: unknown, element: ReactNode) => element,
}));

vi.mock("../src/react-app/hooks/useAuth", () => ({
  useAuth: () => ({ authLoading: false, user: null }),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    BrowserRouter: ({ children }: { children: ReactNode }) =>
      createElement("div", { "data-testid": "browser-router" }, children),
    Routes: ({ children }: { children: ReactNode }) =>
      createElement("div", { "data-testid": "routes-shell" }, children),
    useLocation: () => ({ pathname: "/login" }),
    useNavigate: () => vi.fn(),
  };
});

describe("TopBanner", () => {
  beforeEach(() => {
    mockUseTopBanner.mockReset();
  });

  it("renders trusted HTML from the top banner hook", async () => {
    const { TopBanner } = await import("../src/react-app/components/TopBanner");
    mockUseTopBanner.mockReturnValue({
      banner: {
        date: "20260418",
        contentHtml: '维护通知 <a href="/status">查看状态</a>',
      },
      error: null,
      isLoading: false,
    });

    const markup = renderToStaticMarkup(createElement(TopBanner));

    expect(markup).toContain("维护通知");
    expect(markup).toContain('<a href="/status">查看状态</a>');
    expect(markup).toContain('role="status"');
  });

  it("lays out banner content on the left and exposes a close button", async () => {
    const { TopBannerView } = await import("../src/react-app/components/TopBanner");

    const markup = renderToStaticMarkup(
      createElement(TopBannerView, {
        date: "20260418",
        messageHtml: "<strong>Left aligned notice</strong>",
        onDismiss: () => undefined,
      }),
    );

    expect(markup).toContain("justify-between");
    expect(markup).toContain("text-left");
    expect(markup).toContain('aria-label="关闭顶部横幅"');
    expect(markup).toContain('data-icon="mdi:close"');
    expect(markup).toContain("<strong>Left aligned notice</strong>");
  });

  it("hides the banner after dismissing the current message", async () => {
    const { shouldShowTopBanner } = await import("../src/react-app/components/TopBanner");

    expect(shouldShowTopBanner({ date: "20260418", contentHtml: "Notice" }, null)).toBe(true);
    expect(
      shouldShowTopBanner(
        { date: "20260418", contentHtml: "Notice" },
        "20260418",
      ),
    ).toBe(false);
    expect(
      shouldShowTopBanner(
        { date: "20260419", contentHtml: "Updated notice" },
        "20260418",
      ),
    ).toBe(
      true,
    );
  });

  it("persists the dismissed banner date in local storage", async () => {
    const { readDismissedTopBannerDate, writeDismissedTopBannerDate } = await import(
      "../src/react-app/components/TopBanner"
    );
    const store = new Map<string, string>();
    const storage = {
      getItem: vi.fn((key: string) => store.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => {
        store.set(key, value);
      }),
    } as unknown as Storage;

    expect(readDismissedTopBannerDate(storage)).toBe(null);

    writeDismissedTopBannerDate(storage, "20260418");

    expect(storage.setItem).toHaveBeenCalledWith("fileyard:top-banner:dismissed-date", "20260418");
    expect(readDismissedTopBannerDate(storage)).toBe("20260418");
  });

  it("renders nothing for loading, error, missing, or blank states", async () => {
    const { TopBanner } = await import("../src/react-app/components/TopBanner");

    for (const state of [
      { banner: null, error: null, isLoading: false },
      { banner: { date: "20260418", contentHtml: "   " }, error: null, isLoading: false },
      {
        banner: { date: "20260418", contentHtml: "<strong>soon</strong>" },
        error: new Error("failed"),
        isLoading: false,
      },
      {
        banner: { date: "20260418", contentHtml: "<strong>soon</strong>" },
        error: null,
        isLoading: true,
      },
    ]) {
      mockUseTopBanner.mockReturnValue(state);

      expect(renderToStaticMarkup(createElement(TopBanner))).toBe("");
    }
  });

  it("mounts the banner inside the global app shell before routes", async () => {
    const { AppShell } = await import("../src/react-app/App");
    mockUseTopBanner.mockReturnValue({
      banner: {
        date: "20260418",
        contentHtml: "<strong>Global notice</strong>",
      },
      error: null,
      isLoading: false,
    });

    const markup = renderToStaticMarkup(createElement(AppShell));

    expect(markup).toContain("<strong>Global notice</strong>");
    expect(markup.indexOf("<strong>Global notice</strong>")).toBeLessThan(
      markup.indexOf('data-testid="routes-shell"'),
    );
  });
});
