import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatsSection } from "@/app/dashboard/components/StatsSection";

describe("StatsSection", () => {
  describe("Rendering", () => {
    it("should render favorites count", () => {
      render(<StatsSection favoritesCount={5} guideBookmarksCount={3} />);
      expect(screen.getByText("5")).toBeInTheDocument();
      expect(screen.getByText("Favorites")).toBeInTheDocument();
    });

    it("should render guide bookmarks count", () => {
      render(<StatsSection favoritesCount={5} guideBookmarksCount={3} />);
      expect(screen.getByText("3")).toBeInTheDocument();
      expect(screen.getByText("Bookmarked Guides")).toBeInTheDocument();
    });

    it("should render zero counts", () => {
      render(<StatsSection favoritesCount={0} guideBookmarksCount={0} />);
      const zeros = screen.getAllByText("0");
      expect(zeros).toHaveLength(2);
    });
  });

  describe("Links", () => {
    it("should show 'Explore places' link when no favorites", () => {
      render(<StatsSection favoritesCount={0} guideBookmarksCount={0} />);
      const exploreLink = screen.getByRole("link", { name: /explore places/i });
      expect(exploreLink).toHaveAttribute("href", "/explore");
    });

    it("should show 'View favorites' link when has favorites", () => {
      render(<StatsSection favoritesCount={5} guideBookmarksCount={0} />);
      const favoritesLink = screen.getByRole("link", { name: /view favorites/i });
      expect(favoritesLink).toHaveAttribute("href", "/favorites");
    });

    it("should always show guide bookmarks link", () => {
      render(<StatsSection favoritesCount={0} guideBookmarksCount={0} />);
      const bookmarksLink = screen.getByRole("link", { name: /view bookmarks/i });
      expect(bookmarksLink).toHaveAttribute("href", "/guides/bookmarks");
    });
  });
});
