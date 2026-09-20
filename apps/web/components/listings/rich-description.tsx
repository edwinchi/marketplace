// Inline formatting within a heading/paragraph/list-item's own text -- **bold**, *italic*,
// ++underline++ (markdown has no standard underline marker; ++text++ is this app's own
// convention, applied consistently by DescriptionEditor's toolbar on the way in and here on the
// way out, not a real markdown extension). Still no markdown library, no dangerouslySetInnerHTML
// -- a small hand-rolled tokenizer matching the rest of this file's own stated approach.
function parseInline(text: string): React.ReactNode[] {
  const pattern = /\*\*(.+?)\*\*|\*(.+?)\*|\+\+(.+?)\+\+/g;
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = pattern.exec(text))) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    if (match[1] !== undefined) nodes.push(<strong key={key++}>{match[1]}</strong>);
    else if (match[2] !== undefined) nodes.push(<em key={key++}>{match[2]}</em>);
    else if (match[3] !== undefined) nodes.push(<u key={key++}>{match[3]}</u>);
    lastIndex = pattern.lastIndex;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

// Renders the lightweight markdown subset analyze-photo-action.ts's prompt asks the AI for ("## "
// headers, "- " bullets, blank-line-separated paragraphs, plus the inline markers above) as real
// elements -- no markdown library, no dangerouslySetInnerHTML (this is AI- and user-authored text,
// never trusted as HTML). A plain hand-typed description (none of those markers at all) still
// renders correctly: every line just falls into the paragraph case below, identical to the old
// plain <p> rendering.
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
              {parseInline(block.content as string)}
            </h3>
          );
        }
        if (block.type === "list") {
          return (
            <ul key={i} className="flex flex-col gap-1.5 pl-1">
              {(block.content as string[]).map((item, j) => (
                <li key={j} className="flex gap-2 text-sm">
                  <span className="mt-2 size-1 shrink-0 rounded-full bg-[#008200]" />
                  <span>{parseInline(item)}</span>
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="text-sm whitespace-pre-wrap">
            {parseInline(block.content as string)}
          </p>
        );
      })}
    </div>
  );
}
