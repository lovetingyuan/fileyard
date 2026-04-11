import { beforeEach, describe, expect, it, vi } from "vitest";
import { useResetPasswordMutation } from "../src/react-app/hooks/useAuthApi";

const mockMutate = vi.fn();
const mockTrigger = vi.fn();

vi.mock("swr", () => ({
  default: vi.fn(),
  useSWRConfig: () => ({
    mutate: mockMutate,
  }),
}));

vi.mock("swr/mutation", () => ({
  default: () => ({
    trigger: mockTrigger,
    isMutating: false,
  }),
}));

describe("auth api mutations", () => {
  beforeEach(() => {
    mockMutate.mockReset();
    mockTrigger.mockReset();
  });

  it("clears cached auth state after password reset succeeds", async () => {
    const response = {
      success: true as const,
      message: "Password reset successful. Please log in with your new password.",
    };
    mockTrigger.mockResolvedValue(response);

    const { resetPassword } = useResetPasswordMutation();

    await expect(resetPassword("reset-code", "Password123B")).resolves.toEqual(response);
    expect(mockTrigger).toHaveBeenCalledWith({
      code: "reset-code",
      password: "Password123B",
    });
    expect(mockMutate).toHaveBeenCalledWith("/api/auth/me", null, { revalidate: false });
  });
});
