import { extractText, getDocumentProxy } from 'unpdf';
import { documentContentHash } from '@/lib/ingest/hash';

// PDF text-layer extraction (agent-scraper-spec §8 Step 5, D6).

/** Page separator used when pages are joined into one string (stored as `documents.raw`). */
export const PAGE_BREAK = '\f';

export type PdfText = {
  pages: string[];
  /** Pages joined with PAGE_BREAK. This is the exact text the LLM sees and the quote check runs on. */
  text: string;
  /** D6: false means the document is treated as scanned. */
  has_text_layer: boolean;
  avg_chars_per_page: number;
  /** Share of pages with more than 50 non-whitespace characters. */
  text_page_ratio: number;
  /** sha256 of the PDF bytes. */
  sha256: string;
};

export const MIN_AVG_CHARS = 200;
export const MIN_PAGE_CHARS = 50;
export const MIN_TEXT_PAGE_RATIO = 0.6;

/** D6 rule: >= 200 non-whitespace chars per page on average AND >= 60% of pages with > 50 chars. */
export function textLayerStats(pages: string[]): Pick<PdfText, 'has_text_layer' | 'avg_chars_per_page' | 'text_page_ratio'> {
  const counts = pages.map((p) => p.replace(/\s/g, '').length);
  const n = Math.max(pages.length, 1);
  const avg = counts.reduce((a, b) => a + b, 0) / n;
  const ratio = counts.filter((c) => c > MIN_PAGE_CHARS).length / n;
  return {
    has_text_layer: pages.length > 0 && avg >= MIN_AVG_CHARS && ratio >= MIN_TEXT_PAGE_RATIO,
    avg_chars_per_page: Math.round(avg),
    text_page_ratio: Math.round(ratio * 1000) / 1000,
  };
}

export function pdfTextFromPages(pages: string[], sha256: string): PdfText {
  return { pages, text: pages.join(PAGE_BREAK), sha256, ...textLayerStats(pages) };
}

/** Split stored text back into pages. */
export const splitPages = (text: string) => text.split(PAGE_BREAK);

/** Extract per-page text with unpdf. */
export async function getPdfText(bytes: Uint8Array): Promise<PdfText> {
  const sha = documentContentHash(bytes);
  // pdf.js may detach the buffer it is given; pass a copy so callers keep their bytes.
  const pdf = await getDocumentProxy(new Uint8Array(bytes));
  const { text } = await extractText(pdf, { mergePages: false });
  return pdfTextFromPages(text, sha);
}
