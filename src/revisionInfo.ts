export interface RevisionRecord {
  version: string;
  revisionCode: string;
  buildTimestamp: string;
  formattedDateTh: string;
  description: string;
  features: string[];
}

export const CURRENT_REVISION: RevisionRecord = {
  version: '2.4.0',
  revisionCode: 'rev-2.4.0',
  buildTimestamp: new Date().toISOString(),
  formattedDateTh: new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Bangkok',
  }).format(new Date()),
  description: 'เวอร์ชัน 2.4.0: เพิ่มปุ่ม Admin สำหรับร้านค้า พร้อมระบบกรอกรหัส PIN แบบซ่อนตัวเลข (Masked PIN) และแป้นพิมพ์ตัวเลขนิรภัย',
  features: [
    'ปุ่มเข้าสู่ระบบ Admin ทั้งบนแถบนำทางด้านบน (Header) และท้ายหน้าเว็บลูกค้า (Footer)',
    'ระบบกรอกรหัส PIN (0850451606) แบบ Masked Dots 10 จุด ซ่อนตัวเลขทั้งหมดเวลาพิมพ์ ปลอดภัย 100%',
    'แป้นพิมพ์ตัวเลข On-Screen Keypad กดได้ทันทีบนมือถือ ป้องกันคีย์บอร์ดระบบแสดงพรีวิวตัวเลข',
    'ไม่เปิดเผยรหัสผ่านในข้อความแจ้งเตือนหรือคำใบ้ใดๆ เพื่อความปลอดภัยสูงสุดของทางร้าน',
    'ระบบสร้างลิงก์ Admin และ ลิงก์สำหรับลูกค้า (User Link) แยกตามเบอร์โต๊ะ (Table QR) หรือเดลิเวอรี่',
    'ระบบ Real-Time Menu Sync จาก Firestore อัปเดตรายการอาหารและราคาถึงจอลูกค้าทันที',
    'ระบบดาวน์โหลด Source Code ZIP กำกับชื่อไฟล์ baan-steak-source-rev-2.4.0-YYYYMMDD-HHmm.zip',
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
