import { Fragment } from "react";

/**
 * Minimal, safe markdown subset for rules/descriptions: "## " headings, "- " or "1. " lists,
 * **bold**, paragraphs. Renders React nodes only (no HTML injection).
 */
export function RichText({ text, className }: { text: string; className?: string }) {
  const blocks = text.replace(/\r/g, "").split(/\n{2,}/);
  return (
    <div className={className ?? "grid gap-3 text-sm leading-relaxed text-foreground/90"}>
      {blocks.map((b, i) => {
        const lines = b.split("\n").filter(Boolean);
        if (!lines.length) return null;
        if (/^#{1,3} /.test(lines[0]) && lines.length === 1)
          return <h3 key={i} className="mt-2 font-heading text-lg font-semibold text-foreground">{inline(lines[0].replace(/^#{1,3} /, ""))}</h3>;
        if (lines.every((l) => /^(\d+\.|-|\*) /.test(l))) {
          const ordered = /^\d+\./.test(lines[0]);
          const items = lines.map((l, j) => <li key={j}>{inline(l.replace(/^(\d+\.|-|\*) /, ""))}</li>);
          return ordered
            ? <ol key={i} className="ml-5 grid list-decimal gap-1">{items}</ol>
            : <ul key={i} className="ml-5 grid list-disc gap-1">{items}</ul>;
        }
        return (
          <p key={i}>
            {lines.map((l, j) => (
              <Fragment key={j}>{j > 0 && <br />}{/^#{1,3} /.test(l) ? <strong className="font-heading text-base">{l.replace(/^#{1,3} /, "")}</strong> : inline(l)}</Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}

function inline(s: string) {
  return s.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : <Fragment key={i}>{part}</Fragment>,
  );
}
