export type SupportedEncoding = 'utf-8' | 'utf-16le' | 'utf-16be' | 'windows-1258' | 'windows-1252'

export interface EncodingDetectionResult {
  encoding: SupportedEncoding
  hasBom: boolean
  cleanText: string
}

/**
 * Strips BOM and detects text encoding
 */
export function detectAndStripBom(rawText: string): EncodingDetectionResult {
  // UTF-8 BOM
  if (rawText.charCodeAt(0) === 0xfeff) {
    return {
      encoding: 'utf-8',
      hasBom: true,
      cleanText: rawText.slice(1),
    }
  }

  // UTF-16 BE BOM
  if (rawText.charCodeAt(0) === 0xfffe) {
    return {
      encoding: 'utf-16be',
      hasBom: true,
      cleanText: rawText.slice(1),
    }
  }

  return {
    encoding: 'utf-8',
    hasBom: false,
    cleanText: rawText,
  }
}
