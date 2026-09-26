# 🚊 BKK SKYTRAINs

เว็บแอปพลิเคชันและแอป Android ติดตามสถานะและเวลารถไฟฟ้า BTS/MRT/SRT/ARL แบบเรียลไทม์ ข้อมูลทางออกสถานี และคำนวณค่าโดยสารในกรุงเทพฯ ครบวงจร

---

## 🌟 จุดเด่นและฟีเจอร์หลัก (Features)

1. **เช็คเวลารถไฟฟ้า BTS แบบเรียลไทม์ (Live TTA)**
   - แสดงเวลานับถอยหลังของขบวนรถไฟฟ้าที่จะเข้าเทียบชานชาลา (ชานชาลา 1 และ 2)
   - มีลำดับเวลารถเข้า 3 ขบวนต่อเนื่อง พร้อมสถานะ "มาแล้ว" แบบกะพริบเตือน
2. **📍 ระบบค้นหาสถานีใกล้คุณที่สุด (Nearest Station by GPS)**
   - คำนวณพิกัดด้วยสูตร Haversine ระบุสถานีที่ใกล้ที่สุดและระยะทางกิโลเมตร
   - มีชิปสถานีใกล้เคียงสำรองให้เลือกสลับได้ทันที
3. **🗺️ แผนผังเส้นทางรถไฟฟ้า (Interactive Route Strip)**
   - แสดงแผนผังสถานีตามแนวเส้นทาง (สายสุขุมวิท, สายสีลม, สายสีทอง, MRT สายสีน้ำเงิน, สายสีม่วง, สายสีแดง, ARL)
   - แตะที่สถานีใดๆ บนแถบเส้นทางเพื่อดูเวลาและข้อมูลได้ทันที
4. **🧭 วางแผนการเดินทาง & คำนวณค่าโดยสาร (Journey Planner)**
   - เลือกสถานีต้นทางและปลายทาง
   - คำนวณเวลาเดินทาง, จำนวนสถานี, จำนวนจุดเปลี่ยนสาย และอัตราค่าโดยสาร
5. **🟢 สถานะการเดินรถสด (Live Traffic Status)**
   - ดึงข้อมูลสถานะการเดินรถสดของทุกสายจากศูนย์ควบคุม
6. **🌐 รองรับ 2 ภาษา & โหมดมืด/สว่าง**
   - สลับภาษาไทย (TH) / ภาษาอังกฤษ (EN)
   - สลับโหมดมืด (Dark Mode) / โหมดสว่าง (Light Mode)
7. **📱 Progressive Web App (PWA)**
   - รองรับการติดตั้งบนหน้าจอมือถือ (Add to Home Screen)
   - มี Service Worker แคชหน้าจอและข้อมูลสถานีออฟไลน์

---

## 🚀 วิธีเปิดใช้งาน (Getting Started)

### วิธีที่ 1: รันผ่านตัวเปิดเซิร์ฟเวอร์ `Start-BKK-Transit.ps1` (แนะนำที่สุด)
สคริปต์จะเริ่ม Local Server พร้อมระบบ **BTS Live API Reverse Proxy** บนพอร์ต 3000 และเปิดเบราว์เซอร์ให้อัตโนมัติ:
```powershell
.\Start-BKK-Transit.ps1
```
*(หรือคลิกขวาที่ไฟล์ `Start-BKK-Transit.ps1` แล้วเลือก **Run with PowerShell**)*

### วิธีที่ 2: รันผ่าน Node.js หรือ Local Server อื่นๆ
```bash
node -e "require('child_process').execSync('powershell ./Start-BKK-Transit.ps1', {stdio: 'inherit'})"
```

---

## 📁 โครงสร้างโปรเจกต์ (Project Structure)
```
c:\Users\Administrator\Documents\BKK Sky Trains/
├── index.html            # โครงสร้างหน้าเว็บหลัก พร้อมดีไซน์ World-Class Transit UI
├── js/
│   └── app.js            # โค้ดควบคุมระบบหลัก (Deobfuscated, อ่านง่าย, ปลอดภัย)
├── bkk_skytrains_flutter/ # โปรเจกต์แอป Android (Flutter SDK) พร้อม Native GPS Bridge
├── Start-BKK-Transit.ps1 # สคริปต์เริ่มเซิร์ฟเวอร์ + BTS Live API Proxy (UTF-8 BOM)
├── sw.js                 # Service Worker สำหรับแคช PWA & Offline
├── manifest.json         # PWA Web App Manifest
├── favicon.ico           # Favicon หลัก
├── favicon-48.png        # Favicon ขนาด 48x48
├── icon-192.png          # App Icon ขนาด 192x192
├── icon-512.png          # App Icon ขนาด 512x512
├── icon.svg              # โลโก้แอปพลิเคชัน SVG Vector
├── apple-touch-icon.png  # ไอคอนสำหรับ iOS Home Screen
├── shot-mobile.png       # ภาพตัวอย่างหน้าจอแอปพลิเคชัน
├── robots.txt            # การตั้งค่า SEO Crawling
└── sitemap.xml           # Sitemap โครงสร้างเว็บไซต์
```
# BKK-Sky-Trains
# BKK-Sky-Trains
