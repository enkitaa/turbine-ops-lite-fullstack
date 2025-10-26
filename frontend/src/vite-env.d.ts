/// <reference types="vite/client" />

declare module "vite/client" {
  interface ImportMetaEnv {
    readonly VITE_API_BASE: string;
  }
}
