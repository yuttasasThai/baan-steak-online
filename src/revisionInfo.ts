export interface RevisionRecord {
  version: string;
  revisionCode: string;
  buildTimestamp: string;
  formattedDateTh: string;
  description: string;
  features: string[];
}

export const CURRENT_REVISION: RevisionRecord = {
  version: '2.19.0',
  revisionCode: 'rev-2.19.0',
  buildTimestamp: new Date().toISOString(),
  formattedDateTh: new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Bangkok',
  }).format(new Date()),
  description: 'เวอร์ชัน 2.19.0: รวมระบบบริการแจ้งเตือน Webhook และ LINE Notify ในหน้าตั้งค่าร้านค้า (AdminShopSettings) ส่งข้อความแจ้งเตือนเข้าแชทหรือกลุ่ม LINE ของร้านทันทีเมื่อมีออเดอร์ใหม่เข้า พร้อมปุ่มกดทดสอบส่งการแจ้งเตือน',
  features: [
    '🔔 บริการแจ้งเตือนผ่าน LINE Notify: แจ้งเตือนเข้ากลุ่ม LINE ของร้านทันทีที่มีออเดอร์ใหม่เข้า ระบุเลขที่ออเดอร์ ชื่อลูกค้า โต๊ะ/ที่อยู่ รายการอาหาร ยอดรวม และเวลาสั่งซื้อครบถ้วน',
    '🌐 รองรับ Webhook ทางเลือกเสริม: สามารถส่งต่อข้อมูลออเดอร์เข้า Discord, Telegram bot, Make, Zapier, n8n หรือ Google Sheet ได้ทันที',
    '🧪 ปุ่มทดสอบส่งแจ้งเตือนในคลิกเดียว: ตรวจสอบความถูกต้องของ Token หรือ Webhook ได้ทันทีก่อนเปิดใช้งานจริง',
    '🥩 จัดเรียงเมนูตามหมวดหมู่และราคา: สเต็ก -> สลัด -> ของทานเล่น -> เครื่องดื่ม เรียงจากราคาถูกไปแพง (สเต็กไก่ 59บ. ก่อน สเต็กหมู 69บ.)',
    '🔊 เสียงเตือนออเดอร์แม่นยำตามเงื่อนไข: ลูกค้าระบุแค่โต๊ะ แจ้ง "โต๊ะที่ [X]" / ลูกค้าระบุโต๊ะและชื่อ แจ้ง "โต๊ะที่ [X] คุณ [ชื่อ]"',
    '🇹🇭 พิมพ์บลูทูธภาษาไทยคมชัด 100%: ESC/POS Raster Bitmap 384 จุด/48mm',
  ],
};

export function getRevisionFileName(revCode = CURRENT_REVISION.revisionCode): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const timeStamp = `${year}${month}${day}-${hours}${minutes}`;

  const cleanRev = revCode.replace(/[^a-zA-Z0-9.-]/g, '');
  return `baan-steak-source-${cleanRev}-${timeStamp}.zip`;
}
