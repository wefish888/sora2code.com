/// <reference path="../.astro/types.d.ts" />
/// <reference types="@cloudflare/workers-types" />

interface ImportMetaEnv {
  readonly API_BASE_URL: string;
  readonly ENVIRONMENT: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}