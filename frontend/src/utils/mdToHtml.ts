import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";

export function mdToHtml(markdown: string): string {
  const editor = new Editor({
    extensions: [StarterKit, Markdown],
    content: markdown,
  });
  const html = editor.getHTML();
  editor.destroy();
  return html;
}
