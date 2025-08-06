import { gzip, gunzip } from 'zlib';
import { promisify } from 'util';

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

/**
 * Compress data using gzip for efficient storage
 */
export async function compressData(data: any): Promise<Buffer> {
  try {
    const jsonString = JSON.stringify(data);
    const compressed = await gzipAsync(Buffer.from(jsonString, 'utf8'));
    return compressed;
  } catch (error) {
    console.error('Failed to compress data:', error);
    throw new Error('Failed to compress data');
  }
}

/**
 * Decompress data using gunzip
 */
export async function decompressData(compressedData: Buffer): Promise<any> {
  try {
    const decompressed = await gunzipAsync(compressedData);
    const jsonString = decompressed.toString('utf8');
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Failed to decompress data:', error);
    throw new Error('Failed to decompress data');
  }
}

/**
 * Get compression ratio (original size / compressed size)
 */
export function getCompressionRatio(originalSize: number, compressedSize: number): number {
  return originalSize / compressedSize;
}

/**
 * Estimate storage savings from compression
 */
export function estimateStorageSavings(originalSize: number, compressedSize: number): {
  savedBytes: number;
  savedPercentage: number;
} {
  const savedBytes = originalSize - compressedSize;
  const savedPercentage = (savedBytes / originalSize) * 100;
  
  return {
    savedBytes,
    savedPercentage
  };
} 