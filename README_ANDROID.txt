==========================================================
คู่มืออัปเดตสำหรับโทรศัพท์ Android (rev-2.28.4)
ร้าน บ้าน สเต็กออนไลน์ (Baan Steak Online)
Repository: https://github.com/yuttasasThai/baan-steak-online
==========================================================

✨ ไฟล์นี้สร้างขึ้นจากเบราว์เซอร์โดยตรง (Client-Side In-Memory ZIP)
รับประกันว่าเป็นไฟล์ .zip แท้ 100% ไม่ใช่ .html

ไฟล์ที่ได้รับการแก้ไขใน rev-2.28.4:
1. [src/services] menuService.ts - 🔒 (อัปเดต v2.28.4) ใช้ Firestore Transaction ล็อกสถานะรายเมนูห้ามย้อนกลับ + ขยับสถานะออเดอร์หลักตามแต่ละรายการทันที
2. [src/components] OrderStatusModal.tsx - 🎯 (อัปเดต v2.28.4) ปิดปุ่มย้อนกลับอย่างเข้มงวด + แสดงสถานะออเดอร์หลักที่ขยับตามรายเมนูอัตโนมัติ
3. [src/components] TableDetailModal.tsx - 🍽️ (อัปเดต v2.28.4) ปิดปุ่มย้อนกลับในหน้าจัดการโต๊ะ + แสดงสถานะออเดอร์หลักที่ขยับตามรายเมนูอัตโนมัติ
4. [src/components] IncomingOrderModal.tsx - 🔔 (อัปเดต v2.28.4) คงหน้าต่างสถานะรายเมนู/เช็คบิลไว้เมื่อออเดอร์หลักขยับเป็นส่งแล้ว + เชื่อมต่อสถานะวงกลม
5. [src/utils] audioAlert.ts - 🔊 (อัปเดต v2.28.2) เพิ่มเสียงพูดบอกสถานะแยกแต่ละเมนู (playItemStatusAlert / playAllItemsCompletedAlert) พร้อมแจ้งคงเหลือ/ครบทุกรายการ
6. [src/components] CheckBillModal.tsx - 🔧 (อัปเดต v2.28.1) แก้ช่องแก้ไขยอดรวมสุทธิล่าสุด (฿) ไม่ให้ล้นขอบขวาบนจอมือถือ + หน้าต่าง Popup เช็คบิลคีย์เพิ่มเมนูได้
7. [src/components] CircularStatusStepper.tsx - 🆕 ไอคอนสถานะออเดอร์วงกลมทรงทันสมัย (รับออเดอร์ / กำลังทำ / พร้อมเสิร์ฟ / เช็คบิล) + ป้ายสรุปภาพรวมความคืบหน้ารายเมนู
8. [.] index.html - 📱 ปรับสีพื้นหลังหลักและ overflow-x-clip ป้องกันขอบดำล้นจอแอดมินบนมือถือ
9. [src] App.tsx - 📱 จัดส่วนหัว Admin ให้พับบรรทัดพอดีจอมือถือ 360px ไม่ล้นขอบขวา + ซิงก์โต๊ะว่างอัตโนมัติ
10. [src/components] CustomerWebsite.tsx - 🔒 หน้าติดตามสถานะออเดอร์ลูกค้าซ่อนรายการเมนู/ยอดเงิน + เคลียร์รายการค้างอัตโนมัติทุกวันใหม่ 00:00 น. + สเต็ปวงกลม
11. [src/components] AdminOrdersManager.tsx - 🍽️ แผงสถานะโต๊ะเรียลไทม์บนหน้าหลัก Admin + ปุ่มสถานะวงกลม + เรียก Popup เช็คบิล/สถานะ/โต๊ะ + แก้จอล้นมือถือ
12. [src/components] AdminTableManager.tsx - 📱 ปรับแท็บและแถบจัดการโต๊ะให้พอดีหน้าจอมือถือไม่ล้นขอบขวา
13. [src/components] AdminCreateOrderModal.tsx - 🧾 รองรับเลือกโต๊ะล่วงหน้าเมื่อกด "เปิดออเดอร์ใหม่ให้โต๊ะ X" จากหน้าต่างจัดการโต๊ะ
14. [src/components] AdminMenuManager.tsx - ⭐ แผงจัดการเมนูแนะนำประจำสัปดาห์ + ปรับแถบหมวดหมู่ให้พอดีจอมือถือ
15. [src/components] AdminDailyExpensesManager.tsx - 📊 ตารางรายจ่ายประจำวัน + ปรับแถบเลือกวันที่ให้พอดีจอมือถือ
16. [src] types.ts - 🧬 เพิ่ม OrderItemStatus (รอทำ / กำลังทำ / พร้อมเสิร์ฟ / เสิร์ฟแล้ว) และ itemStatus รายเมนู
17. [.] firebase-blueprint.json - 🗄️ อัปเดต Schema ข้อมูล Order (deliveryType และ items)
18. [src] revisionInfo.ts - 🏷️ อัปเดตเลขเวอร์ชันเป็น 2.28.4 (rev-2.28.4)
19. [.] package.json - 📦 คงค่า "react-is": "^19.3.1" คู่กับ "recharts": "^3.10.1" ให้ Vercel Build ผ่านสมบูรณ์
20. [src/components] AdminSourceCodeExporter.tsx - 📱 ตัวช่วยอัปเดตโค้ด GitHub & Patch ZIP ครบทุกไฟล์ (v2.28.4)

วิธีอัปเดตผ่านโทรศัพท์ Android:
1. แตกไฟล์ ZIP นี้ในแอป "ไฟล์ (Files)" ของเครื่องมือถือ
2. เปิด GitHub ในมือถือ ไปที่คลัง baan-steak-online
3. เข้าโฟลเดอร์ src/ -> เลือกโฟลเดอร์ย่อย -> กด Add file -> Upload files
4. เลือกไฟล์แล้วกด Commit changes
5. Vercel จะ Deploy อัตโนมัติใน 30 วินาที!
==========================================================