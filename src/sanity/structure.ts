import type { StructureBuilder } from "sanity/structure";

const SINGLETON_IDS: Record<string, string> = {
  siteSettings: "siteSettings",
  landingPage: "landingPage",
  tripBuilderConfig: "tripBuilderConfig",
  pagesContent: "pagesContent",
};

function singletonEditor(S: StructureBuilder, typeName: string, title: string) {
  return S.listItem()
    .title(title)
    .id(typeName)
    .child(
      S.document()
        .schemaType(typeName)
        .documentId(SINGLETON_IDS[typeName]!)
    );
}

export const deskStructure = (S: StructureBuilder) =>
  S.list()
    .title("Content")
    .items([
      // ── Site Content (singletons) ──────────────
      S.listItem()
        .title("Site Content")
        .child(
          S.list()
            .title("Site Content")
            .items([
              singletonEditor(S, "landingPage", "Landing Page"),
              singletonEditor(S, "siteSettings", "Footer & Settings"),
              singletonEditor(S, "tripBuilderConfig", "Trip Builder Config"),
              singletonEditor(S, "pagesContent", "Pages Content"),
            ])
        ),

      S.divider(),

      // ── Guides ─────────────────────────────────
      S.listItem()
        .title("Guides")
        .child(
          S.list()
            .title("Guides")
            .items([
              S.listItem()
                .title("Drafts")
                .child(
                  S.documentList()
                    .title("Drafts")
                    .filter('_type == "guide" && editorialStatus == "draft"')
                ),
              S.listItem()
                .title("In Review")
                .child(
                  S.documentList()
                    .title("In Review")
                    .filter('_type == "guide" && editorialStatus == "in_review"')
                ),
              S.listItem()
                .title("Published")
                .child(
                  S.documentList()
                    .title("Published")
                    .filter('_type == "guide" && editorialStatus == "published"')
                ),
              S.listItem()
                .title("Archived")
                .child(
                  S.documentList()
                    .title("Archived")
                    .filter('_type == "guide" && editorialStatus == "archived"')
                ),
              S.divider(),
              S.listItem()
                .title("All Guides")
                .child(
                  S.documentList()
                    .title("All Guides")
                    .filter('_type == "guide"')
                ),
            ])
        ),

      // ── Authors ────────────────────────────────
      S.listItem()
        .title("Authors")
        .child(S.documentTypeList("author").title("Authors")),
    ]);
