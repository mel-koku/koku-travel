import type { StructureResolver } from "sanity/desk";
import { BookIcon, EarthGlobeIcon, ListIcon, UserIcon, UsersIcon } from "@sanity/icons";

export const deskStructure: StructureResolver = (S) =>
  S.list()
    .title("Content")
    .items([
      S.listItem()
        .title("Authors")
        .icon(UsersIcon)
        .schemaType("author")
        .child(S.documentTypeList("author").title("Authors")),
      S.listItem()
        .title("Guides")
        .icon(UserIcon)
        .schemaType("guide")
        .child(S.documentTypeList("guide").title("Guides")),
      S.listItem()
        .title("Itineraries")
        .icon(ListIcon)
        .schemaType("itinerary")
        .child(S.documentTypeList("itinerary").title("Itineraries")),
      S.listItem()
        .title("Destinations")
        .icon(EarthGlobeIcon)
        .schemaType("destination")
        .child(S.documentTypeList("destination").title("Destinations")),
      S.listItem()
        .title("Blog Posts")
        .icon(BookIcon)
        .schemaType("blogPost")
        .child(S.documentTypeList("blogPost").title("Blog Posts")),
      S.divider(),
      ...S.documentTypeListItems().filter(
        (item) =>
          !["author", "guide", "itinerary", "destination", "blogPost"].includes(
            item.getId() || "",
          ),
      ),
    ]);

