export interface RevisionRecord {
  version: string;
  revisionCode: string;
  buildTimestamp: string;
  formattedDateTh: string;
  description: string;
  features: string[];
}

export const CURRENT_REVISION: RevisionRecord = {
  version: '2.17.0',
  revisionCode: 'rev-2.17.0',
  buildTimestamp: new Date().toISOString(),
  formattedDateTh: new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Bangkok',
  }).format(new Date()),
  description: 'เวอร์ชัน 2.17.0: แก้ไขปัญหาพิมพ์ออกมาเป็นภาษาจีน โดยเปลี่ยนระบบพิมพ์บลูทูธเป็นการส่งข้อมูลภาพกราฟิกขาวดำ (Raster Bitmap GS v 0 ที่ 384 จุด/48 มม.) ทำให้พิมพ์ภาษาไทยคมชัด 100% วรรณยุกต์และสระครบถ้วน ไม่เป็นภาษาจีนอีกต่อไป พร้อมชี้แจงมาตรฐานกระดาษ 58mm (พื้นที่พิมพ์จริง 48mm)',
  features: [
    '🇹🇭 แก้ปัญหาพิมพ์ภาษาจีนเป็นภาษาไทย 100%: ใช้คำสั่ง ESC/POS Raster Bitmap (GS v 0) วาดใบเสร็จเป็นรูปภาพขาวดำ 384 จุด (48mm) พิมพ์ภาษาไทยออกมาคมชัดสวยงาม ไม่ขึ้นตัวอักษรจีนหรือตัวเหลี่ยมดำ',
    '📏 ความเข้าใจเรื่องขนาดกระดาษ: ม้วนกระดาษความร้อนกว้าง 58 มม. มีพื้นที่หัวพิมพ์ความร้อนจริง 48 มม. (384 จุด) ถูกต้องตามมาตรฐานสากล',
    '📶 พิมพ์ตรงบลูทูธเสถียร: ส่งข้อมูลแบบ Chunk 128 ไบต์ พร้อมหน่วงเวลาไหลลื่น ป้องกัน Buffer Overflow ของเครื่อง PT210',
    '🟢 ตรวจจับสถานะบลูทูธตามจริง: ปิดเครื่อง PT210 ระบบจะตัดการเชื่อมต่อทันที ไม่ขึ้นสถานะหลอก',
    '📲 ปุ่มแชร์เข้าแอป POS Printer: รองรับการส่งข้อความบิลเข้าแอปภายนอกได้รวดเร็ว',
    '🛍️ สั่งกลับบ้าน (Takeaway) & ทานที่ร้าน: ช่องพิมพ์ชื่อและเบอร์โทรศัพท์เป็นแบบไม่บังคับใส่',
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
