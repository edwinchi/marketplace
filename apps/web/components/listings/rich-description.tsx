// Renders the lightweight markdown subset analyze-photo-action.ts's prompt asks the AI for ("## "
// headers, "- " bullets, blank-line-separated paragraphs) as real elements -- no markdown library,
// no dangerouslySetInnerHTML (this is AI- and user-authored text, never trusted as HTML). A plain
// hand-typed description (no "## "/"- " lines at all) still renders correctly: every line just
// falls into the paragraph case below, identical to the old plain <p> rendering.
export function RichDescription({ text }: { text: string }) {
  const lines = text.split("\n");
  const blocks: { type: "heading" | "paragraph" | "list"; content: string | string[] }[] = [];
  let paragraphBuffer: string[] = [];
  let listBuffer: string[] = [];

  function flushParagraph() {
    if (paragraphBuffer.length) {
      blocks.push({ type: "paragraph", content: paragraphBuffer.join(" ") });
      paragraphBuffer = [];
    }
  }
  function flushList() {
    if (listBuffer.length) {
      blocks.push({ type: "list", content: [...listBuffer] });
      listBuffer = [];
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.startsWith("## ")) {
      flushParagraph();
      flushList();
      blocks.push({ type: "heading", content: line.slice(3).trim() });
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      flushParagraph();
      listBuffer.push(line.slice(2).trim());
    } else if (line === "") {
      flushParagraph();
      flushList();
    } else {
      flushList();
      paragraphBuffer.push(line);
    }
  }
  flushParagraph();
  flushList();

  return (
    <div className="flex flex-col gap-3">
      {blocks.map((block, i) => {
        if (block.type === "heading") {
          return (
            <h3 key={i} className="mt-2 text-base font-semibold first:mt-0">
              {block.content as string}
            </h3>
          );
        }
        if (block.type === "list") {
          return (
            <ul key={i} className="flex flex-col gap-1.5 pl-1">
              {(block.content as string[]).map((item, j) => (
                <li key={j} className="flex gap-2 text-sm">
                  <span className="mt-2 size-1 shrink-0 rounded-full bg-[#008200]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="text-sm whitespace-pre-wrap">
            {block.content as string}
          </p>
        );
      })}
    </div>
  );
}
