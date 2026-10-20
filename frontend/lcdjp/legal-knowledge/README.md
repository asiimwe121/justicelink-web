# legal-knowledge

The legal document library the AI assistant answers from. Put the files here and restart the backend.

## What to put here
- Official legal texts you are allowed to use, for example the Constitution of Uganda, Acts, regulations,
  court-procedure guides and plain-language legal aid guides.
- Formats the app reads: `.pdf` (with real, selectable text), `.docx` and `.txt`. Other file types are ignored.
- Subfolders are fine. Use clear file names, for example `constitution-of-uganda-1995.pdf`.
- A scanned PDF (a photo of pages with no selectable text) is not indexed. It is counted as "requiring OCR".
  Use a text version of the document, or run OCR on it first.

## How it gets indexed
- On every backend start the app scans this folder and indexes new or changed files. Files that have not
  changed are skipped. The result is logged: `N discovered, N indexed, N skipped (unchanged), ...`.
- To re-scan without restarting, call `POST /api/admin/legal-knowledge/ingest` as an admin.
- docker-compose mounts this folder read-only at `/app/legal-knowledge`. To keep the documents somewhere
  else on the server, set `LEGAL_KNOWLEDGE_DIR_HOST=/path/to/folder` in `.env`.

## Check it worked
`docker compose logs lcdjp-app | grep -i "legal-knowledge ingestion finished"` should show a non-zero
"indexed" count after the first start with documents in place.
