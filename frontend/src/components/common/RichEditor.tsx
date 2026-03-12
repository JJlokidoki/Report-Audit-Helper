import { useEffect } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import { Fragment } from "@tiptap/pm/model";
import { TextSelection } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";

interface Props {
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  rich?: boolean;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => res(reader.result as string);
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });
}

async function insertImageWithCaption(view: EditorView, file: File, insertAt?: number) {
  const src = await fileToBase64(file);
  const { state } = view;
  const { schema } = state;
  const imageType = schema.nodes["image"];
  const paraType = schema.nodes["paragraph"];
  if (!imageType || !paraType) return;

  // TODO: каунтер картинок должен быть сквозной. Вохможно через шаблонизатор {{ image_n }}
  let imgCount = 0;
  state.doc.descendants((node) => { if (node.type === imageType) imgCount++; });
  const n = imgCount + 1;

  const italicMark = schema.marks["italic"]?.create();
  const captionText = italicMark
    ? schema.text(`Рисунок ${n}. `, [italicMark])
    : schema.text(`Рисунок ${n}. `);

  const img     = imageType.create({ src, align: "center" });
  const caption = paraType.create({ textAlign: "center" }, captionText);
  const next    = paraType.create({ textAlign: "left" });

  const from = insertAt ?? state.selection.from;
  const to   = insertAt != null ? insertAt : state.selection.to;
  const content = Fragment.fromArray([img, caption, next]);
  const tr = state.tr.replaceWith(from, to, content);

  // Place cursor at end of caption text, ready to type description
  const captionEnd = from + img.nodeSize + 1 + captionText.nodeSize;
  tr.setSelection(TextSelection.create(tr.doc, captionEnd));
  view.dispatch(tr);
}

const ALIGN_STYLES: Record<string, string> = {
  left:   "display:block;margin-right:auto;",
  center: "display:block;margin:0 auto;",
  right:  "display:block;margin-left:auto;",
};

const ImageWithAlign = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      align: {
        default: "left",
        renderHTML: ({ align }) => ({ style: ALIGN_STYLES[align as string] ?? ALIGN_STYLES.left }),
        parseHTML: (el) => {
          const s = (el as HTMLElement).style;
          if (s.marginLeft === "auto" && s.marginRight !== "auto") return "right";
          if (s.marginLeft === "auto" || s.marginRight === "auto") return "center";
          return "left";
        },
      },
    };
  },
});

// ── Toolbar ────────────────────────────────────────────────

interface TBtnProps {
  onClick: () => void;
  active?: boolean;
  title?: string;
  children: React.ReactNode;
}

function TBtn({ onClick, active, title, children }: TBtnProps) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      className={[
        "font-mono text-[11px] px-1.5 py-0.5 border transition-colors duration-100 select-none",
        active
          ? "text-primary bg-primary/10 border-primary/40"
          : "text-base-content/45 bg-transparent border-transparent hover:text-base-content hover:border-base-content/20",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="w-px self-stretch bg-base-300 mx-0.5" />;
}

function EditorToolbar({ editor }: { editor: Editor }) {
  const chain = () => editor.chain().focus();
  const isImg = editor.isActive("image");
  const imgAlign = editor.getAttributes("image").align as string | undefined;
  const alignActive = (a: string) => isImg ? imgAlign === a : editor.isActive({ textAlign: a });
  const setAlign = (a: string) => isImg
    ? editor.chain().focus().updateAttributes("image", { align: a }).run()
    : editor.chain().focus().setTextAlign(a).run();

  return (
    <div className="flex items-center gap-0.5 flex-wrap px-2 py-1 border-b border-base-300 bg-base-200/50">
      {/* Text formatting */}
      <TBtn onClick={() => chain().toggleBold().run()} active={editor.isActive("bold")} title="Жирный (Ctrl+B)">
        <strong>B</strong>
      </TBtn>
      <TBtn onClick={() => chain().toggleItalic().run()} active={editor.isActive("italic")} title="Курсив (Ctrl+I)">
        <em>I</em>
      </TBtn>
      <TBtn onClick={() => chain().toggleStrike().run()} active={editor.isActive("strike")} title="Зачёркнутый">
        <s>S</s>
      </TBtn>
      <TBtn onClick={() => chain().toggleCode().run()} active={editor.isActive("code")} title="Код (Ctrl+E)">
        {"</>"}
      </TBtn>

      <Divider />

      {/* Headings */}
      <TBtn onClick={() => chain().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="Заголовок 1">
        H1
      </TBtn>
      <TBtn onClick={() => chain().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="Заголовок 2">
        H2
      </TBtn>
      <TBtn onClick={() => chain().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="Заголовок 3">
        H3
      </TBtn>

      <Divider />

      {/* Lists */}
      <TBtn onClick={() => chain().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Маркированный список">
        UL
      </TBtn>
      <TBtn onClick={() => chain().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Нумерованный список">
        OL
      </TBtn>

      <Divider />

      {/* Blocks */}
      <TBtn onClick={() => chain().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Цитата">
        {"\"\""}
      </TBtn>
      <TBtn onClick={() => chain().toggleCodeBlock().run()} active={editor.isActive("codeBlock")} title="Блок кода">
        {"{ }"}
      </TBtn>
      <TBtn onClick={() => chain().setHorizontalRule().run()} title="Разделитель">
        —
      </TBtn>

      <Divider />

      {/* Alignment */}
      <TBtn onClick={() => setAlign("left")}   active={alignActive("left")}   title="По левому краю">⬤▬▬</TBtn>
      <TBtn onClick={() => setAlign("center")} active={alignActive("center")} title="По центру">▬⬤▬</TBtn>
      <TBtn onClick={() => setAlign("right")}  active={alignActive("right")}  title="По правому краю">▬▬⬤</TBtn>
    </div>
  );
}

// ── Editor ─────────────────────────────────────────────────

function TipTapEditor({ value, onChange, placeholder, className }: Omit<Props, "rows">) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      ImageWithAlign.configure({ inline: false, allowBase64: true }),
      Placeholder.configure({ placeholder: placeholder ?? "" }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: value || "",
    onUpdate: ({ editor }) => {
      const html = editor.isEmpty ? null : editor.getHTML();
      onChange(html);
    },
    editorProps: {
      handlePaste(view, event) {
        const items = event.clipboardData?.items;
        if (!items) return false;
        const imageItems = Array.from(items).filter((i) => i.type.startsWith("image/"));
        if (!imageItems.length) return false;
        imageItems.forEach((item) => {
          const file = item.getAsFile();
          if (file) insertImageWithCaption(view, file);
        });
        return true;
      },
      handleDrop(view, event) {
        const files = event.dataTransfer?.files;
        if (!files?.length) return false;
        const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
        if (!imageFiles.length) return false;
        const dropPos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos;
        imageFiles.forEach((file) => insertImageWithCaption(view, file, dropPos));
        return true;
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.isEmpty ? null : editor.getHTML();
    if (current !== value) {
      editor.commands.setContent(value || "");
    }
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className={[
        "border border-base-300 bg-base-100 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-colors",
        className ?? "",
      ].join(" ")}
    >
      {editor && <EditorToolbar editor={editor} />}
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none px-3 py-2 min-h-24 focus:outline-none"
      />
    </div>
  );
}

// ── Export ─────────────────────────────────────────────────

export default function RichEditor({ value, onChange, placeholder, className }: Props) {
  return (
    <TipTapEditor
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={className}
    />
  );
}
