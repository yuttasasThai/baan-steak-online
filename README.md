# บ้าน สเต็กออนไลน์ (Baan Steak Online)

ระบบสั่งอาหารออนไลน์และระบบจัดการร้านอาหารสเต็กแบบครบวงจร พร้อมระบบคำนวณค่าส่งตามพิกัด GPS จริง เชื่อมต่อฐานข้อมูล Firebase Firestore Realtime และระบบ Admin จัดการออเดอร์

## เทคโนโลยีที่ใช้งาน
- **Frontend**: React 19, TypeScript, Tailwind CSS
- **Bundler & Build**: Vite
- **Database**: Firebase Firestore
- **Deployment**: Vercel Ready (includes `vercel.json`)
- **Revision**: 2.2.0

## การ Deploy บน Vercel
โปรเจกต์นี้ได้รับการตั้งค่าพร้อมสำหรับการ Deploy บน Vercel ทันที:
1. เชื่อมต่อ Git repository กับ Vercel
2. Framework Preset จะถูกตรวจจับเป็น `Vite` อัตโนมัติ
3. ไฟล์ `vercel.json` จัดการ Routing ไม่ให้เกิด Error 404
4. ดูคู่มือภาษาไทยแบบละเอียดสำหรับการอัปโหลดด้วยโทรศัพท์มือถือ Android ได้ที่ [DEPLOYMENT_GUIDE_ANDROID.md](./DEPLOYMENT_GUIDE_ANDROID.md)

## การรันโปรเจกต์ในโหมดพัฒนา
```bash
npm install
npm run dev
```

## การทดสอบ Build
```bash
npm run build
```
