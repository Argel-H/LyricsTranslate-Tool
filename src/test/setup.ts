import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock brotli-wasm to prevent live network fetch during WASM initialization.
// Makes compress/decompress throw so compressionUtils falls back to the
// deterministic deflate path (CompressionStream API) used in all tests.
vi.mock("brotli-wasm", () => ({
  default: Promise.resolve({
    compress: () => { throw new Error("brotli mock fallback to deflate"); },
    decompress: () => { throw new Error("brotli mock fallback to deflate"); },
  }),
}));
