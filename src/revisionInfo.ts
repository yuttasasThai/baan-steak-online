export interface RevisionRecord {
  version: string;
  revisionCode: string;
  buildTimestamp: string;
  formattedDateTh: string;
  description: string;
  features: string[];
}

export const CURRENT_REVISION: RevisionRecord = {
  version: '2.15.0',
  revisionCode: 'rev-2.15.0',
  buildTimestamp: new Date().toISOString(),
  formattedDateTh: new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Bangkok',
  }).format(new Date()),
  description: 'เวอร์ชัน 2.15.0: เพิ่มระบบค้นหาและเชื่อมต่อเครื่องพิมพ์บลูทูธ (Bluetooth POS PT210 58mm/384 จุด) ตามแอป POS printer, แก้ไขใบเสร็จถูกตัดขอบบน Android Print Spooler ให้แสดงผลครบถ้วน 100%, เพิ่มรูปแบบการสั่ง "สั่งกลับบ้าน" ไม่บังคับใส่ชื่อ/เบอร์, และอัปเดตไฟล์แพ็กเกจเป็น v2.15.0',
  features: [
    '📶 ค้นหาเครื่องพิมพ์บลูทูธ (Bluetooth POS Scanner): หน้าค้นหาและตั้งค่าเครื่องพิมพ์สไตล์แอป POS printer รองรับ PT210 (384 จุด/บรรทัด, 58mm) พร้อมปุ่มแชร์ส่งตรงเข้าแอป POS Printer',
    '📄 แก้ปัญหาใบเสร็จไม่ครบ / โดนตัดขอบ (Image 3 Fix): ใช้ระบบพิมพ์แยกเอกสารเฉพาะตัวใบเสร็จ แก้ไขปัญหา Android Print Spooler ครอบตัดเหลือแค่กล่องเล็กๆ แสดงผลเต็มแผ่นสวยงาม',
    '🛍️ เพิ่มรูปแบบ "สั่งกลับบ้าน" (Takeaway): รองรับทั้งหน้าเว็บลูกค้าและระบบแอดมิน โดยช่องพิมพ์ชื่อและเบอร์โทร "ไม่บังคับใส่"',
    '🍽️ นำ "ทานที่ร้าน" คืนมา: สแกน QR Code เข้าโต๊ะอัตโนมัติ โดยช่องพิมพ์ชื่อและเบอร์โทรไม่บังคับใส่เช่นกัน',
    '🔒 หน้าเว็บลูกค้า: ติดตามสถานะออเดอร์แสดงเฉพาะของเครื่องตัวเองเท่านั้น ไม่แสดงรายการออเดอร์รวมของคนอื่น',
    '🔊 ระบบเสียงเตือน: เมื่อออเดอร์ใหม่เข้า จะพูดไล่รายการอาหารและจำนวนทั้งหมดให้เชฟทราบ และเมื่อกดรับแล้ว ขั้นตอนต่อๆ ไปจะพูดเฉพาะสถานะออเดอร์',
    '🥤 เมนูเครื่องดื่ม & สั่งอาหารเพิ่ม: เมนูเครื่องดื่มครบถ้วน ลูกค้าและแอดมินสามารถคีย์เพิ่มรายการอาหารในบิลเดิมได้ตลอดเวลา',
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
