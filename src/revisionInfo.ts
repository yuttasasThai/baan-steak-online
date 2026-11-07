export interface RevisionRecord {
  version: string;
  revisionCode: string;
  buildTimestamp: string;
  formattedDateTh: string;
  description: string;
  features: string[];
}

export const CURRENT_REVISION: RevisionRecord = {
  version: '2.13.0',
  revisionCode: 'rev-2.13.0',
  buildTimestamp: new Date().toISOString(),
  formattedDateTh: new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Bangkok',
  }).format(new Date()),
  description: 'เวอร์ชัน 2.13.0: แยกติดตามสถานะออเดอร์เฉพาะบุคคล, เสียงเตือนไล่รายการอาหารตอนออเดอร์เข้า, เพิ่มหมวดเครื่องดื่ม, ลูกค้าและแอดมินสั่งอาหารเพิ่มได้, และคืนระบบทานที่ร้านแบบกรอกหรือไม่กรอกข้อมูลก็ได้พร้อมจองโต๊ะอัตโนมัติเมื่อสแกน QR',
  features: [
    '🔒 หน้าเว็บลูกค้า: ติดตามสถานะออเดอร์แสดงเฉพาะของเครื่องตัวเองเท่านั้น ไม่แสดงรายการออเดอร์รวมของคนอื่น พร้อมปุ่มซ่อน/ล้างประวัติ',
    '🔊 ระบบเสียงเตือน: เมื่อออเดอร์ใหม่เข้า จะพูดไล่รายการอาหารและจำนวนทั้งหมดให้เชฟทราบ และเมื่อกดรับแล้ว ขั้นตอนต่อๆ ไปจะพูดเฉพาะสถานะออเดอร์',
    '🥤 หมวดหมู่เครื่องดื่ม: เพิ่มหมวด "เครื่องดื่ม" พร้อมเมนูเครื่องดื่มเริ่มต้น (น้ำเปล่า, โค้ก/เป๊ปซี่, ชามะนาว, ชาเขียว, น้ำส้ม) ในระบบจัดการเมนู',
    '➕ สั่งอาหารเพิ่มเติม: ลูกค้าสามารถกดสั่งอาหาร/เครื่องดื่มเพิ่มในออเดอร์เดิมจากหน้าติดตามสถานะ และแอดมินมีปุ่ม "➕ คีย์ออเดอร์ใหม่ (POS)" รวมถึงปุ่ม "➕ เพิ่มรายการอาหาร" ในบิลเดิม',
    '🍽️ ทานที่ร้าน & จองโต๊ะอัตโนมัติ: นำตัวเลือก "มาทานที่ร้าน" คืนมาในหน้าสั่งอาหาร ช่องชื่อ/เบอร์/เลขโต๊ะจะใส่หรือไม่ใส่ก็ได้ และหากสแกน QR Code ประจำโต๊ะ ระบบจะจองโต๊ะและระบุเลขโต๊ะให้อัตโนมัติทันที',
    '🖨️ ระบบพิมพ์บิล POS 80mm/58mm และคัดลอกส่ง LINE พร้อมใช้งานครบถ้วนสมบูรณ์',
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
