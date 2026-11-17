export interface RevisionRecord {
  version: string;
  revisionCode: string;
  buildTimestamp: string;
  formattedDateTh: string;
  description: string;
  features: string[];
}

export const CURRENT_REVISION: RevisionRecord = {
  version: '2.28.1',
  revisionCode: 'rev-2.28.1',
  buildTimestamp: new Date().toISOString(),
  formattedDateTh: new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Bangkok',
  }).format(new Date()),
  description: 'เวอร์ชัน 2.28.1: แก้ไขช่องแก้ไขยอดรวมสุทธิในหน้าต่างเช็คบิล (CheckBillModal) ไม่ให้ล้นขอบจอมือถือ + ปรับ min-w-0 ทุกหน้าต่าง Popup ให้พอดีจอ 100% (rev-2.28.1)',
  features: [
    '💰 แก้ไขช่อง "แก้ไขยอดรวมสุทธิล่าสุด (บาท)" ในหน้าต่างเช็คบิลให้พอดีขอบจอมือถือ ไม่ทะลุขอบขวา',
    '📱 เสริม min-w-0 และ overflow-x-hidden ในหน้าต่างเช็คบิล, จัดการโต๊ะ, อัปเดตสถานะ และเปิดบิล POS',
    '🎯 ครบทุกฟีเจอร์จาก v2.28.0 (ซ่อนรายการ/ยอดหน้าติดตามลูกค้า + รีเซ็ตวันใหม่ + ไอคอนวงกลม + แผงโต๊ะเรียลไทม์)',
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
