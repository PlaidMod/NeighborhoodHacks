# Manual agenda entries (D12)

Hand-entered meetings for sources that cannot be scraped. The `manual` adapter
(`lib/adapters/manual.ts`) reads every `data/manual/{body_id}/{YYYY-MM-DD}-{slug}.yaml` and runs the
items through the same amounts, redaction and hashing steps as scraped items.

- Copy the shape of `_example/2026-10-28-format-example.yaml`. Directories (and files) starting with
  `_` are skipped, so the example is never loaded.
- Required: `meeting.body_id` (must equal the directory name), `meeting.date` (ISO 8601 with time and
  offset), `meeting.agenda_url`, and for each item `title` and `source_url`. A missing or invalid
  field is reported with the file name and line.
- Optional meeting fields: `type`, `status`, `end_date`, `video_url`, `minutes_url`,
  `comment_rules_text`. Optional item fields: `agenda_number`, `section`, `description`,
  `matter_type`, `action`, `vote_result`, `attachments` (`{name, url}`).
- URLs must be official sources: news domains are rejected (D24).
- `is_demo: true` marks the team's fake demo data (D18). Do not add demo data here until the team
  decides to.
- `external_id = sha1('manual' + file path + agenda_number or title)`; renaming a file changes its IDs.
