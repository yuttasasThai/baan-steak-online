export interface RevisionRecord {
  version: string;
  revisionCode: string;
  buildTimestamp: string;
  formattedDateTh: string;
  description: string;
  features: string[];
}

export const CURRENT_REVISION: RevisionRecord = {
  version: '2.23.0',
  revisionCode: 'rev-2.23.0',
  buildTimestamp: new Date().toISOString(),
  formattedDateTh: new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Bangkok',
  }).format(new Date()),
  description: 'เวอร์ชัน 2.23.0: เพิ่มเวลาเปิดร้าน 17.00-21.00 (สั่งล่วงหน้าก่อนได้) และวันหยุดร้าน (ทุกวันอังคาร และ วันเสาร์) บนป้ายสถานะร้านใต้หน้าปก + ปรับป๊อบอัพสรุปยอดขายรายวันเป็นตาราง Excel พร้อมปุ่มส่งออก CSV',
  features: [
    '🕒 ป้ายสถานะร้านใต้หน้าปกแสดงข้อความ "ร้านเปิด 17.00-21.00 (สั่งล่วงหน้าก่อนได้)" เมื่อเปิดร้าน และ "ร้านหยุดทุกวันอังคาร และ วันเสาร์" เมื่อปิดร้าน',
    '📊 ป๊อบอัพสรุปยอดขายรายวันในหน้าวิเคราะห์ยอดขายแสดงเป็นตาราง Excel ดูง่ายครบทุกคอลัมน์ในจอเดียว พร้อมแถว SUM รวมและส่งออกไฟล์ .csv',
    '🏷️ แสดงตัวเลขเวอร์ชันเล็กๆ ที่มุมขวาล่างภาพหน้าปกหน้าเว็บลูกค้า',
    '💰 สถานะ "เช็คบิล" เสียงแจ้งเตือน + คืนสถานะโต๊ะว่างเรียลไทม์',
    '➕ ปุ่ม "สั่งอาหารเพิ่ม" ในรายการออเดอร์ที่สั่งไปแล้ว ทั้งฝั่งลูกค้าและแอดมิน',
    '📒 หน้าบันทึกต้นทุนเมนู + ตารางรายจ่ายประจำวันแบบ Excel คำนวณ กำไร = ยอดขายรวม - (ต้นทุนรวม + รายจ่ายประจำวัน)',
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
