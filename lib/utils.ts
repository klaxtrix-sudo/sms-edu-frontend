import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Nigerian grading scale A1 – F9 */
export function calculateGrade(score: number): { grade: string; remark: string } {
  if (score >= 75) return { grade: 'A1', remark: 'Excellent' };
  if (score >= 70) return { grade: 'B2', remark: 'Very Good' };
  if (score >= 65) return { grade: 'B3', remark: 'Good' };
  if (score >= 60) return { grade: 'C4', remark: 'Credit' };
  if (score >= 55) return { grade: 'C5', remark: 'Credit' };
  if (score >= 50) return { grade: 'C6', remark: 'Credit' };
  if (score >= 45) return { grade: 'D7', remark: 'Pass' };
  if (score >= 40) return { grade: 'E8', remark: 'Pass' };
  return { grade: 'F9', remark: 'Fail' };
}

/** Format currency to NGN */
export function formatNGN(amount: number): string {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
}

/** Seeded shuffle for deterministic exam randomisation */
export function seededShuffle<T>(arr: T[], seed: string): T[] {
  const result = [...arr];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (Math.imul(31, hash) + seed.charCodeAt(i)) | 0;
  }
  for (let i = result.length - 1; i > 0; i--) {
    hash = (Math.imul(hash, 1664525) + 1013904223) | 0;
    const j = Math.abs(hash) % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** Get backend API URL with fallback */
export function getBackendUrl(): string {
  const url = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
  const cleanUrl = url.endsWith('/') ? url.slice(0, -1) : url;
  return cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl}/api`;
}

/**
 * Compresses an image file client-side using HTML5 Canvas to ensure fast uploads
 * and compact Base64 payloads.
 */
export function compressImageToBase64(
  file: File,
  maxWidth = 800,
  maxHeight = 800,
  quality = 0.82
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const outputFormat = file.type === 'image/png' ? 'image/png' : 'image/webp';
        resolve(canvas.toDataURL(outputFormat, quality));
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}
