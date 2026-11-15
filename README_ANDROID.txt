==========================================================
คู่มืออัปเดตสำหรับโทรศัพท์ Android (rev-2.26.1)
ร้าน บ้าน สเต็กออนไลน์ (Baan Steak Online)
Repository: https://github.com/yuttasasThai/baan-steak-online
==========================================================

✨ ไฟล์นี้สร้างขึ้นจากเบราว์เซอร์โดยตรง (Client-Side In-Memory ZIP)
รับประกันว่าเป็นไฟล์ .zip แท้ 100% ไม่ใช่ .html

ไฟล์ที่ได้รับการแก้ไขใน rev-2.26.1:
1. [src/services] menuService.ts - 🔎 เพิ่ม Forensic Audit Log ใน subscribeMenus (เวลาอ่าน, Server/Cache, docChanges, ผู้สร้าง/เวอร์ชัน) + ป้องกันเมนูเก่าและน้ำหวานแทรกซ้ำถาวร
2. [src] types.ts - 🧬 เพิ่มฟิลด์ createdBy, updatedBy, createdSourceAppVersion, createdHost ใน MenuItem เพื่อระบุผู้สร้างเมนู
3. [src/components] AdminMenuManager.tsx - 🧹 เพิ่มปุ่มลบเมนูเครื่องดื่มตัวอย่างอัตโนมัติใน 1 คลิก + ป้ายระบุ "ตัวอย่างระบบเดิม" + หน้าต่างยืนยัน 2 ชั้นกันมือไปโดนรีเซ็ต
4. [.] firestore.rules - 🔒 ป้องกันแท็บเก่าที่ยังไม่ได้รีเฟรชไม่ให้สร้างเมนูตัวอย่าง menu_drink_* หรือ menu_00* ทับข้อมูลร้านอีก
5. [src] revisionInfo.ts - 🏷️ อัปเดตเลขเวอร์ชันเป็น 2.26.1 (rev-2.26.1)
6. [src/components] CustomerWebsite.tsx - ✨ สไลเดอร์ "แนะนำเมนูประจำสัปดาห์" + แก้ไม่ล็อคโต๊ะก่อนสั่ง + อัปเดตลิงก์หมุดร้าน + แบ่งโซนเครื่องดื่มด้านล่าง
7. [src] App.tsx - 🔄 ซิงก์ล้างสถานะโต๊ะที่ไม่มีออเดอร์ค้างอัตโนมัติเมื่อเปิดแอป + ส่ง orders ไปที่ AdminTableManager
8. [src/components] AdminTableManager.tsx - 🍽️ แสดงสถานะออเดอร์/ล็อคเองบนการ์ดโต๊ะ + ปุ่มซิงก์ตามออเดอร์จริง
9. [src/components] AdminShopSettings.tsx - 📍 อัปเดตพิกัดหมุดร้านใหม่ 16.5373606, 102.102266 พร้อมปุ่มใช้หมุดล่าสุด
10. [src/components] AdminMenuCostManager.tsx - 🧮 หน้าใหม่: บันทึกต้นทุนของแต่ละเมนู พร้อมคำนวณกำไรต่อจานและ % กำไรแบบเรียลไทม์
11. [src/components] AdminDailyExpensesManager.tsx - 📊 หน้าใหม่: ตารางสรุปรายจ่ายประจำวันแบบ Excel พร้อม Popup กรอกรายจ่ายและส่งออกไฟล์ .CSV
12. [src/components] AdminOrdersManager.tsx - 💰 เพิ่มสถานะ "เช็คบิล" + ปุ่มเช็คบิล + ปุ่ม "สั่งอาหารเพิ่ม" ในรายการออเดอร์ทั้งหมด
13. [src/components] IncomingOrderModal.tsx - 🔔 เพิ่มปุ่ม "สั่งอาหารเพิ่ม" และปุ่ม "💰 เช็คบิล" บนหน้าต่างรับออเดอร์เด้งอัตโนมัติ
14. [src/components] MenuFormModal.tsx - 💵 เพิ่มช่องกรอกต้นทุน/จาน (บาท) ในหน้าต่างเพิ่ม/แก้ไขเมนูอาหาร
15. [src/utils] audioAlert.ts - 🔊 เสียงแจ้งเตือน "โต๊ะ....เช็คบิลแล้ว / คุณ....เช็คบิลแล้ว" ต่อด้วย "โต๊ะ....ว่างแล้ว"
16. [src/services] menuService.ts - 🔥 อัปเดตสถานะโต๊ะว่างเรียลไทม์เมื่อเช็คบิล + บันทึกต้นทุนเมนู + ระบบบันทึกรายจ่ายประจำวัน Firestore
17. [src] types.ts - 📦 เพิ่มสถานะ เช็คบิล, ฟิลด์ cost ใน MenuItem, และโครงสร้าง DailyExpenseRecord
18. [src] App.tsx - ⚡ เพิ่มแท็บ "ต้นทุนเมนู" และ "รายจ่ายประจำวัน (Excel)" พร้อมซิงก์ข้อมูลเรียลไทม์
19. [.] firestore.rules - 🛡️ เพิ่มสิทธิ์เข้าถึงคอลเลกชัน daily_expenses ใน Firestore Rules
20. [src/components] AdminSourceCodeExporter.tsx - 📱 ตัวช่วยดาวน์โหลดโค้ดและคัดลอกวางบน GitHub อัปเดตรายการไฟล์ v2.22.0

วิธีอัปเดตผ่านโทรศัพท์ Android:
1. แตกไฟล์ ZIP นี้ในแอป "ไฟล์ (Files)" ของเครื่องมือถือ
2. เปิด GitHub ในมือถือ ไปที่คลัง baan-steak-online
3. เข้าโฟลเดอร์ src/ -> เลือกโฟลเดอร์ย่อย -> กด Add file -> Upload files
4. เลือกไฟล์แล้วกด Commit changes
5. Vercel จะ Deploy อัตโนมัติใน 30 วินาที!
==========================================================