import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: Record<string, unknown>) => <div {...props}>{children as React.ReactNode}</div>,
  },
  m: {
    div: ({ children, ...props }: Record<string, unknown>) => <div {...props}>{children as React.ReactNode}</div>,
  },
  useScroll: () => ({ scrollYProgress: { get: () => 0 } }),
  useTransform: () => ({ get: () => 1 }),
  useReducedMotion: () => false,
}));

// Mock ScrollReveal to render children directly
vi.mock("@/components/ui/ScrollReveal", () => ({
  ScrollReveal: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock AnimatedNumber to render the value as text
vi.mock("@/components/ui/AnimatedNumber", () => ({
  AnimatedNumber: ({ value, className }: { value: number; className?: string }) => (
    <span className={className}>{value}</span>
  ),
}));

// Mock parallaxSection
vi.mock("@/lib/motion", () => ({
  parallaxSection: { from: 1, to: 1.1 },
}));

import { StatsSection } from "@/app/(main)/dashboard/components/StatsSection";

describe("StatsSection", () => {
  describe("Rendering", () => {
    it("should render section labels", () => {
      render(<StatsSection savedCount={5} guideBookmarksCount={3} tripsCount={2} />);
      expect(screen.getByText("Saved")).toBeInTheDocument();
      expect(screen.getByText("Guides")).toBeInTheDocument();
      expect(screen.getByText("Trips")).toBeInTheDocument();
    });

    it("should render heading and eyebrow", () => {
      render(<StatsSection savedCount={0} guideBookmarksCount={0} tripsCount={0} />);
      expect(screen.getByText("Activity")).toBeInTheDocument();
      expect(screen.getByText("At a Glance")).toBeInTheDocument();
    });
  });

  describe("Links", () => {
    it("should show 'Explore places' link when no saved", () => {
      render(<StatsSection savedCount={0} guideBookmarksCount={0} tripsCount={0} />);
      const placesLink = screen.getByRole("link", { name: /explore places/i });
      expect(placesLink).toHaveAttribute("href", "/places");
    });

    it("should show 'View saved' link when has saved", () => {
      render(<StatsSection savedCount={5} guideBookmarksCount={0} tripsCount={0} />);
      const savedLink = screen.getByRole("link", { name: /view saved/i });
      expect(savedLink).toHaveAttribute("href", "/saved");
    });

    it("should always show guides link", () => {
      render(<StatsSection savedCount={0} guideBookmarksCount={0} tripsCount={0} />);
      const guidesLink = screen.getByRole("link", { name: /view guides/i });
      expect(guidesLink).toHaveAttribute("href", "/guides/bookmarks");
    });

    it("should always show trips link", () => {
      render(<StatsSection savedCount={0} guideBookmarksCount={0} tripsCount={0} />);
      const tripsLink = screen.getByRole("link", { name: /view trips/i });
      expect(tripsLink).toHaveAttribute("href", "#trips");
    });
  });
});
