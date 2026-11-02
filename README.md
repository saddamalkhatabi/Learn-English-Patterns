# English Patterns media factory

This independent branch contains small production tools, not the Node application or installed libraries/model weights.

The main branch's workflow checks out this branch under `.media-tools` and sets `PATTERNS_ROOT` to the main checkout. Run `python .media-tools/scripts/production_matrix.py` to validate reviewed plan hashes and identify only missing/invalid recordings.

Audio: Kokoro 0.9.4, male am_adam, female af_bella. Each encoded MP3 is decoded and independently aligned with Wav2Vec2 CTC. Exact text, SHA-256, decoded PCM duration and monotonic word cues are required. Existing valid assets are reused. Partial successful outputs survive a failed job. The workflow preserves verified media in a production/run-ID branch; promotion is a separate step.

Images are generated through the image-generation tool outside this runtime. Geometry helpers use standard Python plus FFmpeg only; they do not require Torch. Preserve a reviewed 3×4 grid, maximum1536×2048, per-cell geometry and source provenance. Raw generation output or the selected atlas can be used as an editing reference; never fabricate a missing approved scene.

Do not install audio dependencies on the user's PC merely to run the Node app. GitHub Actions installs them on its runner. Full workflow and continuation instructions are in main/HANDOFF.md.
