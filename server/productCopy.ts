/** Split Lazada (and similar) product copy into Highlights vs Description. */

export interface ProductCopyParts {
  highlights: string[];
  description: string;
}

function cleanLine(line: string): string {
  return line
    .replace(/^[\s•\-–—*·▪▸►]+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function linesFromBlock(block: string): string[] {
  return block
    .split(/\n+/)
    .map(cleanLine)
    .filter(Boolean);
}

function findSloganStart(text: string): number {
  // Lazada often glues title → slogan with no space: "ShoesTOTAL SUPPORT FOR …."
  const glued = text.match(/[a-z0-9]([A-Z]{2,}(?:[ \t/,&'\-][A-Z0-9]{2,}){2,}\.)/);
  if (glued && glued.index != null) {
    const at = glued.index + 1;
    if (!/^STYLE\b/i.test(glued[1])) return at;
  }

  const match = text.match(/\b([A-Z]{2,}(?:[ \t/,&'\-][A-Z0-9]{2,}){2,}\.)/);
  if (!match || match.index == null) return -1;
  if (/^STYLE\b/i.test(match[1])) return -1;
  return match.index;
}

function tokenizeHighlightBlob(before: string, productTitle?: string): string[] {
  let rest = before.replace(/\s+/g, " ").trim();
  if (!rest) return [];

  if (productTitle) {
    const shortTitle = productTitle.split(/[|\-–—]/)[0]?.trim() ?? "";
    if (shortTitle.length > 12) {
      const idx = rest.toLowerCase().indexOf(shortTitle.toLowerCase().slice(0, 28));
      if (idx > 0) rest = rest.slice(0, idx).trim();
    }
  }

  const items: string[] = [];

  const style = rest.match(/^STYLE\s*COLOR\s*:\s*(\S+)\s*/i);
  if (style) {
    items.push(`STYLE COLOR: ${style[1]}`);
    rest = rest.slice(style[0].length).trim();
  }

  const gender = rest.match(/^(Men'?s|Women'?s|Unisex|Boys'?|Girls'?)\b\s*/i);
  if (gender) {
    items.push(gender[1]);
    rest = rest.slice(gender[0].length).trim();
  }

  const cats = rest.match(
    /^((?:(?!Nike|Adidas|Puma|New Balance|White\/|Black\/|Grey\/|Gray\/|Blue\/|Red\/|Green\/)[A-Z][a-zA-Z0-9]+(?:\s+|$)){1,4})/,
  );
  if (cats) {
    for (const word of cats[1].trim().split(/\s+/)) {
      if (word) items.push(word);
    }
    rest = rest.slice(cats[0].length).trim();
  }

  // e.g. White/Metallic Silver — stop before brand names
  const colors = rest.match(
    /^([A-Z][a-zA-Z]+(?:\s*\/\s*(?:(?!Nike|Adidas|Puma|New\b)[A-Z][a-zA-Z]+(?:\s+(?!Nike|Adidas|Puma|New\b)[A-Z][a-zA-Z]+){0,2})){1,6})\s*/,
  );
  if (colors) {
    items.push(colors[1].replace(/\s*\/\s*/g, "/").replace(/\s+/g, " ").trim());
    rest = rest.slice(colors[0].length).trim();
  }

  if (rest && rest.length <= 48 && !/\b(Nike|Adidas|Puma|Shoes|Air)\b/i.test(rest)) {
    items.push(rest);
  }

  return [...new Set(items.filter(Boolean))];
}

export function splitProductCopy(
  raw: string | undefined | null,
  productTitle?: string,
): ProductCopyParts {
  const text = (raw ?? "").replace(/\r\n/g, "\n").trim();
  if (!text) return { highlights: [], description: "" };

  const highlightHeader = /(?:^|\n)\s*Highlights?\s*[:\-]?\s*(?:\n|$)/i;
  const descriptionHeader = /(?:^|\n)\s*Description\s*[:\-]?\s*(?:\n|$)/i;

  const hasHighlights = highlightHeader.test(text);
  const hasDescription = descriptionHeader.test(text);

  if (hasHighlights || hasDescription) {
    let highlightsBlock = "";
    let descriptionBlock = "";

    if (hasHighlights && hasDescription) {
      const afterHighlights = text.split(highlightHeader).slice(1).join("\n");
      const parts = afterHighlights.split(descriptionHeader);
      highlightsBlock = parts[0] ?? "";
      descriptionBlock = parts.slice(1).join("\n");
    } else if (hasHighlights) {
      highlightsBlock = text.split(highlightHeader).slice(1).join("\n");
    } else {
      descriptionBlock = text.split(descriptionHeader).slice(1).join("\n");
    }

    const highlightLines = linesFromBlock(highlightsBlock);
    const highlights =
      highlightLines.length <= 2 && /STYLE\s*COLOR/i.test(highlightsBlock)
        ? tokenizeHighlightBlob(highlightsBlock.replace(/\n+/g, " "), productTitle)
        : highlightLines;

    return {
      highlights,
      description: descriptionBlock.replace(/\n{3,}/g, "\n\n").trim(),
    };
  }

  if (/STYLE\s*COLOR\s*:/i.test(text) || findSloganStart(text) > 8) {
    const sloganAt = findSloganStart(text);
    if (sloganAt > 8) {
      const before = text.slice(0, sloganAt).trim();
      const after = text.slice(sloganAt).trim();
      const highlights = tokenizeHighlightBlob(before, productTitle);
      if (highlights.length > 0) {
        return { highlights, description: after };
      }
    }

    if (/^STYLE\s*COLOR\s*:/i.test(text)) {
      const highlights = tokenizeHighlightBlob(text, productTitle);
      let description = text;
      for (const h of highlights) {
        description = description.replace(h, " ").replace(/\s+/g, " ").trim();
      }
      description = description.replace(/^STYLE\s*COLOR\s*:\s*\S+\s*/i, "").trim();
      return {
        highlights,
        description: description.length > 40 ? description : "",
      };
    }
  }

  const lines = linesFromBlock(text);
  if (lines.length >= 3) {
    const short = lines.filter((l) => l.length <= 60);
    const long = lines.filter((l) => l.length > 60);
    if (short.length >= 2 && long.length >= 1) {
      return {
        highlights: short,
        description: long.join("\n\n"),
      };
    }
  }

  return { highlights: [], description: text };
}

export function extractHighlightsFromHtml(html: string): string[] {
  const out: string[] = [];
  const arrayMatch = html.match(/"highlights?"\s*:\s*(\[[\s\S]*?\])/i);
  if (arrayMatch?.[1]) {
    try {
      const parsed = JSON.parse(arrayMatch[1]) as unknown;
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (typeof item === "string" && item.trim()) out.push(item.trim());
          else if (item && typeof item === "object") {
            const row = item as Record<string, unknown>;
            const value = [row.text, row.value, row.name, row.title].find(
              (v) => typeof v === "string" && v.trim(),
            ) as string | undefined;
            if (value) out.push(value.trim());
          }
        }
      }
    } catch {
      /* ignore */
    }
  }
  return [...new Set(out)].slice(0, 40);
}
