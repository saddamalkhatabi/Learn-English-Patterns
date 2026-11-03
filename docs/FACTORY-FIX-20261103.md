# Audio factory migration check

The first audio run41553266413 stopped at an obsolete dist/assets/audio path guard. No synthesized work was lost. The factory now consistently uses public/. A local isolated two-voice test passed exact recording validation, staging and merge, without importing Torch or downloading models. Only the media-tools branch, its recovery bundle and this factory note changed; the Node runtime baseline is unchanged. The factory commit is recorded in FACTORY.json.
