import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AccountSection } from "@/app/dashboard/components/AccountSection";

// Mock IdentityBadge component
vi.mock("@/components/ui/IdentityBadge", () => ({
  default: () => <div data-testid="identity-badge">Identity Badge</div>,
}));

// Mock env
vi.mock("@/lib/env", () => ({
  env: {
    siteUrl: "https://test.com",
  },
}));

describe("AccountSection", () => {
  const defaultProps = {
    isAuthenticated: false,
    supabase: null,
    supabaseUnavailable: false,
    displayName: "Test User",
    isLoadingProfile: false,
    isLoadingRefresh: false,
    status: "",
    onNameChange: vi.fn(),
    onClearLocalData: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Unauthenticated state", () => {
    it("should render email form when not authenticated", () => {
      render(<AccountSection {...defaultProps} />);
      expect(screen.getByText("Account")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("name@example.com")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /send sign-in link/i })).toBeInTheDocument();
    });

    it("should not show sign out button when not authenticated", () => {
      render(<AccountSection {...defaultProps} />);
      expect(screen.queryByRole("button", { name: /sign out/i })).not.toBeInTheDocument();
    });
  });

  describe("Authenticated state", () => {
    const authenticatedProps = {
      ...defaultProps,
      isAuthenticated: true,
      supabase: {
        auth: {
          signOut: vi.fn(),
          getUser: vi.fn(),
          signInWithOtp: vi.fn(),
        },
        from: vi.fn(() => ({
          upsert: vi.fn(),
        })),
      } as unknown as typeof defaultProps.supabase,
    };

    it("should render display name input when authenticated", () => {
      render(<AccountSection {...authenticatedProps} />);
      const input = screen.getByDisplayValue("Test User");
      expect(input).toBeInTheDocument();
    });

    it("should show sign out button when authenticated", () => {
      render(<AccountSection {...authenticatedProps} />);
      expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument();
    });

    it("should show clear local data button when authenticated", () => {
      render(<AccountSection {...authenticatedProps} />);
      expect(screen.getByRole("button", { name: /clear local data/i })).toBeInTheDocument();
    });

    it("should call onNameChange when display name is changed", async () => {
      const onNameChange = vi.fn();
      const user = userEvent.setup();
      render(<AccountSection {...authenticatedProps} onNameChange={onNameChange} />);

      const input = screen.getByDisplayValue("Test User");
      await user.clear(input);
      await user.type(input, "New Name");

      expect(onNameChange).toHaveBeenCalled();
    });

    it("should call onClearLocalData when clear button is clicked", async () => {
      const onClearLocalData = vi.fn();
      const user = userEvent.setup();
      render(<AccountSection {...authenticatedProps} onClearLocalData={onClearLocalData} />);

      const clearButton = screen.getByRole("button", { name: /clear local data/i });
      await user.click(clearButton);

      expect(onClearLocalData).toHaveBeenCalledTimes(1);
    });

    it("should render identity badge when authenticated", () => {
      render(<AccountSection {...authenticatedProps} />);
      expect(screen.getByTestId("identity-badge")).toBeInTheDocument();
    });
  });

  describe("Loading states", () => {
    const loadingProps = {
      ...defaultProps,
      isAuthenticated: true,
      isLoadingProfile: true,
      status: "Loading...",
      supabase: {
        auth: {
          signOut: vi.fn(),
        },
      } as unknown as typeof defaultProps.supabase,
    };

    it("should show loading spinner when loading profile", () => {
      render(<AccountSection {...loadingProps} />);
      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });

    it("should disable clear button when loading", () => {
      render(<AccountSection {...loadingProps} />);
      const clearButton = screen.getByRole("button", { name: /clear local data/i });
      expect(clearButton).toBeDisabled();
    });

    it("should show custom status message when loading", () => {
      render(<AccountSection {...loadingProps} status="Syncing..." />);
      expect(screen.getByText("Syncing...")).toBeInTheDocument();
    });
  });

  describe("Supabase unavailable", () => {
    it("should show warning when supabase is unavailable", () => {
      render(<AccountSection {...defaultProps} supabaseUnavailable={true} />);
      expect(screen.getByText(/cloud sync is disabled/i)).toBeInTheDocument();
      expect(screen.getByText("NEXT_PUBLIC_SUPABASE_URL")).toBeInTheDocument();
      expect(screen.getByText("NEXT_PUBLIC_SUPABASE_ANON_KEY")).toBeInTheDocument();
    });

    it("should disable email input when supabase is unavailable", () => {
      render(<AccountSection {...defaultProps} supabaseUnavailable={true} />);
      const input = screen.getByPlaceholderText("name@example.com");
      expect(input).toBeDisabled();
    });

    it("should disable send link button when supabase is unavailable", () => {
      render(<AccountSection {...defaultProps} supabaseUnavailable={true} />);
      const button = screen.getByRole("button", { name: /send sign-in link/i });
      expect(button).toBeDisabled();
    });
  });
});
