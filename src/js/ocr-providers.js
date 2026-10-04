export function normalizePaddleOcrResult(result) {
  if (!result || !Array.isArray(result.items) || result.items.some(item => !item || typeof item.text !== 'string')) {
    throw new Error('Invalid PaddleOCR result: expected an items array with text strings');
  }
  return result.items.map(item => item.text).filter(Boolean).join('\n');
}
