# Scene ZIP inbox

Upload returned scene archives here, such as EP-IMG-001.zip or EP-IMG-001-a.zip. Keep each ZIP below20MiB and retain the original PNG filenames and REPORT.json.

The application/import tools are already on main. Run the manual `Receive reviewed scene ZIP` workflow from main, with zip_path `uploads/EP-IMG-001.zip` and its task_id. Leave apply_reviewed:false for staging only; true requires complete per-cell source-hash reviews and saves a review branch.

Do not merge media-inbox wholesale into main: it stores original ZIPs only. The workflow fetches only the named archive. Alternatively download the ZIPs into incoming/scene-zips locally and run `python scripts/import-scene-inbox.py --apply`, then `npm run check`.

See main: handoff/web-20261103/00-START-HERE.md and 02-RECEIVE-AND-GITHUB.md. All runtime atlases end as WebP1536x2048. Sources are PNG3:4; the9 single-cell repairs are square1024x1024. No automatic lesson-publication claim.
