==========================================================
คู่มืออัปเดตสำหรับโทรศัพท์ Android (rev-2.12.0)
ร้าน บ้าน สเต็กออนไลน์ (Baan Steak Online)
Repository: https://github.com/yuttasasThai/baan-steak-online
==========================================================

✨ ไฟล์นี้สร้างขึ้นจากเบราว์เซอร์โดยตรง (Client-Side In-Memory ZIP)
รับประกันว่าเป็นไฟล์ .zip แท้ 100% ไม่ใช่ .html

ไฟล์ที่ได้รับการแก้ไขใน rev-2.12.0:
1. [src/components] OrderReceiptModal.tsx - 🖨️ เพิ่มหน้าต่างพิมพ์ใบเสร็จออเดอร์ (Print Bill) รองรับเครื่องพิมพ์ความร้อน POS 80mm/58mm และคัดลอกส่ง LINE
2. [src/components] AdminOrdersManager.tsx - เพิ่มปุ่ม "พิมพ์บิล" ในทุกรายการออเดอร์ (ค้างอยู่, ส่งแล้ว, ยกเลิก) และในหน้าต่างดูรายละเอียด
3. [src/components] IncomingOrderModal.tsx - 🚨 เพิ่มปุ่ม "พิมพ์บิล" ในหน้าต่างเด้งออเดอร์ใหม่ พร้อมสถานะเรียลไทม์ รับออเดอร์/กำลังทำ/ส่งออเดอร์
4. [src/utils] audioAlert.ts - 🔊 ระบบเสียงพูดเตือนสถานะออเดอร์ทุกขั้นตอน: "ออเดอร์ของ (โต๊ะที่.../คุณ... ทานที่ร้าน/กลับบ้าน/ส่งที่บ้าน) + สถานะออเดอร์"
5. [src/components] CustomerWebsite.tsx - ⚡ แสดงสถานะออเดอร์เรียลไทม์ฝั่งลูกค้า พร้อมแอนิเมชัน 4 สเต็ป (รับออเดอร์ -> กำลังทำ -> ส่งออเดอร์ -> ส่งแล้ว)
6. [src] App.tsx - ⭐ เพิ่มปุ่ม "หน้าต่างออเดอร์ (N)" บนแถบ Header + ซิงก์เสียงเตือนทุกขั้นตอน
7. [src/components] AdminOrdersManager.tsx - เชื่อมต่อเสียงเตือน playOrderStatusAlert ในทุกการเปลี่ยนสถานะและยกเลิกออเดอร์
8. [/] package.json - ⚡ ล็อกเวอร์ชัน tailwind 4.3.4 (แก้ npm error notarget @tailwindcss/oxide 4.3.5 บน Vercel)
9. [src] types.ts - เพิ่มสถานะ ส่งออเดอร์ ใน OrderStatus union
10. [src/services] menuService.ts - อัปเดต normalizeOrderStatus และ NEXT_ORDER_STATUS_MAP รองรับ ส่งออเดอร์
11. [src] revisionInfo.ts - บันทึกหมายเลขเวอร์ชัน 2.11.0 และสรุปรายการอัปเดตระบบ
12. [src] types.ts - โครงสร้างข้อมูล TypeScript: TableItem, OrderStatus, OrderFilterStatus
13. [src/components] AdminSourceCodeExporter.tsx - หน้าจอตัวช่วยดาวน์โหลดโค้ด และปุ่มคัดลอกโค้ดไปวางบน GitHub สำหรับ Android

วิธีอัปเดตผ่านโทรศัพท์ Android:
1. แตกไฟล์ ZIP นี้ในแอป "ไฟล์ (Files)" ของเครื่องมือถือ
2. เปิด GitHub ในมือถือ ไปที่คลัง baan-steak-online
3. เข้าโฟลเดอร์ src/ -> เลือกโฟลเดอร์ย่อย -> กด Add file -> Upload files
4. เลือกไฟล์แล้วกด Commit changes
5. Vercel จะ Deploy อัตโนมัติใน 30 วินาที!
==========================================================