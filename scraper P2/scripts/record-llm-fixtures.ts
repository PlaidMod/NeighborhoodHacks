// Records the Step 5 golden fixtures for llm_extract (live, read-only GETs through http.ts):
//   npx tsx scripts/record-llm-fixtures.ts [case-dir ...]   (no args: everything; with args: only those PDF cases)
// Index pages are saved as HTML. PDFs are NOT saved when over 1 MB: only the extracted text
// (pages joined with \f) and a meta.json with the PDF's sha256, size and text-layer stats.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PDF_TIMEOUT_MS, getBytes, getText } from '@/lib/adapters/http';
import { getPdfText } from '@/lib/adapters/pdfText';

const ROOT = join('tests', 'golden', 'llm-extract');
const MAX_PDF_BYTES = 1_000_000;

const INDEXES = [
  { file: 'lonestar-index.html', url: 'https://www.lonestar.edu/board-agendas' },
  { file: 'mud489-index.html', url: 'https://hcmud489.com/board-meetings/' },
];

export const PDF_CASES = [
  {
    dir: 'lonestar-2026-10-01',
    url: 'https://www.lonestar.edu/departments/chancellor/October%201,%202026%20Agenda_Final%20(Website).pdf',
  },
  {
    dir: 'mud489-2026-10-19',
    url: 'https://hcmud489.com/static/dfaef0088dbe419a94dafac34a137a29/Agenda_October_19_2026_HCMUD_489_5b93c39b1d.pdf',
  },
  {
    dir: 'mud489-2026-04-09',
    url: 'https://hcmud489.com/static/5b87b10d3d899ec343e89ef87e8b282a/Special_Agenda_April_9_2026_HCMUD_489_c838005a4d.pdf',
  },
  // Step 10 (results from minutes): agenda + minutes pairs.
  {
    dir: 'mud489-2026-07-20',
    url: 'https://hcmud489.com/static/19f8a932b738fc5822ec226f1113e2ad/HARRIS_COUNTY_MUNICIPAL_UTILITY_DISTRICT_NO_489_NOTICE_OF_PUBLIC_MEETING_AGENDA_July_20_2026_85fe68f8c7.pdf',
  },
  {
    dir: 'minutes/mud489-2026-07-20',
    url: 'https://hcmud489.com/static/883cda3da805283827c29cbdb02ac063/Minutes_July_20_2026_Approved_HCMUD_489_66d4a09dee.pdf',
  },
  {
    dir: 'mud489-2026-05-19',
    url: 'https://hcmud489.com/static/8783b138fc56e3a5e911ee1d44d7f22d/Agenda_May_19_2026_HCMUD_489_b4c754368b.pdf',
  },
  {
    dir: 'minutes/mud489-2026-05-18',
    url: 'https://hcmud489.com/static/56b37e417edc8cc40026cff0c498895d/Minutes_May_18_2026_Approved_HCMUD_489_e276bfac9d.pdf',
  },
];

async function main() {
  const only = process.argv.slice(2);
  if (only.length === 0) {
    mkdirSync(join(ROOT, 'discovery'), { recursive: true });
    for (const ix of INDEXES) writeFileSync(join(ROOT, 'discovery', ix.file), await getText(ix.url));
  }
  for (const c of PDF_CASES.filter((x) => only.length === 0 || only.includes(x.dir))) {
    const bytes = await getBytes(c.url, { timeoutMs: PDF_TIMEOUT_MS });
    const t = await getPdfText(bytes);
    const dir = join(ROOT, c.dir);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'source.txt'), t.text);
    if (bytes.length < MAX_PDF_BYTES) writeFileSync(join(dir, 'source.pdf'), bytes);
    const meta = {
      url: c.url,
      pdf_sha256: t.sha256,
      pdf_bytes: bytes.length,
      pdf_committed: bytes.length < MAX_PDF_BYTES,
      pages: t.pages.length,
      has_text_layer: t.has_text_layer,
      avg_chars_per_page: t.avg_chars_per_page,
      text_page_ratio: t.text_page_ratio,
      recorded_at: new Date().toISOString(),
    };
    writeFileSync(join(dir, 'meta.json'), JSON.stringify(meta, null, 2) + '\n');
    console.log(c.dir, JSON.stringify(meta));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
