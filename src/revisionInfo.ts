export interface RevisionRecord {
  version: string;
  revisionCode: string;
  buildTimestamp: string;
  formattedDateTh: string;
  description: string;
  features: string[];
}

export const CURRENT_REVISION: RevisionRecord = {
  version: '2.21.0',
  revisionCode: 'rev-2.21.0',
  buildTimestamp: new Date().toISOString(),
  formattedDateTh: new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Bangkok',
  }).format(new Date()),
  description: 'เวอร์ชัน 2.21.0: ยกระดับความปลอดภัยของระบบเข้าสู่ระบบ Admin โดยไม่แสดงรหัส PIN บนหน้าจอ นำปุ่มทางลัดใส่รหัสออก และปิดการเปิดเผยรหัสในข้อความแจ้งเตือน เพื่อความปลอดภัยและความเป็นส่วนตัวสูงสุดของร้านค้า',
  features: [
    '🔒 ซ่อนรหัส PIN แอดมินในการเข้าสู่ระบบ: นำกล่องข้อความแสดงรหัสผ่านและปุ่มกดใส่รหัสอัตโนมัติออกจากหน้าต่าง Login เพื่อไม่ให้ผู้อื่นมองเห็นรหัสของร้าน',
    '🛡️ ปรับข้อความเตือนเมื่อกรอกรหัสผิด: แจ้งเตือนว่า "รหัส PIN ไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง" โดยไม่เปิดเผยรหัสเริ่มต้น',
    '🟢 LINE Official Account (Messaging API): แจ้งเตือนออเดอร์เข้าบัญชี LINE OA ร้าน หรือส่งเข้า User ID / Group ID โดยตรง ทดแทน LINE Notify ที่ยุติบริการ 31 มี.ค. 2568',
    '🟣 Universal Webhook (Discord / Telegram / Make): ส่งแจ้งเตือนฟรีไม่จำกัด 100% เสียงเตือนเข้าแอป Discord มือถือได้ 24 ชั่วโมง',
    '🥩 จัดเรียงเมนูตามหมวดหมู่และราคา: สเต็ก -> สลัด -> ของทานเล่น -> เครื่องดื่ม เรียงจากราคาถูกไปแพง',
    '🔊 ระบบเสียงเตือนออเดอร์: แยกกรณีระบุแค่โต๊ะ ("โต๊ะที่ X") และระบุชื่อพร้อมโต๊ะ ("โต๊ะที่ X คุณ...")',
    '🇹🇭 เครื่องพิมพ์บลูทูธความร้อน PT210: ภาษาไทยคมชัด 100% ESC/POS 384 จุด/48mm',
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
