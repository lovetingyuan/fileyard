/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BUILD_TIME: string;
  readonly VITE_GIT_HASH: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
