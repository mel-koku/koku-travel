import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatsSection } from "@/app/dashboard/components/StatsSection";

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
