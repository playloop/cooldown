interface ImportMetaEnv {
  /** The game's Playloop ingest key, set in .env.local. Write-only, so it is safe in the bundle. */
  readonly VITE_PLAYLOOP_INGEST_KEY?: string;
}

/** package.json's version, put in at build time by vite.config.ts. */
declare const __BUILD_VERSION__: string;
