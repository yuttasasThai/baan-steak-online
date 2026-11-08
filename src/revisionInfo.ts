export interface RevisionRecord {
  version: string;
  revisionCode: string;
  buildTimestamp: string;
  formattedDateTh: string;
  description: string;
  features: string[];
}

export const CURRENT_REVISION: RevisionRecord = {
  version: '2.14.0',
  revisionCode: 'rev-2.14.0',
  buildTimestamp: new Date().toISOString(),
  formattedDateTh: new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Bangkok',
  }).format(new Date()),
  description: 'เวอร์ชัน 2.14.0: ปรับปรุงระบบพิมพ์ใบเสร็จความร้อน (Thermal POS 58mm/80mm), โลโก้และชื่อร้านกึ่งกลาง, วันที่เวลาพิมพ์เด่นชัด, ปรับ CSS ประหยัดกระดาษสลิป, พร้อมระบบช่วยแก้ปัญหาค้นหาเครื่องพิมพ์ไม่เจอ และ Direct Bluetooth / RawBT Printing',
  features: [
    '🖨️ จัดวางหัวใบเสร็จกึ่งกลาง: โลโก้และชื่อร้านจัดกึ่งกลางชัดเจน พร้อมแสดงวันที่และเวลาที่สั่งและเวลาที่พิมพ์ใบเสร็จเด่นชัด',
    '📜 ประหยัดกระดาษสลิป 35-50%: ปรับแต่ง CSS @media print ให้ย่อระยะห่าง ปรับขนาดฟอนต์ให้พอดี ไม่ล้นขอบ ไม่กินกระดาษม้วน',
    '📏 รองรับ 58mm และ 80mm: เลือกระยะความกว้างได้ทั้ง 58 มม. (เครื่องพกพา) และ 80 มม. (มาตรฐานเคาน์เตอร์ POS)',
    '🔍 ตัวช่วยแก้ปัญหาค้นหาเครื่องพิมพ์ไม่เจอ: มีคำแนะนำการตั้งค่า Android Print Service / Driver Windows พร้อมปุ่มพิมพ์ตรงผ่าน RawBT และคัดลอกข้อความ',
    '🔒 หน้าเว็บลูกค้า: ติดตามสถานะออเดอร์แสดงเฉพาะของเครื่องตัวเองเท่านั้น ไม่แสดงรายการออเดอร์รวมของคนอื่น',
    '🔊 ระบบเสียงเตือน: เมื่อออเดอร์ใหม่เข้า จะพูดไล่รายการอาหารและจำนวนทั้งหมดให้เชฟทราบ และเมื่อกดรับแล้ว ขั้นตอนต่อๆ ไปจะพูดเฉพาะสถานะออเดอร์',
    '🥤 หมวดหมู่เครื่องดื่ม & สั่งอาหารเพิ่ม: เมนูเครื่องดื่มครบถ้วน ลูกค้าและแอดมินสามารถคีย์เพิ่มรายการอาหารในบิลเดิมได้ตลอดเวลา',
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
