export interface RevisionRecord {
  version: string;
  revisionCode: string;
  buildTimestamp: string;
  formattedDateTh: string;
  description: string;
  features: string[];
}

export const CURRENT_REVISION: RevisionRecord = {
  version: '2.12.0',
  revisionCode: 'rev-2.12.0',
  buildTimestamp: new Date().toISOString(),
  formattedDateTh: new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Bangkok',
  }).format(new Date()),
  description: 'เวอร์ชัน 2.12.0: เพิ่มฟังก์ชันพิมพ์ใบเสร็จออเดอร์ (Print Bill) พร้อมปุ่มพิมพ์บิลในทุกรายการออเดอร์ รองรับเครื่องพิมพ์ความร้อน POS 80mm/58mm และคัดลอกส่ง LINE',
  features: [
    '🖨️ เพิ่มปุ่ม "พิมพ์บิล" ในทุกรายการออเดอร์ในหน้าจัดการออเดอร์ (AdminOrdersManager) ทั้งออเดอร์ที่ค้างอยู่, ส่งแล้ว, และยกเลิก',
    '🧾 หน้าต่างพรีวิวใบเสร็จความร้อน POS (OrderReceiptModal) ปรับขนาด 80mm (มาตรฐาน POS) / 58mm (สลิปเล็ก) / เต็มหน้าจอ',
    '📄 รองรับการพิมพ์จริงผ่านคำสั่ง Print ของเบราว์เซอร์ พร้อมสไตล์ @media print เฉพาะใบเสร็จคมชัด ไม่ติดส่วนอื่นของหน้าเว็บ',
    '📋 ปุ่มคัดลอกข้อความบิล (Copy Bill Text) สำหรับส่งข้อความสรุปออเดอร์ให้ลูกค้าหรือไรเดอร์ทาง LINE ได้ทันทีในคลิกเดียว',
    '🚨 เพิ่มปุ่ม "พิมพ์บิล" ในหน้าต่างเด้งออเดอร์ใหม่ (IncomingOrderModal) สำหรับพิมพ์ใบสั่งอาหารเข้าครัวได้ทันที',
    '🔊 คงระบบเสียงเตือนสถานะออเดอร์แต่ละขั้นตอนตามเทมเพลต และแถบติดตามสดแบบเรียลไทม์ครบถ้วน',
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
