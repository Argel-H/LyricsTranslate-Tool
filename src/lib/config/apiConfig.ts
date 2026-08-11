const WORKER_URL = "https://subs-tool-endpoints.iamargelh.mov";

export const API = {
  /** LRCLIB - lyrics search stays client-side. */
  lrclib: "https://lrclib.net",

  /** Worker: full metadata orchestrator (MB + Deezer + Odesli + social links). */
  metadataFull: `${WORKER_URL}/metadata/full`,

  /** Worker: share paste create/retrieve. */
  share: `${WORKER_URL}/share`,

  /** Worker base URL for generic proxy needs. */
  proxy: WORKER_URL,
} as const;
