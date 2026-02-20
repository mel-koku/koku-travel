import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatsSection } from "@/app/dashboard/components/StatsSection";

describe("StatsSection", () => {
  describe("Rendering", () => {
    it("should render section labels", () => {
      render(<StatsSection favoritesCount={5} guideBookmarksCount={3} tripsCount={2} />);
      expect(screen.getByText("Favorites")).toBeInTheDocument();
      expect(screen.getByText("Guides")).toBeInTheDocument();
      expect(screen.getByText("Trips")).toBeInTheDocument();
    });

    it("should render heading and eyebrow", () => {
      render(<StatsSection favoritesCount={0} guideBookmarksCount={0} tripsCount={0} />);
      expect(screen.getByText("Activity")).toBeInTheDocument();
      expect(screen.getByText("At a Glance")).toBeInTheDocument();
    });
  });

  describe("Links", () => {
    it("should show 'Explore places' link when no favorites", () => {
      render(<StatsSection favoritesCount={0} guideBookmarksCount={0} tripsCount={0} />);
      const exploreLink = screen.getByRole("link", { name: /explore places/i });
      expect(exploreLink).toHaveAttribute("href", "/explore");
    });

    it("should show 'View favorites' link when has favorites", () => {
      render(<StatsSection favoritesCount={5} guideBookmarksCount={0} tripsCount={0} />);
      const favoritesLink = screen.getByRole("link", { name: /view favorites/i });
      expect(favoritesLink).toHaveAttribute("href", "/favorites");
    });

    it("should always show guides link", () => {
      render(<StatsSection favoritesCount={0} guideBookmarksCount={0} tripsCount={0} />);
      const guidesLink = screen.getByRole("link", { name: /view guides/i });
      expect(guidesLink).toHaveAttribute("href", "/guides/bookmarks");
    });

    it("should always show trips link", () => {
      render(<StatsSection favoritesCount={0} guideBookmarksCount={0} tripsCount={0} />);
      const tripsLink = screen.getByRole("link", { name: /view trips/i });
      expect(tripsLink).toHaveAttribute("href", "#trips");
    });
  });
});
