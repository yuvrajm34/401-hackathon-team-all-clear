import { parseJobDescriptionBlocks } from "@/lib/jobs/pretty-description";

export function JobDescriptionBody({ text }: { text: string }) {
  const blocks = parseJobDescriptionBlocks(text);

  if (blocks.length === 0) {
    return <p className="text-xs text-ink-subtle">Nothing saved yet.</p>;
  }

  return (
    <div className="scrollbar-slim max-h-80 space-y-3 overflow-x-hidden overflow-y-auto text-sm leading-relaxed text-ink-muted">
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          return (
            <h3
              key={index}
              className="pt-1 text-xs font-semibold uppercase tracking-wide text-ink"
            >
              {block.text}
            </h3>
          );
        }
        if (block.type === "list") {
          return (
            <ul key={index} className="list-disc space-y-1 pl-4 text-sm">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex} className="break-words">
                  {item}
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={index} className="break-words">
            {block.text}
          </p>
        );
      })}
    </div>
  );
}
