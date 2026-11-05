/// <reference types="vite/client" />
interface ImportMetaEnv {
  /** Base URL of the PetClinic REST API. Defaults to the Vite dev-server proxy path. */
  readonly VITE_API_BASE?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
