export interface FileVerificationResult {
  fileName: string;
  fileSizeBytes: number;
  sha256Hex: string;
  calculatedAt: string;
}

export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

/**
 * Valida que el archivo no supere el límite máximo de 25 MB
 */
export function validateFileSize(file: File): { valid: boolean; error?: string; sizeFormatted: string } {
  const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      sizeFormatted: `${sizeMb} MB`,
      error: `El archivo supera el límite máximo permitido de 25 MB (tamaño actual: ${sizeMb} MB). Para procesar archivos de gran volumen, por favor verifique o divida el extracto contable antes de cargarlo.`,
    };
  }
  return {
    valid: true,
    sizeFormatted: file.size < 1024 * 1024 ? `${(file.size / 1024).toFixed(0)} KB` : `${sizeMb} MB`,
  };
}

/**
 * Calcula el Hash SHA-256 de un archivo usando la Web Crypto API nativa.
 * Funciona de manera idéntica en navegadores y en Node.js 18+.
 */
export async function computeFileSHA256(file: { name: string; size: number; arrayBuffer: () => Promise<ArrayBuffer> }): Promise<FileVerificationResult> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error('Cómputo criptográfico SHA-256 no soportado (Web Crypto API no disponible en globalThis.crypto.subtle).');
  }

  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const sha256Hex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

  return {
    fileName: file.name,
    fileSizeBytes: file.size,
    sha256Hex,
    calculatedAt: new Date().toISOString(),
  };
}
