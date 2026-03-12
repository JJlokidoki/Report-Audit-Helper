import { useEffect } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";

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
    </div>
  );
}

// ── Editor ─────────────────────────────────────────────────

function TipTapEditor({ value, onChange, placeholder, className }: Omit<Props, "rows">) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({ inline: false }),
      Placeholder.configure({ placeholder: placeholder ?? "" }),
    ],
    content: value || "",
    onUpdate: ({ editor }) => {
      const html = editor.isEmpty ? null : editor.getHTML();
      onChange(html);
    },
    editorProps: {
      handlePaste(view, event) {
        const files = event.clipboardData?.files;
        if (!files?.length) return false;
        const imageNode = view.state.schema.nodes["image"];
        if (!imageNode) return false;
        Array.from(files)
          .filter((f) => f.type.startsWith("image/"))
          .forEach(async (file) => {
            const src = await fileToBase64(file);
            view.dispatch(view.state.tr.replaceSelectionWith(imageNode.create({ src })));
          });
        return false;
      },
      handleDrop(view, event) {
        const files = event.dataTransfer?.files;
        if (!files?.length) return false;
        const imageNode = view.state.schema.nodes["image"];
        if (!imageNode) return false;
        const pos = view.posAtCoords({ left: event.clientX, top: event.clientY });
        Array.from(files)
          .filter((f) => f.type.startsWith("image/"))
          .forEach(async (file) => {
            const src = await fileToBase64(file);
            view.dispatch(view.state.tr.insert(pos?.pos ?? 0, imageNode.create({ src })));
          });
        return false;
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

export default function RichEditor({ value, onChange, placeholder, rows = 4, className }: Props) {
  return (
    <TipTapEditor
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={className}
    />
  );
}
