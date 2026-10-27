/**
 * Image compressor utility using browser HTML5 Canvas.
 * Resizes large smartphone camera photos (e.g. 5-15MB) down to optimized,
 * crisp images (~80KB - 200KB) that load instantly and never breach Firestore / localStorage quotas.
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  mimeType?: string;
}

export async function compressImageFile(
  file: File,
  options: CompressionOptions = {}
): Promise<{ dataUrl: string; sizeBytes: number; width: number; height: number }> {
  const {
    maxWidth = 1600,
    maxHeight = 900,
    quality = 0.82,
    mimeType = 'image/jpeg',
  } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์รูปภาพได้'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('รูปภาพไม่ถูกต้องหรือไม่สามารถเปิดได้'));
      img.onload = () => {
        let { width, height } = img;

        // Calculate proportional scale
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('ไม่สามารถประมวลผล Canvas ได้'));
          return;
        }

        // High quality rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL(mimeType, quality);
        const approxBytes = Math.round((dataUrl.length * 3) / 4);

        resolve({
          dataUrl,
          sizeBytes: approxBytes,
          width,
          height,
        });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Upload compressed base64 image to server API
 * Returns the public URL, e.g. `/uploads/hero_17283921.jpg`
 */
export async function uploadImageToServer(
  dataUrl: string,
  type: 'hero' | 'menu' = 'hero'
): Promise<string> {
  const endpoint = type === 'hero' ? '/api/upload-hero' : '/api/upload-image';

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageBase64: dataUrl,
        prefix: type,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.url) {
        return data.url;
      }
    }
  } catch (err) {
    console.warn('Backend upload server unreachable, falling back to compressed data URL:', err);
  }

  // Fallback: If backend is unreachable, the compressed dataUrl (< 180KB) can be stored directly
  return dataUrl;
}
