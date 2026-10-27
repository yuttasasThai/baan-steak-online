export interface RevisionRecord {
  version: string;
  revisionCode: string;
  buildTimestamp: string;
  formattedDateTh: string;
  description: string;
  features: string[];
}

export const CURRENT_REVISION: RevisionRecord = {
  version: '2.6.0',
  revisionCode: 'rev-2.6.0',
  buildTimestamp: new Date().toISOString(),
  formattedDateTh: new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Bangkok',
  }).format(new Date()),
  description: 'เวอร์ชัน 2.6.0: เพิ่มระบบลบประวัติออเดอร์และเคลียร์ออเดอร์ทดลองสำหรับ Admin เพื่อเตรียมเปิดร้านจริง 100% พร้อมรีเซ็ตแต้มสะสมลูกค้า',
  features: [
    'ปุ่มลบประวัติ / เคลียร์ออเดอร์ทดลอง ในหน้า Admin เท่านั้น (ลูกค้าไม่เห็น)',
    'เลือกขอบเขตการลบได้ 3 รูปแบบ: ลบทั้งหมด (เริ่มร้านใหม่), ลบเฉพาะออเดอร์ค้าง (Active), หรือลบเฉพาะประวัติเก่า (ส่งแล้ว/ยกเลิก)',
    'ตัวเลือกรีเซ็ตแต้มสะสมและประวัติการสั่งของลูกค้าทดสอบให้เริ่มนับใหม่ตั้งแต่ 0',
    'ปุ่มลบออเดอร์ทีละรายการ (Delete Single Order) ในตารางและหน้ารายละเอียด',
    'กล่องยืนยันการลบแบบปลอดภัย ป้องกันการกดผิดพลาดโดยไม่ตั้งใจ',
    'ระบบจัดการโต๊ะอาหารสำหรับทานที่ร้าน (กำหนดจำนวนโต๊ะ/แจ้งโต๊ะว่าง-เต็มแบบเรียลไทม์)',
    'ระบบเปลี่ยนรูปภาพเมนูอาหารได้จริง 100%',
    'ระบบดาวน์โหลดเฉพาะไฟล์ที่แก้ไข (Patch ZIP ~60KB) สำหรับอัปเดตบนมือถือ',
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
