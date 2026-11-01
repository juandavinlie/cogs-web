// Parses the weekly announcements PDF using its layout (text positions, sizes, fonts and links).
// Sections are found by heading, not page number, because they move from week to week.
import { getDocument, type PDFDocumentProxy, type PDFPageProxy } from "pdfjs-dist/legacy/build/pdf.mjs";
import "pdfjs-dist/legacy/build/pdf.worker.mjs"; // Runs pdf.js in-process; also makes Vercel include the file.

export type ParsedAnnouncement = {
  title: string;
  body: string;
  date: string | null; // YYYY-MM-DD, first day if it's a range
  register_by: string | null; // YYYY-MM-DD
  registration_link: string | null;
};

export type ParsedBulletin = {
  date: string | null; // YYYY-MM-DD
  messageTitle: string | null;
  prayerBurdens: string | null; // Markdown
  announcements: ParsedAnnouncement[];
  warnings: string[];
};

type Item = { str: string; x: number; y: number; w: number; size: number; bold: boolean; italic: boolean };
type Line = { y: number; x: number; end: number; items: Item[]; text: string };
type Link = { url: string; top: number; bottom: number };
type Page = { n: number; width: number; height: number; items: Item[]; links: Link[] };
type Section = { page: Page; items: Item[] };

const MONTH = "(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|June?|July?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)";
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

const squash = (s: string) => s.replace(/\s+/g, " ").trim();
const pad = (n: number) => String(n).padStart(2, "0");
const iso = (year: number, month: string, day: string) =>
  `${year}-${pad(MONTHS.indexOf(month.slice(0, 3).toLowerCase()) + 1)}-${pad(Number(day))}`;

// ── Reading the PDF ──────────────────────────────────────────────────────────
async function fontStyle(page: PDFPageProxy, fontName: string) {
  const font = page.commonObjs.has(fontName) ? page.commonObjs.get(fontName) : null;
  const name = String(font?.name ?? "");
  return { bold: /bold|black|semibold|heavy/i.test(name), italic: /italic|oblique/i.test(name) };
}

async function loadPage(doc: PDFDocumentProxy, n: number): Promise<Page> {
  const page = await doc.getPage(n);
  const { height, width } = page.getViewport({ scale: 1 });
  await page.getOperatorList(); // Fonts are only available once the page's operators are loaded.
  const content = await page.getTextContent();

  const items: Item[] = [];
  for (const raw of content.items) {
    if (!("str" in raw) || !raw.str.trim()) continue;
    const y = height - raw.transform[5];
    if (y > height - 30) continue; // Page number
    items.push({ str: raw.str, x: raw.transform[4], y, w: raw.width, size: Math.abs(raw.transform[3]), ...(await fontStyle(page, raw.fontName)) });
  }

  const links = (await page.getAnnotations())
    .filter((a) => a.subtype === "Link" && a.url && a.url !== "about:blank")
    .map((a) => ({ url: a.url as string, top: height - a.rect[3], bottom: height - a.rect[1] }));

  return { n, width, height, items, links };
}

/** Groups items into lines, top to bottom. Small raised text (like the "th" in 16th) joins its line. */
function toLines(items: Item[], tolerance = 3): Line[] {
  const bodySize = Math.max(0, ...items.map((i) => i.size));
  const isSmall = (i: Item) => i.size < bodySize * 0.8;
  const sorted = [...items].sort((a, b) => Number(isSmall(a)) - Number(isSmall(b)) || a.y - b.y || a.x - b.x);

  const groups: { y: number; items: Item[] }[] = [];
  for (const item of sorted) {
    const reach = isSmall(item) ? 6 : tolerance;
    const group = groups.find((g) => Math.abs(g.y - item.y) <= reach);
    if (group) group.items.push(item);
    else groups.push({ y: item.y, items: [item] });
  }

  return groups
    .map((g) => {
      const lineItems = g.items.sort((a, b) => a.x - b.x);
      return { y: g.y, x: lineItems[0].x, end: Math.max(...lineItems.map((i) => i.x + i.w)), items: lineItems, text: squash(joinItems(lineItems)) };
    })
    .filter((l) => l.text)
    .sort((a, b) => a.y - b.y);
}

function joinItems(items: Item[], render: (i: Item) => string = (i) => i.str) {
  let out = "";
  items.forEach((item, i) => {
    const prev = items[i - 1];
    if (prev && item.x - (prev.x + prev.w) > 1.5 && !out.endsWith(" ") && !item.str.startsWith(" ")) out += " ";
    out += render(item);
  });
  return out;
}

/** Word sometimes leaves a second copy of a text run on top of the first. */
function dropOverlaps(items: Item[]) {
  const kept: Item[] = [];
  for (const item of items) {
    const overlaps = kept.some((k) => Math.abs(k.y - item.y) < 2 && item.x >= k.x - 1 && item.x < k.x + k.w - 1 && k.str.includes(item.str.trim()));
    if (!overlaps) kept.push(item);
  }
  return kept;
}

// ── Sections ─────────────────────────────────────────────────────────────────
const HEADINGS = /^(prayer ?burdens|fe ?llowship on material offering|church events|overseas conferences and training|announcements?|attendance)$/i;

type Heading = { key: string; page: number; y: number };

function findHeadings(pages: Page[]): Heading[] {
  const found: Heading[] = [];
  for (const page of pages) {
    for (const line of toLines(page.items.filter((i) => i.size >= 20))) {
      if (HEADINGS.test(line.text)) found.push({ key: line.text.toLowerCase().replace(/\s/g, ""), page: page.n, y: line.y });
    }
  }
  return found.sort((a, b) => a.page - b.page || a.y - b.y);
}

/** Everything between a heading and the next heading, across pages. */
function section(pages: Page[], headings: Heading[], key: RegExp): Section[] {
  const i = headings.findIndex((h) => key.test(h.key));
  if (i < 0) return [];
  const start = headings[i];
  const end = headings[i + 1];
  return pages
    .filter((p) => p.n >= start.page && (!end || p.n <= end.page))
    .map((page) => ({
      page,
      items: page.items.filter((it) => (page.n > start.page || it.y > start.y + 4) && (!end || page.n < end.page || it.y < end.y - 4)),
    }))
    .filter((s) => s.items.length);
}

// ── Date and message title ───────────────────────────────────────────────────
const MESSAGE = /\(Messages?\s*\d[^)]*\)/i;

function parseHeader(first: Page) {
  const lines = toLines(first.items.filter((i) => i.y < 170 && i.size >= 13));
  const dateMatch = lines
    .map((l) => l.text.match(new RegExp(`(\\d{1,2})(?:st|nd|rd|th)?\\s+${MONTH}\\s+(20\\d\\d)`, "i")))
    .find(Boolean);
  const date = dateMatch ? iso(Number(dateMatch[3]), dateMatch[2], dateMatch[1]) : null;

  const candidates = lines.map((l) => l.text.replace(/.*WEEKLY ANNOUNCEMENTS(\s+\d.*)?$/i, "").trim()).filter(Boolean);
  const main = candidates.find((t) => MESSAGE.test(t));
  if (!main) return { date, messageTitle: null };

  const message = main.match(MESSAGE)![0];
  const subtitle = candidates.filter((t) => t !== main).reduce((a, t) => (!a ? t : /\w-$/.test(a) ? a + t : `${a} ${t}`), "");
  const series = squash(main.replace(message, ""));
  return { date, messageTitle: squash(`${series}${subtitle ? `, ${subtitle}` : ""} ${message}`) };
}

// ── Prayer burdens → Markdown ────────────────────────────────────────────────
const SECTION_MARK = /^[❖❖]\s*/;
const BULLET = /^[••·▪◦-]\s*/;
const NUMBERED = /^(\d{1,2})\.\s+/;
const SUB_NUMBERED = /^(\d{1,2})\)\s+/;

const escapeMarkdown = (s: string) => s.replace(/([\\*_`])/g, "\\$1");

/** A line's text with **bold** and *italic* runs, after removing `skip` leading characters of its plain text. */
function styled(line: Line, skip = 0) {
  type Run = { text: string; bold: boolean; italic: boolean };
  const runs: Run[] = [];
  let remaining = skip;
  line.items.forEach((item, i) => {
    const prev = line.items[i - 1];
    const space = prev && item.x - (prev.x + prev.w) > 1.5 ? " " : "";
    let text = space + item.str;
    if (remaining > 0) {
      const trimmed = text.replace(/^\s+/, "");
      const cut = Math.min(remaining, trimmed.length);
      remaining -= cut;
      text = trimmed.slice(cut);
    }
    if (!text) return;
    const last = runs.at(-1);
    if (last && last.bold === item.bold && last.italic === item.italic) last.text += text;
    else runs.push({ text, bold: item.bold, italic: item.italic });
  });

  return runs
    .map(({ text, bold, italic }) => {
      const core = squash(text);
      if (!core) return " ";
      const lead = /^\s/.test(text) ? " " : "";
      const trail = /\s$/.test(text) ? " " : "";
      const wrap = bold && italic ? "***" : bold ? "**" : italic ? "*" : "";
      return `${lead}${wrap}${escapeMarkdown(core)}${wrap}${trail}`;
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

const isAllBold = (line: Line) => line.items.every((i) => i.bold || !/\w/.test(i.str));

/** Joins a wrapped line, closing and reopening nothing: adjacent bold runs are merged afterwards. */
const appendWrapped = (text: string, next: string) =>
  (/\w-$/.test(text) ? text + next : `${text} ${next}`).replace(/\*\*\s\*\*/g, " ").replace(/(?<!\*)\*\s\*(?!\*)/g, " ");

function prayerMarkdown(sections: Section[]) {
  type Block = { kind: "h2" | "h3" | "bullet" | "sub" | "p"; text: string };
  const blocks: Block[] = [];
  const headingYs = (items: Item[]) => toLines(items).filter((l) => SECTION_MARK.test(l.text));

  for (const { page, items } of sections) {
    const clean = dropOverlaps(items);
    const marks = headingYs(clean);
    const cuts = [-1, ...marks.map((m) => m.y), page.height];

    for (let c = 0; c < cuts.length - 1; c++) {
      const mark = marks.find((m) => m.y === cuts[c]);
      if (mark) blocks.push({ kind: "h2", text: squash(mark.text.replace(SECTION_MARK, "")) });

      const band = clean.filter((i) => i.y > cuts[c] + 3 && i.y < cuts[c + 1] - 3);
      const mid = page.width / 2;
      for (const column of [band.filter((i) => i.x < mid - 4), band.filter((i) => i.x >= mid - 4)]) {
        if (!column.length) continue;
        const right = Math.max(...column.map((i) => i.x + i.w));
        const left = Math.min(...column.map((i) => i.x));
        let prev: Line | null = null;
        let inHeading = false;

        for (const line of toLines(column)) {
          if (!/[\p{L}\p{N}]/u.test(line.text)) continue; // Stray punctuation from overlapping runs

          const gap = prev ? line.y - prev.y : 0;
          const prevWasFull = prev !== null && prev.end >= right - (right - left) * 0.2;
          const last = blocks.at(-1);
          const number = line.text.match(NUMBERED);
          const sub = line.text.match(SUB_NUMBERED);
          const bullet = line.text.match(BULLET);

          if (number) {
            const title = styled(line, number[0].trimEnd().length).replace(/\*\*/g, "");
            blocks.push({ kind: "h3", text: `${number[1]}. ${title}` });
            inHeading = isAllBold(line);
          } else if (sub) {
            blocks.push({ kind: "sub", text: `${sub[1]}. ${styled(line, sub[0].trimEnd().length)}` });
            inHeading = false;
          } else if (bullet) {
            blocks.push({ kind: "bullet", text: styled(line, bullet[0].trimEnd().length) });
            inHeading = false;
          } else if (inHeading && isAllBold(line) && last?.kind === "h3" && gap < 18) {
            last.text = `${last.text} ${squash(line.text)}`;
          } else if (last && last.kind !== "h2" && last.kind !== "h3" && gap < 16 && prevWasFull) {
            last.text = appendWrapped(last.text, styled(line));
            inHeading = false;
          } else {
            blocks.push({ kind: "p", text: styled(line) });
            inHeading = false;
          }
          prev = line;
        }
      }
    }
  }

  if (!blocks.length) return null;

  let out = "";
  blocks.forEach((b, i) => {
    const before = blocks[i - 1];
    const listItem = b.kind === "bullet" || b.kind === "sub";
    const tight = listItem && (before?.kind === "bullet" || before?.kind === "sub");
    if (i > 0) out += tight ? "\n" : "\n\n";
    if (b.kind === "h2") out += `## ${b.text}`;
    else if (b.kind === "h3") out += `### ${b.text}`;
    else if (b.kind === "bullet") out += `- ${b.text}`;
    else out += b.text;
  });
  return out;
}

// ── Announcements ────────────────────────────────────────────────────────────
const parseDay = (text: string, bulletinYear: number, bulletinMonth: number) => {
  const m = text.match(new RegExp(`(\\d{1,2})(?:st|nd|rd|th)?(?:\\s*(?:-|–|—|to|through|&|and)\\s*\\d{1,2}(?:st|nd|rd|th)?)?\\s+${MONTH}\\b(?:\\s+(20\\d\\d))?`, "i"));
  if (m) return datePart(m[1], m[2], m[3]);
  const range = text.match(new RegExp(`(\\d{1,2})(?:st|nd|rd|th)?\\s+${MONTH}\\s*(?:-|–|—|to)`, "i"));
  if (range) return datePart(range[1], range[2], text.match(/20\d\d/)?.[0]);
  return null;

  function datePart(day: string, month: string, year?: string) {
    if (year) return iso(Number(year), month, day);
    // No year given: the next time that month comes around after the bulletin.
    const monthIndex = MONTHS.indexOf(month.slice(0, 3).toLowerCase());
    return iso(monthIndex < bulletinMonth - 2 ? bulletinYear + 1 : bulletinYear, month, day);
  }
};

const FIELD = /^(date|time|venue|closing date|registration links?|faq|contact)\s*:/i;
const DEADLINE = new RegExp(`(?:closing date|registration closes?|deadline(?:\\s+for\\s+registration)?|latest by|regist\\w*[^.:]{0,60}?\\bby)\\s*:?\\s*(?:\\w+day,?\\s*)?(\\d{1,2}(?:st|nd|rd|th)?\\s+${MONTH}(?:\\s+20\\d\\d)?)`, "i");

type ItemLines = { page: Page; line: Line };

function parseAnnouncements(sections: Section[], bulletinDate: string | null, warnings: string[]) {
  const bulletinYear = Number(bulletinDate?.slice(0, 4)) || new Date().getFullYear();
  const bulletinMonth = Number(bulletinDate?.slice(5, 7)) - 1 || 0;

  const all = sections.flatMap(({ page, items }) => toLines(dropOverlaps(items)).map((line) => ({ page, line })));
  const firstNumbered = all.find(({ line }) => /^1\.\s/.test(line.text));
  if (!firstNumbered) return [];
  const margin = firstNumbered.line.x;
  const right = Math.max(...all.map(({ line }) => line.end));

  // Top-level items: the next number in sequence, at the left margin. Inner lists don't qualify.
  const groups: { number: number; lines: ItemLines[] }[] = [];
  for (const entry of all) {
    const m = entry.line.text.match(/^(\d{1,2})\.\s+\S/);
    const expected = (groups.at(-1)?.number ?? 0) + 1;
    if (m && Number(m[1]) === expected && Math.abs(entry.line.x - margin) < 6) groups.push({ number: expected, lines: [entry] });
    else groups.at(-1)?.lines.push(entry);
  }

  return groups.map(({ number, lines }): ParsedAnnouncement => {
    const texts = lines.map(({ line }, i) => (i === 0 ? line.text.replace(/^\d{1,2}\.\s+/, "") : line.text));

    // Title: a bold first line (plus any wrapped bold lines), or a short first line that isn't a
    // sentence, since some issues don't use bold. Otherwise the item is just a sentence.
    let titleLines = 0;
    if (isAllBold(lines[0].line)) {
      titleLines = 1;
      while (titleLines < lines.length && isAllBold(lines[titleLines].line) && !FIELD.test(texts[titleLines])) titleLines++;
    } else if (lines[0].line.end < right - 40 && !/[.!?]$/.test(texts[0])) {
      titleLines = 1;
    }
    const firstSentence = texts.join(" ").split(/(?<=[.!?])\s/)[0];
    const title = squash(titleLines ? texts.slice(0, titleLines).join(" ") : firstSentence).slice(0, 200);
    if (!titleLines) warnings.push(`Announcement ${number} has no bold title, so its first sentence was used.`);

    const bodyLines = lines.slice(titleLines);
    const bodyTexts = texts.slice(titleLines);
    let body = "";
    bodyLines.forEach(({ line, page }, i) => {
      const text = withHiddenLink(bodyTexts[i], line, page);
      const prev = bodyLines[i - 1]?.line;
      const wrapped = prev && prev.end >= right - 40 && !FIELD.test(text) && !BULLET.test(text) && !/^\d{1,2}[.)]\s/.test(text) && line.y > prev.y;
      if (!i) body = text;
      else if (wrapped) body = /\w-$/.test(body) ? body + text : `${body} ${text}`;
      else body += `\n${text}`;
    });

    const field = (re: RegExp) => texts.map((t) => t.match(re)?.[1]).find(Boolean);
    const dateText = field(/^date\s*:\s*(.*)$/i);
    const joined = texts.join(" ");
    const deadline = (field(/^closing date\s*:\s*(.*)$/i) ?? joined.match(DEADLINE)?.[1]) || null;

    return {
      title,
      body,
      date: dateText ? parseDay(dateText, bulletinYear, bulletinMonth) : null,
      register_by: deadline ? parseDay(deadline, bulletinYear, bulletinMonth) : null,
      registration_link: findRegistrationLink(lines),
    };
  });
}

/** Hyperlinks whose visible text isn't the URL ("click here") would otherwise be lost. */
function withHiddenLink(text: string, line: Line, page: Page) {
  const urls = page.links.filter((k) => line.y >= k.top - 2 && line.y <= k.bottom + 2).map((k) => k.url);
  const visible = text.toLowerCase().replace(/^https?:\/\//, "");
  const missing = urls.filter((u) => !visible.includes(u.toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "")));
  return missing.length && !/https?:|www\.|\.(com|cc|org|gle)\b/i.test(text) ? `${text} (${missing.join(" ")})` : text;
}

/** The link on a line mentioning registration, or the line right after one. */
function findRegistrationLink(lines: ItemLines[]) {
  for (let i = 0; i < lines.length; i++) {
    if (!/regist/i.test(lines[i].line.text)) continue;
    for (const { line, page } of lines.slice(i, i + 2)) {
      const link = page.links.find((k) => line.y >= k.top - 2 && line.y <= k.bottom + 2);
      const url = link?.url ?? line.text.match(/https?:\/\/\S+/)?.[0];
      if (url) return url;
    }
  }
  return null;
}

// ── Entry point ──────────────────────────────────────────────────────────────
export async function parseBulletin(data: Uint8Array): Promise<ParsedBulletin> {
  const task = getDocument({ data, verbosity: 0, fontExtraProperties: true });
  const pages: Page[] = [];
  try {
    const doc = await task.promise;
    for (let n = 1; n <= doc.numPages; n++) pages.push(await loadPage(doc, n));
  } finally {
    await task.destroy();
  }

  const warnings: string[] = [];
  const headings = findHeadings(pages);
  const { date, messageTitle } = parseHeader(pages[0]);
  const prayerBurdens = prayerMarkdown(section(pages, headings, /^prayerburdens$/));
  const announcements = parseAnnouncements(section(pages, headings, /^announcements?$/), date, warnings);

  if (!date) warnings.push("Couldn't find the bulletin date on the first page.");
  if (!messageTitle) warnings.push("Couldn't find the message title on the first page.");
  if (!prayerBurdens) warnings.push("Couldn't find the Prayer Burdens section.");
  if (!announcements.length) warnings.push("Couldn't find any announcements.");

  return { date, messageTitle, prayerBurdens, announcements, warnings };
}
