// ---------------------------------------------------------------------------
// Ambient declarations for the qrcode package (no @types/qrcode available)
// ---------------------------------------------------------------------------

declare module "qrcode" {
  interface QRCodeToDataURLOptions {
    width?: number | undefined;
    margin?: number | undefined;
    type?: "image/png" | "image/webp" | undefined;
    color?: {
      dark?: string | undefined;
      light?: string | undefined;
    } | undefined;
  }

  interface QRCode {
    toDataURL(
      text: string,
      options?: QRCodeToDataURLOptions,
    ): Promise<string>;
  }

  const QRCode: QRCode;
  export default QRCode;
}
