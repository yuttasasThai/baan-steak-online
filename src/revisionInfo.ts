export interface RevisionRecord {
  version: string;
  revisionCode: string;
  buildTimestamp: string;
  formattedDateTh: string;
  description: string;
  features: string[];
}

export const CURRENT_REVISION: RevisionRecord = {
  version: '2.7.0',
  revisionCode: 'rev-2.7.0',
  buildTimestamp: new Date().toISOString(),
  formattedDateTh: new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Bangkok',
  }).format(new Date()),
  description: 'เวอร์ชัน 2.7.0: ระบบเสียงพูดจริง "มีออเดอร์เข้า" + สแกน QR Code ตามเลขโต๊ะ สั่งอัตโนมัติ และเปลี่ยนสถานะโต๊ะว่าง/ไม่ว่างอัตโนมัติ + QR รับกลับบ้าน',
  features: [
    'เสียงพูดจริงภาษาไทย "มีออเดอร์เข้า" (ไฟล์ MP3 คุณภาพสูง + เสียงพูดบอกเลขโต๊ะ) พร้อมปุ่มทดสอบเสียงพูด',
    'ระบบสแกน QR Code ประจำโต๊ะอาหาร: ลูกค้าสแกนปุ๊บ ระบบล็อคเลขโต๊ะให้อัตโนมัติ ส่งตรงถึงครัวทันที',
    'ระบบเปลี่ยนสถานะโต๊ะเป็น "ไม่ว่าง" (🔴) อัตโนมัติทันทีหลังจากลูกค้ากดยืนยันการสั่งอาหาร',
    'ปุ่มคืนสถานะ "โต๊ะว่าง" (🟢) ในการ์ดออเดอร์แต่ละโต๊ะและในหน้าจัดการโต๊ะอาหาร',
    'QR Code สั่งกลับบ้าน / นัดรับอาหารที่ร้าน (Pickup) ให้ลูกค้าสแกนสั่งล่วงหน้าฟรีค่าจัดส่ง',
    'ระบบพิมพ์การ์ดตั้งโต๊ะ (Print Table Cards) สวยงามขนาดกะทัดรัด พร้อมพิมพ์เดี่ยวหรือพิมพ์ทุกโต๊ะพร้อมกัน',
    'ระบบลบประวัติออเดอร์ทดลองและรีเซ็ตแต้มสะสมสำหรับ Admin',
    'ระบบจัดการโต๊ะอาหารในร้าน (กำหนดจำนวน 1-50 โต๊ะ พร้อมสถานะว่าง/เต็มเรียลไทม์)',
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
