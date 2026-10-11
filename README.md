# 🚊 BKK SKYTRAINs

เว็บแอปพลิเคชันและแอปพลิเคชันมือถือ (Android & iOS) ติดตามสถานะและเวลารถไฟฟ้า BTS/MRT/SRT/ARL แบบเรียลไทม์ วางแผนการเดินทาง ข้อมูลทางออกสถานี ตารางค่าโดยสาร และเวลาเดินรถในกรุงเทพมหานครและปริมณฑลครบวงจร

---

## 🌟 จุดเด่นและฟีเจอร์หลัก (Key Features)

1. **⏱️ เช็คเวลารถไฟฟ้า BTS แบบเรียลไทม์ (Live TTA Countdown)**
   - แสดงเวลานับถอยหลังของขบวนรถไฟฟ้าที่จะเข้าเทียบชานชาลา (ชานชาลา 1 และ 2)
   - ลำดับเวลารถเข้า 3 ขบวนต่อเนื่อง พร้อมสถานะ "มาแล้ว" แบบกะพริบเตือน
   - ระบบ Reverse Proxy ดึงข้อมูลสถานะสดจาก BTS (EBM) อย่างแม่นยำ
2. **📍 ระบบค้นหาสถานีและทางออกใกล้คุณที่สุด (Nearest Station & Exit by GPS)**
   - คำนวณพิกัดด้วยสูตร Haversine ระบุสถานีที่ใกล้ที่สุดและระยะทางกิโลเมตรแบบเรียลไทม์
   - ชิปสถานีใกล้เคียงสำรองให้เลือกสลับสถานีได้อย่างรวดเร็ว
   - ค้นหาประตูทางออกที่ใกล้ตำแหน่งที่คุณยืนอยู่มากที่สุด
   - รองรับ Native GPS Bridge บน Android และ iOS ผ่าน Flutter Geolocator
3. **🚆 มาตรฐานไอคอนรูปรถไฟประจำสายสี (Project Train Icon Standard)**
   - ระบุสายสีของรถไฟฟ้าทุกสายด้วยไอคอนรูปรถไฟเฉพาะสีจากฟังก์ชัน `getLineIconSvg(lineId)`
   - สวยงาม คมชัดในรูปแบบ SVG Vector รองรับทุกความละเอียดหน้าจอ
4. **🎯 มาตรฐานการจัดองค์ประกอบกึ่งกลาง (Project Element Centering Standard)**
   - ทุกกรอบข้อความ รหัสสถานี (Station Code เช่น `YL20`, `CEN`), ไอคอนสัญลักษณ์ (Icons / Symbols เช่น Theme Button, Line Icons, Badges), และปุ่มควบคุมแบบ Pill/Box ทั้งหมด ถูกจัดวางกึ่งกลางอย่างสมบูรณ์แบบทั้งแนวนอนและแนวตั้ง (Centering Layout)
5. **🗺️ ผังสายรถไฟฟ้าแบบโต้ตอบ (Interactive Route Strip & Line Network)**
   - แสดงแผนผังสถานีตามแนวเส้นทางครอบคลุมทุกโครงข่ายใน กทม.:
     - BTS สายสุขุมวิท (สีเขียวอ่อน), BTS สายสีลม (สีเขียวเข้ม), BTS สายสีทอง
     - MRT สายสีน้ำเงิน, MRT สายสีม่วง, MRT สายสีเหลือง, MRT สายสีชมพู
     - SRTET รถไฟฟ้าชานเมืองสายสีแดง (ธานีรัถยา & นครวิถี)
     - ARL รถไฟฟ้าแอร์พอร์ต เรล ลิงก์
   - แตะที่สถานีใดๆ บนผังเส้นทางเพื่อดูเวลารถเข้าและข้อมูลทางออกได้ทันที
5. **🧭 วางแผนการเดินทางอัจฉริยะ (Smart Journey Planner)**
   - ค้นหาเส้นทางที่ดีที่สุดระหว่างสถานีต้นทางและสถานีปลายทาง
   - คำนวณเวลาเดินทางรวม, จำนวนสถานีที่ผ่าน, จุดเปลี่ยนสาย (Interchanges), และประมาณการค่าโดยสาร
6. **🚪 ข้อมูลทางออกสถานี & จุดเชื่อมต่อ (Station Exits & Facilities)**
   - ข้อมูลประตูทางออกแต่ละด้าน บันไดเลื่อน ลิฟต์ และสิ่งอำนวยความสะดวก
   - ข้อมูลสถานที่สำคัญ ห้างสรรพสินค้า อาคารสำนักงาน และการเชื่อมต่อระบบขนส่งสาธารณะอื่นๆ
7. **💰 โครงสร้างและตารางค่าโดยสาร (Fares & Pricing Guide)**
   - แสดงตารางและอัตราค่าโดยสารแยกตามสายรถไฟฟ้า
   - สรุปอัตราเริ่มต้น อัตราสูงสุด และเงื่อนไขการคิดค่าโดยสาร
8. **🕒 ตารางเวลาเดินรถ & ความถี่ (Timetables & Train Frequency)**
   - ตารางเวลาเดินรถเที่ยวแรก (First Train) และเที่ยวสุดท้าย (Last Train) ของแต่ละสาย
   - ความถี่ในการปล่อยขบวนรถ (Headway) ทั้งในช่วงเวลาเร่งด่วน (Peak) และช่วงเวลาปกติ (Off-Peak)
9. **🟢 สถานะการเดินรถสด (Live Traffic Status)**
   - ตรวจสอบสถานะการให้บริการและความล่าช้าของทุกสายรถไฟฟ้าจากศูนย์ควบคุม
10. **🔒 ความปลอดภัยการสื่อสารระดับสูง (JSEncrypt API Security)**
    - ผสานการทำงานร่วมกับไลบรารี `JSEncrypt` เพื่อเข้ารหัสข้อมูล (RSA Encryption) ในการส่งคำขอข้อมูลไปยัง API ป้องกันการดักจับข้อมูลและเพิ่มเสถียรภาพในการสื่อสาร
11. **🌐 รองรับ 2 ภาษา & โหมดถนอมสายตา (Bilingual & Dark/Light Theme)**
    - รองรับภาษาไทย (TH) และภาษาอังกฤษ (EN) เต็มรูปแบบ
    - สลับโหมดมืด (Dark Mode) และโหมดสว่าง (Light Mode) ได้อย่างราบรื่น
12. **📱 ติดตั้งได้ทั้ง PWA และ แอปมือถือเนทีฟ (PWA & Flutter App)**
    - ติดตั้งเป็น Progressive Web App บนหน้าจอมือถือได้ทันที (Add to Home Screen)
    - รองรับแอปพลิเคชันมือถือ Android & iOS (Flutter) โหลดแคชไฟล์เว็บออฟไลน์ (`assets/www/`) ทำงานได้รวดเร็ว ลื่นไหล

---

## 📁 โครงสร้างโปรเจกต์ 4 หมวดหมู่หลัก (Project Architecture)

โปรเจกต์แบ่งออกเป็น 4 ส่วนหลักอย่างเป็นระเบียบ:

```text
c:\Users\Administrator\Documents\BKK Sky Trains/
├── [1. Web App & PWA] (Root)
│   ├── index.html              # หน้าเว็บแอปพลิเคชันหลัก (World-Class Transit UI)
│   ├── js/
│   │   ├── app.js              # โค้ดควบคุมระบบหลัก (Live TTA, Planner, Routing, Fares, Timetables)
│   │   └── jsencrypt.min.js    # ไลบรารีการเข้ารหัสความปลอดภัย API (RSA)
│   ├── sw.js                   # Service Worker สำหรับแคช PWA & Offline Support
│   ├── manifest.json           # PWA Web App Manifest สำหรับติดตั้งบนอุปกรณ์
│   ├── Start-BKK-Transit.ps1   # สคริปต์เปิด Local Server + BTS Live API Reverse Proxy (UTF-8 BOM)
│   ├── robots.txt, sitemap.xml # การตั้งค่า SEO
│   └── *.png, *.svg, *.ico     # โลโก้และไอคอนแอปพลิเคชัน
│
├── [2. Mobile Flutter App] (bkk_skytrains_flutter/)
│   ├── android/                # คอนฟิกูเรชันและ Build scripts ของระบบ Android
│   ├── ios/                    # คอนฟิกูเรชัน, Storyboard และ Assets ของระบบ iOS
│   ├── lib/                    # ซอร์สโค้ด Dart (BkkWebViewScreen, Theme, Services, Screens, Models)
│   ├── test/                   # ชุดทดสอบ Unit & Widget Test
│   ├── assets/www/             # ไฟล์เว็บแคชออฟไลน์ในตัวแอป (ซิงค์ตรงกับ Root 100%)
│   └── pubspec.yaml            # รายการ Dependencies และการตั้งค่า Assets (Android & iOS)
│
├── [3. Releases & CI/CD]
│   ├── releases/               # โฟลเดอร์เก็บไฟล์ตัวติดตั้งแอปพลิเคชัน (.apk, .ipa, .sha256)
│   │   ├── BKK_SkyTrains_Android_latest.apk
│   │   └── BKK_SkyTrains_iOS_latest.ipa
│   └── .github/workflows/      # GitHub Actions CI/CD (build_ios.yml สำหรับบิลด์ iOS .ipa อัตโนมัติ)
│
└── [4. Documentation & Specifications]
    ├── README.md               # คู่มือภาพรวมโปรเจกต์และวิธีใช้งาน
    ├── PRD.md                  # Product Requirements Document
    ├── Skill.md                # ข้อกำหนด Antigravity / Gemini Agent Skill
    ├── AGENTS.md               # ข้อกำหนดและมาตรฐาน Agent ใน Workspace
    └── GEMINI.md               # Directives & Protocols สำหรับ Gemini/Antigravity
```

---

## 🚀 วิธีเปิดใช้งาน (Getting Started)

### วิธีที่ 1: รันเว็บแอปผ่านสคริปต์ `Start-BKK-Transit.ps1` (แนะนำสำหรับนักพัฒนา)
สคริปต์จะเริ่ม Local Server พร้อมระบบ **BTS Live API Reverse Proxy** บนพอร์ต 3000 และเปิดเบราว์เซอร์ให้อัตโนมัติ:
```powershell
.\Start-BKK-Transit.ps1
```
*(หรือคลิกขวาที่ไฟล์ `Start-BKK-Transit.ps1` แล้วเลือก **Run with PowerShell**)*

### วิธีที่ 2: รันผ่าน Node.js
```bash
node -e "require('child_process').execSync('powershell ./Start-BKK-Transit.ps1', {stdio: 'inherit'})"
```

### วิธีที่ 3: ติดตั้งแอปพลิเคชัน Android (.apk)
สามารถนำไฟล์ตัวติดตั้ง Android ล่าสุดจากโฟลเดอร์ `releases/` ไปติดตั้งบนสมาร์ตโฟน Android ได้ทันที:
- `releases/BKK_SkyTrains_Android_latest.apk`

### วิธีที่ 4: ติดตั้งแอปพลิเคชัน iOS (.ipa)
สามารถนำไฟล์ตัวติดตั้ง iOS ล่าสุดจากโฟลเดอร์ `releases/` หรือจากหน้า GitHub Releases ไป Sideload ติดตั้งบน iPhone/iPad:
- `releases/BKK_SkyTrains_iOS_latest.ipa` และ `BKK_SkyTrains_iOS_v*.ipa` (รองรับการติดตั้งผ่าน AltStore, Sideloadly, หรือ TrollStore พร้อมตรวจสอบ SHA-256 Checksum)

### วิธีที่ 5: รันหรือบิลด์แอปพลิเคชัน Flutter (Android & iOS)
เข้าไปที่โฟลเดอร์ `bkk_skytrains_flutter/`:
```bash
cd bkk_skytrains_flutter
flutter pub get
flutter run
```
บิลด์ APK สำหรับติดตั้งจริง:
```bash
flutter build apk --release
```

---

## 🔄 มาตรฐานการพัฒนาและซิงค์ไฟล์ (Development Protocols)

1. **Dual-Asset Synchronization**:
   - หากมีการแก้ไข `index.html`, `js/app.js`, หรือ `js/jsencrypt.min.js` ที่โฟลเดอร์ Root ให้คัดลอกและซิงค์ไปยัง `bkk_skytrains_flutter/assets/www/` ให้ตรงกัน 100% เสมอ
2. **Code Quality & Validation**:
   - ตรวจสอบไวยากรณ์ JavaScript: `node --check js/app.js`
   - ตรวจสอบโค้ด Flutter/Dart: `flutter analyze` ในโฟลเดอร์ `bkk_skytrains_flutter` (ต้องได้ 0 issues)
   - สคริปต์ PowerShell ทั้งหมดต้องบันทึกด้วยรูปแบบ **UTF-8 with BOM**
3. **Automated CI/CD**:
   - ฝั่ง iOS รองรับการบิลด์ไฟล์ `.ipa` อัตโนมัติผ่าน GitHub Actions (`.github/workflows/build_ios.yml`) บน macOS runner พร้อมดึงเวอร์ชันจาก `pubspec.yaml` อัตโนมัติ, สร้างไฟล์แพ็กเกจ `BKK_SkyTrains_iOS_latest.ipa` และ `BKK_SkyTrains_iOS_v*.ipa`, สร้าง SHA-256 Checksum และเผยแพร่ลง GitHub Releases อัตโนมัติ
4. **Zero-Waste Pruning & Workspace Cleanliness**:
   - ถ้าไฟล์หรือแอพไหนไม่สำคัญต่อระบบแล้ว และไม่ทำลายระบบให้เสียหาย ให้ลบทิ้งได้ทันทีหลังแก้ไขหรือทดสอบไฟล์ทุกครั้ง เพื่อรักษาความสะอาดของ Workspace และความปลอดภัยของระบบ
