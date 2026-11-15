import steakMoo from '../assets/images/steak_moo_1791353856229.jpg';
import steakGai from '../assets/images/steak_gai_1791353798435.jpg';
import saladGai from '../assets/images/salad_gai_1791353810767.jpg';
import kiaoNam from '../assets/images/kiao_nam_1791353821099.jpg';
import kiaoThod from '../assets/images/kiao_thod_1791353830468.jpg';

export const BUNDLED_MENU_IMAGES: Record<string, string> = {
  สเต็กหมู: steakMoo,
  สเต็กไก่: steakGai,
  สลัดไก่: saladGai,
  เกี๊ยวน้ำหมูสับ: kiaoNam,
  เกี๊ยวหมูสับทอด: kiaoThod,
};

export const DEFAULT_FALLBACK_IMAGE = steakMoo;

/**
 * Resolves menu image URL to guarantee it never appears broken on published site.
 * 1. Checks if it's already a valid base64 data URL
 * 2. Checks if it's an external http/https URL
 * 3. Maps known file paths or filenames to bundled Vite assets
 * 4. Falls back to matching by menu name
 * 5. Ultimate fallback to default steakMoo asset
 */
export function resolveMenuImageUrl(url?: string | null, menuName?: string): string {
  // If it's a base64 data URL, return directly (stored permanently in Firestore)
  if (url && url.startsWith('data:image/')) {
    return url;
  }

  // If it's an external HTTPS URL (e.g. Firebase Storage, Cloudinary, etc.)
  if (url && (url.startsWith('https://') || url.startsWith('http://'))) {
    return url;
  }

  // Match by known filename in URL
  if (url) {
    const lower = url.toLowerCase();
    if (lower.includes('steak_moo')) return steakMoo;
    if (lower.includes('steak_gai')) return steakGai;
    if (lower.includes('salad_gai')) return saladGai;
    if (lower.includes('kiao_nam')) return kiaoNam;
    if (lower.includes('kiao_thod')) return kiaoThod;
  }

  // Match by menu name
  if (menuName) {
    const trimmed = menuName.trim();
    if (BUNDLED_MENU_IMAGES[trimmed]) {
      return BUNDLED_MENU_IMAGES[trimmed];
    }
    // Partial matches
    if (trimmed.includes('สเต็กหมู')) return steakMoo;
    if (trimmed.includes('สเต็กไก่')) return steakGai;
    if (trimmed.includes('สลัด')) return saladGai;
    if (trimmed.includes('เกี๊ยวน้ำ')) return kiaoNam;
    if (trimmed.includes('เกี๊ยว') && trimmed.includes('ทอด')) return kiaoThod;
  }

  // Default fallback
  return DEFAULT_FALLBACK_IMAGE;
}
