==========================================================
คู่มืออัปเดตสำหรับโทรศัพท์ Android (rev-2.19.0)
ร้าน บ้าน สเต็กออนไลน์ (Baan Steak Online)
Repository: https://github.com/yuttasasThai/baan-steak-online
==========================================================

✨ ไฟล์นี้สร้างขึ้นจากเบราว์เซอร์โดยตรง (Client-Side In-Memory ZIP)
รับประกันว่าเป็นไฟล์ .zip แท้ 100% ไม่ใช่ .html

ไฟล์ที่ได้รับการแก้ไขใน rev-2.19.0:
1. [src/services] notificationService.ts - 🔔 บริการส่งข้อความแจ้งเตือนออเดอร์ใหม่เข้าผ่าน LINE Notify และ Webhook พร้อมจัดรูปแบบข้อความภาษาไทยสวยงามและฟังก์ชันทดสอบส่ง
2. [src/components] AdminShopSettings.tsx - ⚙️ เพิ่มการตั้งค่า LINE Notify Token, Webhook URL, สวิตช์เปิด/ปิดการแจ้งเตือนออเดอร์ใหม่ พร้อมปุ่มกด "🧪 ทดสอบส่งแจ้งเตือน"
3. [.] server.ts - 🚀 เพิ่ม API endpoint /api/notify/line และ /api/notify/webhook ป้องกัน CORS และส่งการแจ้งเตือนไปยัง LINE ได้ 100%
4. [src/services] menuService.ts - 🥩 ทริกเกอร์ส่งการแจ้งเตือน LINE Notify ทันทีในฟังก์ชัน createOrder เมื่อมีลูกค้าสั่งอาหารใหม่เข้ามา
5. [src] types.ts - 🛍️ เพิ่มฟิลด์ lineNotifyEnabled, lineNotifyToken, webhookUrl, lineNotifySendOnCreate ใน ShopSettings
6. [src] revisionInfo.ts - 🏷️ บันทึกเวอร์ชัน 2.19.0 ระบบบริการแจ้งเตือนออเดอร์เข้าผ่าน LINE Notify & Webhook
7. [src/components] OrderReceiptModal.tsx - 🇹🇭 พิมพ์บลูทูธ ESC/POS Raster Bitmap (GS v 0 ที่ 384 จุด/48mm) ภาษาไทยคมชัด วรรณยุกต์ครบ ไม่กลายเป็นภาษาจีน
8. [src] types.ts - 🛍️ รูปแบบการจัดส่ง "สั่งกลับบ้าน" (Takeaway) ใน DiningType
9. [src/components] AdminCreateOrderModal.tsx - 🛍️ เพิ่มปุ่ม "สั่งกลับบ้าน" พร้อมปรับช่องพิมพ์ชื่อและเบอร์โทรศัพท์เป็นแบบ "ไม่บังคับใส่ (ไม่ใส่ก็ได้)" ทั้งสั่งกลับบ้านและทานที่ร้าน
10. [src/components] AdminOrdersManager.tsx - 🛍️ แสดงป้าย "สั่งกลับบ้าน" สีม่วงในรายการออเดอร์ + ปุ่ม "พิมพ์ใบเสร็จ" ครบทุกจุด + ปุ่มคีย์ออเดอร์ใหม่ POS
11. [src] index.css - 📜 CSS @media print สำหรับเครื่องพิมพ์ความร้อน 58mm/80mm จัดกึ่งกลาง ประหยัดกระดาษ
12. [src] App.tsx - ⭐ ซิงก์เสียงเตือน + ส่ง props menus & tables + ป้องกันหน้าต่างเด้งบนหน้าลูกค้า
13. [src/components] AdminSourceCodeExporter.tsx - หน้าจอตัวช่วยดาวน์โหลดโค้ด และปุ่มคัดลอกโค้ดไปวางบน GitHub สำหรับ Android

วิธีอัปเดตผ่านโทรศัพท์ Android:
1. แตกไฟล์ ZIP นี้ในแอป "ไฟล์ (Files)" ของเครื่องมือถือ
2. เปิด GitHub ในมือถือ ไปที่คลัง baan-steak-online
3. เข้าโฟลเดอร์ src/ -> เลือกโฟลเดอร์ย่อย -> กด Add file -> Upload files
4. เลือกไฟล์แล้วกด Commit changes
5. Vercel จะ Deploy อัตโนมัติใน 30 วินาที!
==========================================================