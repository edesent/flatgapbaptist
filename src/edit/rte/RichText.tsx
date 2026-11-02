"use client";

import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
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

  const on = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e
        ? {
            h2: e.isActive("heading", { level: 2 }),
            h3: e.isActive("heading", { level: 3 }),
            bold: e.isActive("bold"),
            italic: e.isActive("italic"),
            underline: e.isActive("underline"),
            bullets: e.isActive("bulletList"),
            numbers: e.isActive("orderedList"),
            quote: e.isActive("blockquote"),
            center: e.isActive({ textAlign: "center" }),
            link: e.isActive("link"),
            canUndo: e.can().undo(),
            canRedo: e.can().redo(),
          }
        : null,
  });

  if (!editor || !on) return <div className="dfd-rte" aria-busy="true" />;

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
      <div className="dfd-rte-bar" role="toolbar" aria-label="Formatting">
        <select
          aria-label="Text style"
          className="dfd-rte-select"
          value={on.h2 ? "h2" : on.h3 ? "h3" : "p"}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "p") run().setParagraph().run();
            else run().setHeading({ level: v === "h2" ? 2 : 3 }).run();
          }}
        >
          <option value="p">Normal text</option>
          <option value="h2">Big heading</option>
          <option value="h3">Small heading</option>
        </select>
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
