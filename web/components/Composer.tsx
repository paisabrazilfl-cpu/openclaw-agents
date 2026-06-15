"use client";

import { useRef, useState } from "react";
import type { Attachment } from "@/lib/store";
import { uid } from "@/lib/store";

const TEXT_EXT = /\.(txt|md|markdown|csv|json|jsonl|ya?ml|log|html?|css|js|ts|tsx|jsx|py|rb|go|rs|java|c|cpp|sh|sql|toml|ini|env)$/i;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB — keeps localStorage history sane
const MAX_TEXT_CHARS = 100_000;

function readImage(file: File): Promise<Attachment> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () =>
      resolve({ id: uid(), kind: "image", name: file.name, mime: file.type, dataUrl: String(r.result) });
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
function readText(file: File): Promise<Attachment> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () =>
      resolve({ id: uid(), kind: "text", name: file.name, mime: file.type || "text/plain", text: String(r.result).slice(0, MAX_TEXT_CHARS) });
    r.onerror = reject;
    r.readAsText(file);
  });
}

export function Composer({
  disabled,
  agentName,
  onSend,
}: {
  disabled: boolean;
  agentName: string;
  onSend: (text: string, attachments: Attachment[]) => void;
}) {
  const [text, setText] = useState("");
  const [atts, setAtts] = useState<Attachment[]>([]);
  const [note, setNote] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const addFiles = async (files: FileList | null) => {
    if (!files) return;
    const next: Attachment[] = [];
    for (const f of Array.from(files)) {
      try {
        if (f.type.startsWith("image/")) {
          if (f.size > MAX_IMAGE_BYTES) {
            setNote(`${f.name} skipped (over 5MB)`);
            continue;
          }
          next.push(await readImage(f));
        } else if (TEXT_EXT.test(f.name) || f.type.startsWith("text/")) {
          next.push(await readText(f));
        } else {
          setNote(`${f.name} skipped (unsupported type)`);
        }
      } catch {
        setNote(`Failed to read ${f.name}`);
      }
    }
    if (next.length) setAtts((a) => [...a, ...next]);
    if (fileRef.current) fileRef.current.value = "";
  };

  const grow = () => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
  };

  const submit = () => {
    const t = text.trim();
    if ((!t && atts.length === 0) || disabled) return;
    onSend(t, atts);
    setText("");
    setAtts([]);
    setNote("");
    requestAnimationFrame(() => {
      if (taRef.current) taRef.current.style.height = "auto";
    });
  };

  return (
    <div className="border-t border-ink-700 bg-ink-900 px-3 py-2.5 sm:px-4 sm:py-3">
      <div className="mx-auto max-w-3xl">
        {note && <div className="mb-1.5 text-[11px] text-amber-400/80">{note}</div>}
        {atts.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {atts.map((a) => (
              <div key={a.id} className="group relative">
                {a.kind === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.dataUrl} alt={a.name} className="h-14 w-14 rounded-lg border border-ink-600 object-cover" />
                ) : (
                  <div className="flex h-14 max-w-[8rem] items-center gap-1.5 rounded-lg border border-ink-600 bg-ink-800 px-2 text-[11px] text-stone-300">
                    <span>📄</span>
                    <span className="truncate">{a.name}</span>
                  </div>
                )}
                <button
                  onClick={() => setAtts((p) => p.filter((x) => x.id !== a.id))}
                  className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] text-white"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2">
          <button
            onClick={() => fileRef.current?.click()}
            title="Attach files"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-ink-700 text-stone-400 hover:bg-ink-800"
          >
            📎
          </button>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/*,.txt,.md,.csv,.json,.py,.js,.ts,.tsx,.html,.css,.yaml,.yml,.log,.sql"
            className="hidden"
            onChange={(e) => addFiles(e.target.files)}
          />
          <textarea
            ref={taRef}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              grow();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            rows={1}
            placeholder={`Message ${agentName}…`}
            className="max-h-[200px] min-h-[44px] flex-1 resize-none rounded-xl border border-ink-700 bg-ink-950 px-3.5 py-2.5 text-sm outline-none focus:border-claw-600"
          />
          <button
            onClick={submit}
            disabled={disabled || (!text.trim() && atts.length === 0)}
            className="flex h-11 shrink-0 items-center rounded-xl bg-claw-600 px-4 text-sm font-medium text-white transition hover:bg-claw-500 disabled:opacity-40"
          >
            {disabled ? "…" : "Send"}
          </button>
        </div>
        <div className="mt-1 hidden text-center text-[10px] text-stone-600 sm:block">
          Enter to send · Shift+Enter for newline · 📎 images & text files
        </div>
      </div>
    </div>
  );
}
