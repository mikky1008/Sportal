/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the Sportal API (server/index.ts), e.g. https://api.example.com */
  readonly VITE_API_URL?: string;
  /** Optional AI video-analysis service (see ai/README in the original project) */
  readonly VITE_AI_API_URL?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
