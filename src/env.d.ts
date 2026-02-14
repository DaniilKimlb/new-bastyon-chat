/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BASE_URL: string;
  readonly VITE_DEFAULT_PRIVATEKEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
