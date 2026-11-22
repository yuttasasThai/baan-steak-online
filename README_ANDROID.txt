==========================================================
คู่มืออัปเดตสำหรับโทรศัพท์ Android (rev-2.28.8)
ร้าน บ้าน สเต็กออนไลน์ (Baan Steak Online)
Repository: https://github.com/yuttasasThai/baan-steak-online
==========================================================

✨ ไฟล์นี้สร้างขึ้นจากเบราว์เซอร์โดยตรง (Client-Side In-Memory ZIP)
รับประกันว่าเป็นไฟล์ .zip แท้ 100% ไม่ใช่ .html

ไฟล์ที่ได้รับการแก้ไขใน rev-2.28.8:
1. [src/utils] orderPrepUtils.ts - ⏱️ (ใหม่ v2.28.8) คำนวณเวลาเตรียมอาหาร ประเมิน SLA ความเร็วครัวรายวัน และตัวช่วยตรวจสอบรายการที่ถูกยกเลิก (ของหมดกระทันหัน)
2. [src/services] menuService.ts - 🚫⏱️ (อัปเดต v2.28.8) เพิ่ม cancelOrderItem ยกเลิกรายการของหมด + adjustOrderPrepTime ปรับเวลาทำอาหาร + บันทึก cookingStartedAt/readyAt
3. [.] firestore.rules - 🛡️ (อัปเดต v2.28.6) ล็อกฐานข้อมูลห้ามแท็บเก่าสร้างเมนูเริ่มต้น (menu_seed/menu_drink/menu_00) และห้ามรีเซ็ตจำนวนโต๊ะเป็น 8 โต๊ะ
4. [src/components] OrderStatusModal.tsx - 🎯 (อัปเดต v2.28.4) ปิดปุ่มย้อนกลับอย่างเข้มงวด + แสดงสถานะออเดอร์หลักที่ขยับตามรายเมนูอัตโนมัติ
5. [src/components] TableDetailModal.tsx - 🍽️ (อัปเดต v2.28.4) ปิดปุ่มย้อนกลับในหน้าจัดการโต๊ะ + แสดงสถานะออเดอร์หลักที่ขยับตามรายเมนูอัตโนมัติ
6. [src/components] IncomingOrderModal.tsx - 🔔 (อัปเดต v2.28.4) คงหน้าต่างสถานะรายเมนู/เช็คบิลไว้เมื่อออเดอร์หลักขยับเป็นส่งแล้ว + เชื่อมต่อสถานะวงกลม
7. [src/utils] audioAlert.ts - 🔊 (อัปเดต v2.28.2) เพิ่มเสียงพูดบอกสถานะแยกแต่ละเมนู (playItemStatusAlert / playAllItemsCompletedAlert) พร้อมแจ้งคงเหลือ/ครบทุกรายการ
8. [src/components] CheckBillModal.tsx - 🔧 (อัปเดต v2.28.1) แก้ช่องแก้ไขยอดรวมสุทธิล่าสุด (฿) ไม่ให้ล้นขอบขวาบนจอมือถือ + หน้าต่าง Popup เช็คบิลคีย์เพิ่มเมนูได้
9. [src/components] CircularStatusStepper.tsx - 🆕 ไอคอนสถานะออเดอร์วงกลมทรงทันสมัย (รับออเดอร์ / กำลังทำ / พร้อมเสิร์ฟ / เช็คบิล) + ป้ายสรุปภาพรวมความคืบหน้ารายเมนู
10. [.] index.html - 📱 ปรับสีพื้นหลังหลักและ overflow-x-clip ป้องกันขอบดำล้นจอแอดมินบนมือถือ
11. [src] App.tsx - 🔒 (อัปเดต v2.28.6) ถอดการเรียก auto-seed เมนูตอนโหลดหน้าเว็บออกถาวร + ซิงก์ข้อมูลแบบอ่านอย่างเดียว
12. [src/components] CustomerWebsite.tsx - 🔍 (อัปเดต v2.28.5) กดดูรูปเมนูเพื่อขยายภาพขนาดใหญ่ได้เต็มตาทั้งเมนูหลักและเมนูแนะนำ + ปุ่มเพิ่มลงตะกร้าในหน้าต่างขยาย
13. [src/components] CustomerAppendOrderModal.tsx - 🔍 (อัปเดต v2.28.5) แตะรูปเมนูในหน้าต่างสั่งเพิ่มเพื่อขยายภาพขนาดใหญ่ก่อนกดเพิ่มได้
14. [src/components] AdminOrdersManager.tsx - 📅 (อัปเดต v2.28.7) เพิ่มตัวกรองช่วงเวลา (ทั้งหมด / วันนี้ / เมื่อวาน / 7 วันล่าสุด) + ยอดรวมรายช่วง + แผงสถานะโต๊ะ
15. [src/components] AdminTableManager.tsx - 🪑 (อัปเดต v2.28.6) ล็อกจำนวนโต๊ะถาวรตามแอดมิน + รองรับลบโต๊ะเกิน 6 โต๊ะได้ทันที
16. [src/components] AdminCreateOrderModal.tsx - 🧾 รองรับเลือกโต๊ะล่วงหน้าเมื่อกด "เปิดออเดอร์ใหม่ให้โต๊ะ X" จากหน้าต่างจัดการโต๊ะ
17. [src/components] AdminMenuManager.tsx - 🔒 (อัปเดต v2.28.6) บังคับรหัสยืนยัน 2 ชั้นเมื่อกดรีเซ็ตเมนู + ปรับแถบหมวดหมู่ให้พอดีจอมือถือ
18. [src/components] AdminDailyExpensesManager.tsx - 📊 ตารางรายจ่ายประจำวัน + ปรับแถบเลือกวันที่ให้พอดีจอมือถือ
19. [src] types.ts - 🧬 เพิ่ม OrderItemStatus (รอทำ / กำลังทำ / พร้อมเสิร์ฟ / เสิร์ฟแล้ว) และ itemStatus รายเมนู
20. [.] firebase-blueprint.json - 🗄️ อัปเดต Schema ข้อมูล Order (deliveryType และ items)
21. [src] revisionInfo.ts - 🏷️ อัปเดตเลขเวอร์ชันเป็น 2.28.8 (rev-2.28.8)
22. [.] package.json - 📦 คงค่า "react-is": "^19.3.1" คู่กับ "recharts": "^3.10.1" ให้ Vercel Build ผ่านสมบูรณ์
23. [src/components] AdminSourceCodeExporter.tsx - 📱 ตัวช่วยอัปเดตโค้ด GitHub & Patch ZIP ครบทุกไฟล์ (v2.28.8)

วิธีอัปเดตผ่านโทรศัพท์ Android:
1. แตกไฟล์ ZIP นี้ในแอป "ไฟล์ (Files)" ของเครื่องมือถือ
2. เปิด GitHub ในมือถือ ไปที่คลัง baan-steak-online
3. เข้าโฟลเดอร์ src/ -> เลือกโฟลเดอร์ย่อย -> กด Add file -> Upload files
4. เลือกไฟล์แล้วกด Commit changes
5. Vercel จะ Deploy อัตโนมัติใน 30 วินาที!
==========================================================