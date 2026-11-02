"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import { Indent } from "./indent";

/**
 * The blog's word processor: headings, bold/italic/underline, lists, indent,
 * quotes, centering and links. It hands back HTML; /api/edit/blog cleans it
 * to the same short list of formatting before saving.
 */
export function RichText({ value, onChange, label }: { value: string; onChange: (html: string) => void; label: string }) {
  const editor = useEditor({
    immediatelyRender: false,
    // Re-render on every change so the toolbar shows what's on where the cursor is.
    shouldRerenderOnTransaction: true,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        code: false,
        codeBlock: false,
        link: { openOnClick: false, autolink: true, defaultProtocol: "https" },
      }),
      TextAlign.configure({ types: ["heading", "paragraph"], alignments: ["left", "center"] }),
      Indent,
    ],
    content: value,
    editorProps: { attributes: { class: "rich dfd-rte-content", "aria-label": label, "aria-multiline": "true", role: "textbox" } },
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? "" : editor.getHTML()),
  });

  if (!editor) return <div className="dfd-rte" aria-busy="true" />;

  const on = {
    h2: editor.isActive("heading", { level: 2 }),
    h3: editor.isActive("heading", { level: 3 }),
    bold: editor.isActive("bold"),
    italic: editor.isActive("italic"),
    underline: editor.isActive("underline"),
    bullets: editor.isActive("bulletList"),
    numbers: editor.isActive("orderedList"),
    quote: editor.isActive("blockquote"),
    center: editor.isActive({ textAlign: "center" }),
    link: editor.isActive("link"),
    canUndo: editor.can().undo(),
    canRedo: editor.can().redo(),
  };

  const run = () => editor.chain().focus();
  const btn = (active: boolean) => `dfd-rte-btn${active ? " is-on" : ""}`;
  const inList = on.bullets || on.numbers;

  function setLink() {
    const was = editor!.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link to which web address? (Leave empty to remove the link.)", was ?? "https://");
    if (url === null) return;
    if (!url.trim() || url.trim() === "https://") run().extendMarkRange("link").unsetLink().run();
    else run().extendMarkRange("link").setLink({ href: url.trim() }).run();
  }

  return (
    <div className="dfd-rte">
      {/* Toolbar clicks never take focus, so typing carries on in the article where the cursor was. */}
      <div className="dfd-rte-bar" role="toolbar" aria-label="Formatting" onMouseDown={(e) => e.preventDefault()}>
        <button type="button" className={btn(!on.h2 && !on.h3)} onClick={() => run().setParagraph().run()} aria-pressed={!on.h2 && !on.h3}>
          Normal
        </button>
        <button type="button" className={btn(on.h2)} onClick={() => run().toggleHeading({ level: 2 }).run()} aria-pressed={on.h2}>
          Heading
        </button>
        <button type="button" className={btn(on.h3)} onClick={() => run().toggleHeading({ level: 3 }).run()} aria-pressed={on.h3}>
          Subheading
        </button>
        <span className="dfd-rte-sep" />
        <button type="button" className={btn(on.bold)} onClick={() => run().toggleBold().run()} title="Bold (Ctrl+B)" aria-pressed={on.bold}>
          <b>B</b>
        </button>
        <button type="button" className={btn(on.italic)} onClick={() => run().toggleItalic().run()} title="Italic (Ctrl+I)" aria-pressed={on.italic}>
          <i>I</i>
        </button>
        <button
          type="button"
          className={btn(on.underline)}
          onClick={() => run().toggleUnderline().run()}
          title="Underline (Ctrl+U)"
          aria-pressed={on.underline}
        >
          <u>U</u>
        </button>
        <span className="dfd-rte-sep" />
        <button type="button" className={btn(on.bullets)} onClick={() => run().toggleBulletList().run()} aria-pressed={on.bullets}>
          • List
        </button>
        <button type="button" className={btn(on.numbers)} onClick={() => run().toggleOrderedList().run()} aria-pressed={on.numbers}>
          1. List
        </button>
        <span className="dfd-rte-sep" />
        <button
          type="button"
          className={btn(false)}
          onClick={() => (inList ? run().liftListItem("listItem").run() : run().outdent().run())}
          title="Move left (Shift+Tab)"
        >
          ⇤ Outdent
        </button>
        <button
          type="button"
          className={btn(false)}
          onClick={() => (inList ? run().sinkListItem("listItem").run() : run().indent().run())}
          title="Move right (Tab)"
        >
          Indent ⇥
        </button>
        <span className="dfd-rte-sep" />
        <button type="button" className={btn(on.quote)} onClick={() => run().toggleBlockquote().run()} aria-pressed={on.quote}>
          Quote
        </button>
        <button
          type="button"
          className={btn(on.center)}
          onClick={() => (on.center ? run().unsetTextAlign().run() : run().setTextAlign("center").run())}
          aria-pressed={on.center}
        >
          Center
        </button>
        <button type="button" className={btn(on.link)} onClick={setLink} aria-pressed={on.link}>
          Link
        </button>
        <span className="dfd-rte-sep" />
        <button type="button" className={btn(false)} onClick={() => run().undo().run()} disabled={!on.canUndo} title="Undo (Ctrl+Z)">
          ↶ Undo
        </button>
        <button type="button" className={btn(false)} onClick={() => run().redo().run()} disabled={!on.canRedo} title="Redo">
          ↷ Redo
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
