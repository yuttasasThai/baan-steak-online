export interface RevisionRecord {
  version: string;
  revisionCode: string;
  buildTimestamp: string;
  formattedDateTh: string;
  description: string;
  features: string[];
}

export const CURRENT_REVISION: RevisionRecord = {
  version: '2.16.0',
  revisionCode: 'rev-2.16.0',
  buildTimestamp: new Date().toISOString(),
  formattedDateTh: new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Bangkok',
  }).format(new Date()),
  description: 'เวอร์ชัน 2.16.0: แก้ไขระบบตรวจจับสถานะบลูทูธเครื่องพิมพ์ PT210 ให้ตรงตามจริง (ปิดเครื่องจะแสดงสถานะตัดการเชื่อมต่อทันที ไม่ขึ้นต่อสำเร็จหลอก), เพิ่มปุ่มหลัก "ส่งไปแอป POS Printer" เพื่อเลี่ยงหน้าค้นหาค้างของ Android Print Spooler, และรองรับการพิมพ์ตรงผ่านบลูทูธ (Web Bluetooth ESC/POS)',
  features: [
    '🟢 ตรวจจับสถานะบลูทูธสดตามจริง (Live GATT Tracking): ปิดสวิตช์เครื่องพิมพ์ PT210 ระบบจะตัดการเชื่อมต่อทันที ไม่แสดงสถานะเชื่อมต่อสำเร็จหลอก',
    '📲 ปุ่มหลัก "ส่งไปแอป POS Printer (แนะนำ)": กดปุ่มเดียวส่งข้อมูลบิลตรงเข้าแอป POS Printer ที่มีในเครื่องมือถือได้ทันที 100% พิมพ์ออกจาก PT210 ไม่ต้องพึ่ง Android Print Spooler',
    '📶 พิมพ์ตรงผ่านบลูทูธ (Web Bluetooth ESC/POS): สั่งพิมพ์ตรงเข้าเครื่องพิมพ์ PT210 ผ่าน Web Bluetooth โดยไม่ต้องเปิดแอปภายนอก',
    '⚠️ แยกปุ่มพิมพ์มาตรฐาน Android Print Spooler: มีป้ายเตือนชัดเจนสำหรับผู้ที่ไม่มี Print Service เพื่อไม่ให้ติดหน้า "กำลังค้นหาเครื่องพิมพ์"',
    '🛍️ สั่งกลับบ้าน (Takeaway) & ทานที่ร้าน: ช่องพิมพ์ชื่อและเบอร์โทรศัพท์เป็นแบบ "ไม่ใส่ก็ได้" ทั้งในหน้าเว็บลูกค้าและระบบแอดมิน POS',
    '🔊 ระบบเสียงเตือนอัตโนมัติ: พูดไล่รายการอาหารและจำนวนทั้งหมดเมื่อมีออเดอร์ใหม่เข้า และพูดเฉพาะสถานะเมื่อกดรับแล้ว',
    '📄 เอกสารใบเสร็จสะอาดตา: แก้ปัญหาใบเสร็จถูกตัดขอบบน Android ได้อย่างสมบูรณ์แบบ',
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
