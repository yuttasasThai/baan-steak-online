==========================================================
คู่มืออัปเดตสำหรับโทรศัพท์ Android (rev-2.27.0)
ร้าน บ้าน สเต็กออนไลน์ (Baan Steak Online)
Repository: https://github.com/yuttasasThai/baan-steak-online
==========================================================

✨ ไฟล์นี้สร้างขึ้นจากเบราว์เซอร์โดยตรง (Client-Side In-Memory ZIP)
รับประกันว่าเป็นไฟล์ .zip แท้ 100% ไม่ใช่ .html

ไฟล์ที่ได้รับการแก้ไขใน rev-2.27.0:
1. [.] package.json - 📦 สำคัญมาก! เพิ่มไลบรารี recharts (^3.10.1) สำหรับวาดกราฟเส้นแดชบอร์ดยอดขาย (ต้องอัปเดตก่อน Build บน Vercel)
2. [src/components] CustomerAppendOrderModal.tsx - 🆕 ไฟล์ใหม่ที่ CustomerWebsite เรียกใช้: หน้าต่างให้ลูกค้าสั่งอาหารเพิ่มเข้าออเดอร์เดิมได้ (ต้องมีไฟล์นี้ไม่งั้น Build ไม่ผ่าน)
3. [src/components] CustomerWebsite.tsx - ✨ สไลเดอร์ "แนะนำเมนูประจำสัปดาห์" (รองรับเมนูที่ร้านค้าเลือกเอง + เมนูขายดี/ใหม่ล่าสุด) + เรียงราคาถูกไปแพง + เครื่องดื่มไว้ด้านล่าง
4. [src/components] AdminSalesDashboard.tsx - 🆕 ไฟล์ใหม่: การ์ดสรุปยอดขาย รายวัน/รายสัปดาห์/รายเดือน พร้อมกราฟเส้น Recharts ดูแนวโน้มยอดขายได้ทันที
5. [src/components] AdminSalesAnalytics.tsx - 📊 เรียกแสดง AdminSalesDashboard ด้านบน + กราฟเมนูขายดี + ตาราง Excel Popup ดูรายการออเดอร์รายวัน
6. [src/components] AdminMenuManager.tsx - ⭐ เพิ่มแผงจัดการ "เมนูแนะนำประจำสัปดาห์" ให้ร้านค้า เพิ่ม/ลบ/เลื่อนลำดับเองได้ + ปุ่มลบเมนูตัวอย่างเดิม + ยืนยันรีเซ็ต 2 ชั้น
7. [src] types.ts - 🧬 เพิ่มฟิลด์ recommendedMenuMode / recommendedMenuIds ใน ShopSettings + ข้อมูลผู้สร้างเมนู + สถานะเช็คบิล/ต้นทุน
8. [src/services] menuService.ts - 🔥 ซิงก์ recommendedMenuMode/Ids แบบเรียลไทม์ + Log ตรวจสอบ subscribeMenus + กันเมนูตัวอย่างแทรกซ้ำ + เช็คบิลคืนโต๊ะ
9. [src] App.tsx - ⚡ ส่ง settings & orders เข้า AdminMenuManager + ซิงก์โต๊ะว่างอัตโนมัติ + แท็บต้นทุนและรายจ่ายประจำวัน
10. [src] revisionInfo.ts - 🏷️ อัปเดตเลขเวอร์ชันเป็น 2.27.0 (rev-2.27.0)
11. [src/components] AdminMenuCostManager.tsx - 🧮 ไฟล์ใหม่: หน้าบันทึกต้นทุนของแต่ละเมนู พร้อมคำนวณกำไรต่อจานและ % กำไรแบบเรียลไทม์
12. [src/components] AdminDailyExpensesManager.tsx - 📊 ไฟล์ใหม่: ตารางสรุปรายจ่ายประจำวันแบบ Excel พร้อม Popup กรอกรายจ่ายและส่งออกไฟล์ .CSV
13. [src/components] AdminTableManager.tsx - 🍽️ แสดงสถานะออเดอร์/ล็อคเองบนการ์ดโต๊ะ + ปุ่มซิงก์ตามออเดอร์จริง
14. [src/components] AdminShopSettings.tsx - 📍 อัปเดตพิกัดหมุดร้านใหม่ 16.5373606, 102.102266 พร้อมปุ่มใช้หมุดล่าสุด
15. [src/components] AdminOrdersManager.tsx - 💰 เพิ่มสถานะ "เช็คบิล" + ปุ่มเช็คบิล + ปุ่ม "สั่งอาหารเพิ่ม" ในรายการออเดอร์ทั้งหมด
16. [src/components] IncomingOrderModal.tsx - 🔔 เพิ่มปุ่ม "สั่งอาหารเพิ่ม" และปุ่ม "💰 เช็คบิล" บนหน้าต่างรับออเดอร์เด้งอัตโนมัติ
17. [src/components] MenuFormModal.tsx - 💵 เพิ่มช่องกรอกต้นทุน/จาน (บาท) ในหน้าต่างเพิ่ม/แก้ไขเมนูอาหาร
18. [src/utils] audioAlert.ts - 🔊 เสียงแจ้งเตือน "โต๊ะ....เช็คบิลแล้ว / คุณ....เช็คบิลแล้ว" ต่อด้วย "โต๊ะ....ว่างแล้ว"
19. [.] firestore.rules - 🔒 ป้องกันเมนูตัวอย่าง menu_drink_* / menu_00* ทับข้อมูล + สิทธิ์ daily_expenses
20. [src/components] AdminSourceCodeExporter.tsx - 📱 ตัวช่วยอัปเดตโค้ด GitHub & Patch ZIP ครบทุกไฟล์ ไม่มีไฟล์ตกหล่น (v2.27.0)

วิธีอัปเดตผ่านโทรศัพท์ Android:
1. แตกไฟล์ ZIP นี้ในแอป "ไฟล์ (Files)" ของเครื่องมือถือ
2. เปิด GitHub ในมือถือ ไปที่คลัง baan-steak-online
3. เข้าโฟลเดอร์ src/ -> เลือกโฟลเดอร์ย่อย -> กด Add file -> Upload files
4. เลือกไฟล์แล้วกด Commit changes
5. Vercel จะ Deploy อัตโนมัติใน 30 วินาที!
==========================================================