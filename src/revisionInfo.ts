export interface RevisionRecord {
  version: string;
  revisionCode: string;
  buildTimestamp: string;
  formattedDateTh: string;
  description: string;
  features: string[];
}

export const CURRENT_REVISION: RevisionRecord = {
  version: '2.10.0',
  revisionCode: 'rev-2.10.0',
  buildTimestamp: new Date().toISOString(),
  formattedDateTh: new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Bangkok',
  }).format(new Date()),
  description: 'เวอร์ชัน 2.10.0: ซ่อนรหัส PIN จุดดำ, แจ้งเตือนเสียงและ Chrome Notification ข้ามแท็บ, เคลียร์ข้อมูลลูกค้าหลังสั่ง, แก้ไขเมนูเดิมได้โดยไม่ต้องสร้างใหม่',
  features: [
    'ซ่อนรหัส PIN ในช่องพิมพ์ด้วยจุดดำ (••••••••••) ป้องกันผู้อื่นมองเห็นรหัส',
    'ระบบเสียงแจ้งเตือนข้ามแท็บ Google Chrome (HTML5 Audio + Web Notification + ชื่อแท็บบน Chrome กะพริบแจ้งเตือน)',
    'ล้างชื่อและเบอร์โทรลูกค้าในช่องพิมพ์ทันทีหลังสั่งอาหารสำเร็จ เพื่อป้องกันชื่อซ้ำกับคนก่อนหน้า',
    'หน้าแอดมินแก้ไขชื่อ, ราคา, และรูปภาพเมนูเดิมได้ทันที บันทึกทับเมนูเดิมโดยไม่ต้องสร้างเมนูใหม่',
    'หน้าต่างใหม่เด้งเตือนออเดอร์เข้า พร้อมเสียงพูดจริงภาษาไทย "มีออเดอร์เข้า โต๊ะ..." เตือนวนจนกว่าจะกดรับ',
    'ปุ่มขนาดใหญ่ "✅ กดรับออเดอร์ทันที (เริ่มทำอาหาร)" พร้อมเปลี่ยนสถานะเป็น "กำลังทำ"',
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
