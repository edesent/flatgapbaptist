import { Extension } from "@tiptap/react";

/**
 * Indent for paragraphs and headings, saved as data-indent="1"…"6" (the site's
 * .rich styles turn each step into 2em of left margin). Tab / Shift+Tab indent
 * and outdent; inside a list they nest and un-nest the item instead.
 */

const TYPES = ["paragraph", "heading"];
const MAX = 6;

declare module "@tiptap/react" {
  interface Commands<ReturnType> {
    indent: {
      indent: () => ReturnType;
      outdent: () => ReturnType;
    };
  }
}

export const Indent = Extension.create({
  name: "indent",

  addGlobalAttributes() {
    return [
      {
        types: TYPES,
        attributes: {
          indent: {
            default: 0,
            parseHTML: (el) => Math.min(MAX, Math.max(0, Number(el.getAttribute("data-indent")) || 0)),
            renderHTML: (attrs) => (attrs.indent ? { "data-indent": String(attrs.indent) } : {}),
          },
        },
      },
    ];
  },

  addCommands() {
    const step =
      (delta: number) =>
      () =>
      ({ tr, state, dispatch }: { tr: import("@tiptap/pm/state").Transaction; state: import("@tiptap/pm/state").EditorState; dispatch?: unknown }) => {
        const { from, to } = state.selection;
        let changed = false;
        state.doc.nodesBetween(from, to, (node, pos) => {
          if (!TYPES.includes(node.type.name)) return;
          const next = Math.min(MAX, Math.max(0, (node.attrs.indent ?? 0) + delta));
          if (next === node.attrs.indent) return;
          tr.setNodeMarkup(pos, undefined, { ...node.attrs, indent: next });
          changed = true;
        });
        if (changed && dispatch) (dispatch as (t: typeof tr) => void)(tr);
        return changed;
      };
    return { indent: step(1), outdent: step(-1) };
  },

  addKeyboardShortcuts() {
    return {
      Tab: () => (this.editor.isActive("listItem") ? this.editor.commands.sinkListItem("listItem") : this.editor.commands.indent()) || true,
      "Shift-Tab": () =>
        (this.editor.isActive("listItem") ? this.editor.commands.liftListItem("listItem") : this.editor.commands.outdent()) || true,
    };
  },
});
