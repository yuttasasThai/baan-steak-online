export interface RevisionRecord {
  version: string;
  revisionCode: string;
  buildTimestamp: string;
  formattedDateTh: string;
  description: string;
  features: string[];
}

export const CURRENT_REVISION: RevisionRecord = {
  version: '2.26.1',
  revisionCode: 'rev-2.26.1',
  buildTimestamp: new Date().toISOString(),
  formattedDateTh: new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Bangkok',
  }).format(new Date()),
  description: 'เวอร์ชัน 2.26.1: เพิ่ม Log ตรวจสอบย้อนหลังใน subscribeMenus เพื่อระบุเวลาที่อ่านจาก Firestore (Server/Cache), การเปลี่ยนแปลงแบบเรียลไทม์, และแหล่งที่มาผู้สร้างเมนู (createdBy/เวอร์ชัน/โฮสต์) พร้อมตรวจจับเมนูผิดปกติอัตโนมัติ',
  features: [
    '🔎 เพิ่ม Forensic Log ใน subscribeMenus แสดงเวลาที่อ่านจาก Firestore, แหล่งข้อมูล (firestore-server/local-cache) และ docChanges()',
    '🧬 บันทึกข้อมูลผู้สร้าง/แหล่งที่มา (createdBy, updatedBy, createdSourceAppVersion, createdHost) ทุกครั้งที่เพิ่มหรือแก้ไขเมนู',
    '🚨 ตรวจจับและแจ้งเตือนใน Console ([subscribeMenus][ANOMALY]) ทันทีเมื่อพบเมนูรหัสตัวอย่างเดิมหรือเมนูที่ไม่มีข้อมูลผู้สร้าง',
    '🛡️ ป้องกันเมนูเก่าและเมนูน้ำหวานแทรกซ้ำถาวร + ล็อคสิทธิ์ใน firestore.rules + ปุ่มลบเมนูตัวอย่างใน 1 คลิก',
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
