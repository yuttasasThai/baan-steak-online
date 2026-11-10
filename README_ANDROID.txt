==========================================================
คู่มืออัปเดตสำหรับโทรศัพท์ Android (rev-2.21.0)
ร้าน บ้าน สเต็กออนไลน์ (Baan Steak Online)
Repository: https://github.com/yuttasasThai/baan-steak-online
==========================================================

✨ ไฟล์นี้สร้างขึ้นจากเบราว์เซอร์โดยตรง (Client-Side In-Memory ZIP)
รับประกันว่าเป็นไฟล์ .zip แท้ 100% ไม่ใช่ .html

ไฟล์ที่ได้รับการแก้ไขใน rev-2.21.0:
1. [src/components] AdminLoginModal.tsx - 🔒 ปรับปรุงความปลอดภัย: ซ่อนรหัส PIN แอดมิน ไม่แสดงรหัสบนหน้าต่างเข้าสู่ระบบ และนำปุ่มทางลัดออก
2. [src/components] AdminShopSettings.tsx - ⚙️ อัปเกรดหน้าตั้งค่ารองรับ LINE Official Account (Messaging API) และ Discord Webhook พร้อมป้ายแจ้งเตือนการยุติบริการ LINE Notify และคู่มือสอนตั้งค่าอย่างละเอียด
3. [src/services] notificationService.ts - 🔔 ฟังก์ชัน sendLineOaPush และ sendWebhook สำหรับส่งออเดอร์ใหม่เข้าแชท LINE OA ของร้าน หรือ Discord Webhook ทันทีที่มีออเดอร์
4. [.] server.ts - 🚀 เพิ่ม API endpoint /api/notify/line-oa เชื่อมต่อ LINE Messaging API Push message โดยตรง ป้องกันปัญหา CORS ในเบราว์เซอร์
5. [src] types.ts - 🛍️ เพิ่มฟิลด์ lineChannelAccessToken, lineDestinationId, notificationProvider ใน ShopSettings
6. [src/services] menuService.ts - 🥩 ทริกเกอร์ส่งการแจ้งเตือน LINE OA / Webhook ทันทีในฟังก์ชัน createOrder เมื่อมีลูกค้าสั่งอาหารใหม่เข้ามา
7. [src] revisionInfo.ts - 🏷️ บันทึกเวอร์ชัน 2.20.0 อัปเกรดระบบแจ้งเตือนออเดอร์ใหม่เป็น LINE Official Account (Messaging API)
8. [src/components] OrderReceiptModal.tsx - 🇹🇭 พิมพ์บลูทูธ ESC/POS Raster Bitmap (GS v 0 ที่ 384 จุด/48mm) ภาษาไทยคมชัด วรรณยุกต์ครบ ไม่กลายเป็นภาษาจีน
9. [src] types.ts - 🛍️ รูปแบบการจัดส่ง "สั่งกลับบ้าน" (Takeaway) ใน DiningType
10. [src/components] AdminCreateOrderModal.tsx - 🛍️ เพิ่มปุ่ม "สั่งกลับบ้าน" พร้อมปรับช่องพิมพ์ชื่อและเบอร์โทรศัพท์เป็นแบบ "ไม่บังคับใส่ (ไม่ใส่ก็ได้)" ทั้งสั่งกลับบ้านและทานที่ร้าน
11. [src/components] AdminOrdersManager.tsx - 🛍️ แสดงป้าย "สั่งกลับบ้าน" สีม่วงในรายการออเดอร์ + ปุ่ม "พิมพ์ใบเสร็จ" ครบทุกจุด + ปุ่มคีย์ออเดอร์ใหม่ POS
12. [src] index.css - 📜 CSS @media print สำหรับเครื่องพิมพ์ความร้อน 58mm/80mm จัดกึ่งกลาง ประหยัดกระดาษ
13. [src] App.tsx - ⭐ ซิงก์เสียงเตือน + ส่ง props menus & tables + ป้องกันหน้าต่างเด้งบนหน้าลูกค้า
14. [src/components] AdminSourceCodeExporter.tsx - หน้าจอตัวช่วยดาวน์โหลดโค้ด และปุ่มคัดลอกโค้ดไปวางบน GitHub สำหรับ Android

วิธีอัปเดตผ่านโทรศัพท์ Android:
1. แตกไฟล์ ZIP นี้ในแอป "ไฟล์ (Files)" ของเครื่องมือถือ
2. เปิด GitHub ในมือถือ ไปที่คลัง baan-steak-online
3. เข้าโฟลเดอร์ src/ -> เลือกโฟลเดอร์ย่อย -> กด Add file -> Upload files
4. เลือกไฟล์แล้วกด Commit changes
5. Vercel จะ Deploy อัตโนมัติใน 30 วินาที!
==========================================================