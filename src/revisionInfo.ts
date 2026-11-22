export interface RevisionRecord {
  version: string;
  revisionCode: string;
  buildTimestamp: string;
  formattedDateTh: string;
  description: string;
  features: string[];
}

export const CURRENT_REVISION: RevisionRecord = {
  version: '2.28.8',
  revisionCode: 'rev-2.28.8',
  buildTimestamp: new Date().toISOString(),
  formattedDateTh: new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Bangkok',
  }).format(new Date()),
  description: 'เวอร์ชัน 2.28.8: เพิ่มการยกเลิกรายการอาหารกรณีของหมดกระทันหัน (พร้อมปิดเมนูอัตโนมัติและแจ้งเตือนลูกค้า) + ระบบเวลาทำอาหารและจับเวลาความเร็วครัว (SLA) (rev-2.28.8)',
  features: [
    '🚫 ยกเลิกเฉพาะบางรายการอาหารเมื่อของหมดกระทันหัน: หักยอดบิลอัตโนมัติ คงประวัติขีดฆ่า ฿0 ปิดเมนูหน้าร้านได้ในคลิกเดียว และแจ้งลูกค้าแบบเรียลไทม์',
    '⏱️ ระบบเวลาทำอาหาร & ความเร็วครัว (Service Speed SLA): ตั้งเวลารายเมนู/ร้าน ดูแถบความเร็วครัววันนี้ ปุ่มปรับเวลา +2/-2 นาที และเวลาเตรียมโดยประมาณฝั่งลูกค้า',
    '🔒 ครบทุกความปลอดภัยและการกรองช่วงวันที่จาก v2.28.6 - v2.28.7',
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
