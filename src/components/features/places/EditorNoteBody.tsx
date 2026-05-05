import {
  PortableText,
  type PortableTextBlock,
  type PortableTextComponents,
} from "@portabletext/react";

/**
 * Minimal renderer for `editorNote.note` Portable Text. Matches the typography
 * of the description paragraph it replaces (`text-base leading-relaxed
 * text-foreground-secondary`) so the drawer + detail surface look unchanged
 * to a casual reader — only the prose itself is curated.
 *
 * The schema (src/sanity/schemas/editorNote.ts) only allows paragraph blocks
 * with italic + bold decorators; no headings, no embeds, no images. The
 * components map below covers exactly that surface.
 */

const components: PortableTextComponents = {
  block: {
    normal: ({ children }) => (
      <p className="text-base leading-relaxed text-foreground-secondary">
        {children}
      </p>
    ),
  },
};

export function EditorNoteBody({ blocks }: { blocks: PortableTextBlock[] }) {
  return (
    <div className="space-y-3">
      <PortableText value={blocks} components={components} />
    </div>
  );
}
