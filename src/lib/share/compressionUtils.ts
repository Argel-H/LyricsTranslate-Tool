import brotliInit from "brotli-wasm";
import type { BrotliWasmType } from "brotli-wasm";

// Cached Brotli WASM instance (initialized on first use)
let brotliWasm: BrotliWasmType | null = null;

async function ensureBrotli(): Promise<BrotliWasmType> {
  if (!brotliWasm) {
    brotliWasm = await brotliInit;
  }
  return brotliWasm;
}

/**
 * Compress an ArrayBuffer using the Brotli algorithm (WASM).
 * Falls back to deflate if brotli-wasm fails.
 *
 * @param buffer - The raw data to compress.
 * @returns A promise that resolves to the Brotli-compressed ArrayBuffer.
 */
export async function brotliCompress(buffer: ArrayBuffer): Promise<ArrayBuffer> {
  try {
    const brotli = await ensureBrotli();
    const input = new Uint8Array(buffer);
    const compressed = brotli.compress(input, { quality: 11 });
    // Copy into a fresh ArrayBuffer to avoid SharedArrayBuffer type issues
    return new Uint8Array(compressed).slice(0, compressed.byteLength).buffer;
  } catch {
    // Fallback to deflate
    return deflateCompress(buffer);
  }
}

/**
 * Decompress an ArrayBuffer that was compressed with Brotli (WASM).
 *
 * @param buffer - The Brotli-compressed data to decompress.
 * @returns A promise that resolves to the decompressed ArrayBuffer.
 * @throws If Brotli decompression fails.
 */
export async function brotliDecompress(buffer: ArrayBuffer): Promise<ArrayBuffer> {
  const brotli = await ensureBrotli();
  const input = new Uint8Array(buffer);
  const decompressed = brotli.decompress(input);
  // Copy into a fresh ArrayBuffer to avoid SharedArrayBuffer type issues
  return new Uint8Array(decompressed).slice(0, decompressed.byteLength).buffer;
}

/**
 * Compress an ArrayBuffer using the Deflate algorithm via the browser's
 * CompressionStream API.
 *
 * @param buffer - The raw data to compress.
 * @returns A promise that resolves to the deflate-compressed ArrayBuffer.
 * @throws {Error} If the CompressionStream API is not supported.
 */
export async function deflateCompress(buffer: ArrayBuffer): Promise<ArrayBuffer> {
  if (typeof CompressionStream === 'undefined') {
    throw new Error(
      'CompressionStream API is not supported in this environment. ' +
        'Deflate compression is unavailable.',
    );
  }

  const input = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(buffer));
      controller.close();
    },
  });

  const compressed = input.pipeThrough(new CompressionStream('deflate-raw'));
  const reader = compressed.getReader();
  const chunks: Uint8Array[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result.buffer;
}

/**
 * Decompress an ArrayBuffer that was compressed with Deflate using the
 * browser's DecompressionStream API.
 *
 * @param buffer - The deflate-compressed data to decompress.
 * @returns A promise that resolves to the decompressed ArrayBuffer.
 * @throws {Error} If the DecompressionStream API is not supported.
 */
export async function inflateDecompress(buffer: ArrayBuffer): Promise<ArrayBuffer> {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error(
      'DecompressionStream API is not supported in this environment. ' +
        'Deflate decompression is unavailable.',
    );
  }

  const input = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(buffer));
      controller.close();
    },
  });

  const decompressed = input.pipeThrough(new DecompressionStream('deflate-raw'));
  const reader = decompressed.getReader();
  const chunks: Uint8Array[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result.buffer;
}
