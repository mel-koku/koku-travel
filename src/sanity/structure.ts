import type { StructureBuilder } from "sanity/structure";

export const deskStructure = (S: StructureBuilder) =>
  S.list()
    .title("Content")
    .items([
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
      S.listItem()
        .title("Authors")
        .child(S.documentTypeList("author").title("Authors")),
    ]);
