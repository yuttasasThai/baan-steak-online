==========================================================
คู่มืออัปเดตสำหรับโทรศัพท์ Android (rev-2.28.0)
ร้าน บ้าน สเต็กออนไลน์ (Baan Steak Online)
Repository: https://github.com/yuttasasThai/baan-steak-online
==========================================================

✨ ไฟล์นี้สร้างขึ้นจากเบราว์เซอร์โดยตรง (Client-Side In-Memory ZIP)
รับประกันว่าเป็นไฟล์ .zip แท้ 100% ไม่ใช่ .html

ไฟล์ที่ได้รับการแก้ไขใน rev-2.28.0:
1. [src/components] CircularStatusStepper.tsx - 🆕 ไฟล์ใหม่: ไอคอนสถานะออเดอร์วงกลมทรงทันสมัย (รับออเดอร์ / กำลังทำ / พร้อมเสิร์ฟ / เช็คบิล) + ป้ายสรุปภาพรวมความคืบหน้ารายเมนู
2. [src/components] OrderStatusModal.tsx - 🆕 ไฟล์ใหม่: หน้าต่าง Popup อัปเดตสถานะออเดอร์แบบวงกลม + อัปเดตสถานะแยกแต่ละรายการอาหาร (รอทำ/กำลังทำ/พร้อมเสิร์ฟ/เสิร์ฟแล้ว) + แถบเช็กได้รับครบหรือยัง
3. [src/components] CheckBillModal.tsx - 🆕 ไฟล์ใหม่: หน้าต่าง Popup เช็คบิลแยกเฉพาะ สรุปรายการอาหาร คีย์เพิ่มเมนู ปรับจำนวน แก้ไขยอดรวมล่าสุดได้ก่อนกดยืนยันเช็คบิล/พิมพ์ใบเสร็จ
4. [src/components] TableDetailModal.tsx - 🆕 ไฟล์ใหม่: หน้าต่างจัดการโต๊ะแบบเรียลไทม์ กดดู/สลับว่าง-ไม่ว่าง คีย์เพิ่มเมนูเข้าโต๊ะ อัปเดตสถานะรายรายการ และเช็คบิลโต๊ะได้ทันที
5. [.] index.html - 📱 ปรับสีพื้นหลังหลักและ overflow-x-clip ป้องกันขอบดำล้นจอแอดมินบนมือถือ
6. [src] App.tsx - 📱 จัดส่วนหัว Admin ให้พับบรรทัดพอดีจอมือถือ 360px ไม่ล้นขอบขวา + ซิงก์โต๊ะว่างอัตโนมัติ
7. [src/components] CustomerWebsite.tsx - 🔒 หน้าติดตามสถานะออเดอร์ลูกค้าซ่อนรายการเมนู/ยอดเงิน + เคลียร์รายการค้างอัตโนมัติทุกวันใหม่ 00:00 น. + สเต็ปวงกลม
8. [src/components] AdminOrdersManager.tsx - 🍽️ แผงสถานะโต๊ะเรียลไทม์บนหน้าหลัก Admin + ปุ่มสถานะวงกลม + เรียก Popup เช็คบิล/สถานะ/โต๊ะ + แก้จอล้นมือถือ
9. [src/components] AdminTableManager.tsx - 📱 ปรับแท็บและแถบจัดการโต๊ะให้พอดีหน้าจอมือถือไม่ล้นขอบขวา
10. [src/components] IncomingOrderModal.tsx - 🔔 เชื่อมต่อสถานะวงกลม + เปิด Popup สถานะรายเมนู และ Popup เช็คบิลจากหน้าต่างเด้งรับออเดอร์
11. [src/components] AdminCreateOrderModal.tsx - 🧾 รองรับเลือกโต๊ะล่วงหน้าเมื่อกด "เปิดออเดอร์ใหม่ให้โต๊ะ X" จากหน้าต่างจัดการโต๊ะ
12. [src/components] AdminMenuManager.tsx - ⭐ แผงจัดการเมนูแนะนำประจำสัปดาห์ + ปรับแถบหมวดหมู่ให้พอดีจอมือถือ
13. [src/components] AdminDailyExpensesManager.tsx - 📊 ตารางรายจ่ายประจำวัน + ปรับแถบเลือกวันที่ให้พอดีจอมือถือ
14. [src] types.ts - 🧬 เพิ่ม OrderItemStatus (รอทำ / กำลังทำ / พร้อมเสิร์ฟ / เสิร์ฟแล้ว) และ itemStatus รายเมนู
15. [src/services] menuService.ts - 🛠️ เพิ่มฟังก์ชันอัปเดตสถานะรายรายการอาหาร (updateOrderItemStatus / markAllOrderItemsStatus) และ finalizeOrderCheckout คีย์เพิ่ม/แก้ยอดเช็คบิล
16. [.] firebase-blueprint.json - 🗄️ อัปเดต Schema ข้อมูล Order (deliveryType และ items)
17. [src] revisionInfo.ts - 🏷️ อัปเดตเลขเวอร์ชันเป็น 2.28.0 (rev-2.28.0)
18. [.] package.json - 📦 คงค่า "react-is": "^19.3.1" คู่กับ "recharts": "^3.10.1" ให้ Vercel Build ผ่านสมบูรณ์
19. [src/components] AdminSourceCodeExporter.tsx - 📱 ตัวช่วยอัปเดตโค้ด GitHub & Patch ZIP ครบทุกไฟล์ (v2.28.0)

วิธีอัปเดตผ่านโทรศัพท์ Android:
1. แตกไฟล์ ZIP นี้ในแอป "ไฟล์ (Files)" ของเครื่องมือถือ
2. เปิด GitHub ในมือถือ ไปที่คลัง baan-steak-online
3. เข้าโฟลเดอร์ src/ -> เลือกโฟลเดอร์ย่อย -> กด Add file -> Upload files
4. เลือกไฟล์แล้วกด Commit changes
5. Vercel จะ Deploy อัตโนมัติใน 30 วินาที!
==========================================================