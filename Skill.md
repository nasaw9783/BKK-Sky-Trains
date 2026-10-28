---
name: bkk-skytrains
description: >-
  Manage, develop, test, sync, and deploy the BKK SkyTrains web app (PWA), mobile Flutter app (Android/iOS), and local reverse proxy server. Ensures dual-asset sync, 0-defect linting, train icon standards, and release packaging.
---

# BKK SkyTrains Skill

## 1. ขอบเขตและหน้าที่ของ Skill (Overview & Scope)

Skill นี้ออกแบบมาเพื่อให้ AI Agent (Antigravity & Google Gemini) สามารถปฏิบัติงาน, พัฒนาฟีเจอร์, แก้ไขบั๊ก, ตรวจสอบคุณภาพโค้ด, ซิงค์ไฟล์ และสร้างตัวติดตั้งสำหรับระบบ **BKK SKYTRAINs** ได้อย่างถูกต้องและปลอดภัย 100% ภายใต้ไดเรกทอรีทำงาน:
`C:\Users\Administrator\Documents\BKK Sky Trains`

---

## 2. โครงสร้างระบบ 4 หมวดหมู่หลัก (Project Architecture)

```text
C:\Users\Administrator\Documents\BKK Sky Trains\
├── [1. Web App & PWA] (Root)
│   ├── index.html                  # Frontend หลักของระบบ (Transit UI & Blueprint Map)
│   ├── js/
│   │   ├── app.js                  # Client Logic, Live TTA, Router, GPS, Fares, Hotspots
│   │   └── jsencrypt.min.js        # RSA cryptographic client library สำหรับ API Security
│   ├── api/
│   │   └── bts-proxy.js            # Universal Serverless Reverse Proxy & CORS Bypass สำหรับ BTS Live Transit API
│   ├── vercel.json                 # การตั้งค่า Deployment และ Universal CORS Routing บน Vercel
│   ├── sw.js                       # Service Worker แคช PWA สำหรับ Offline Support (bts-v76)
│   ├── leaflet.css                 # Leaflet Map CSS
│   ├── icons/                      # ไอคอนเวกเตอร์ประจำสายสีและระบบนำทาง
│   ├── images/                     # แอสเซทและไอคอนแจ้งเหตุขัดข้อง (ic_traffic_alert, icon_traffic_information)
│   ├── manifest.json               # Web App Manifest สำหรับติดตั้งบนหน้าจอมือถือ
│   ├── Start-BKK-Transit.ps1       # สคริปต์เซิร์ฟเวอร์ทดสอบในเครื่อง + BTS Live Reverse Proxy (UTF-8 BOM)
│   ├── Deploy-BKK-SkyTrains.ps1    # สคริปต์บิลด์ Android APK, ล้างข้อมูลเก่าบน GitHub และ Push อัตโนมัติ (UTF-8 BOM)
│   ├── bkk_transit_map.svg         # เวกเตอร์แผนผังรถไฟฟ้าโหมดสว่าง (Light Blueprint)
│   ├── bkk_transit_map_dark.svg    # เวกเตอร์แผนผังรถไฟฟ้าโหมดมืด (Dark Blueprint)
│   ├── bkk_transit_map.jpg         # รูปภาพสำรองแผนผังรถไฟฟ้า
│   ├── robots.txt, sitemap.xml     # ข้อมูล SEO
│   └── *.png, *.svg, *.ico         # ไอคอนระบบและ Web Assets
│
├── [2. Mobile Flutter App] (bkk_skytrains_flutter/)
│   ├── android/                    # Android Native configuration & build files
│   ├── ios/                        # iOS Native configuration & Storyboards
│   ├── lib/                        # Flutter Dart source code (WebView, Services, Themes)
│   ├── test/                       # Flutter widget test suite
│   ├── assets/www/                 # ไฟล์เว็บแคชออฟไลน์ในตัวแอป (ซิงค์ตรงกับ Root 100%)
│   └── pubspec.yaml                # Flutter dependencies (Android & iOS v1.3.6+10)
│
├── [3. Releases & CI/CD]
│   ├── releases/                   # แหล่งเก็บตัวติดตั้ง (แบ่งแยก Android และ Apple)
│   │   ├── Android/                # APK/, AAB/ (BKK_SkyTrains_V.xxxx.apk, .aab, .sha256)
│   │   └── Apple/                  # IPA/ (BKK_SkyTrains_V.xxxx.ipa, .sha256)
│   └── .github/workflows/          # CI/CD Workflows (build_ios.yml สำหรับบิลด์ iOS .ipa และ Android .apk อัตโนมัติ)
│
└── [4. Documentation & Specifications]
    ├── README.md                   # คู่มือระบบและภาพรวมโปรเจกต์
    ├── PRD.md                      # Product Requirements Document
    ├── Skill.md                    # ข้อกำหนด Antigravity Skill
    ├── AGENTS.md                   # ข้อกำหนดมาตรฐาน Agent
    └── GEMINI.md                   # ข้อกำหนดและโปรโตคอล Workspace
```

---

## 3. กฎเหล็กและข้อกำหนดบังคับ (Mandatory Protocols)

### 🔄 กฎข้อที่ 1: Dual-Asset Synchronization (ซิงค์ไฟล์อัตโนมัติ)
ทุกครั้งที่มีการแก้ไขไฟล์ `index.html` หรือ `js/app.js` ที่โฟลเดอร์ Root จะต้องคัดลอกไฟล์ไปยัง `bkk_skytrains_flutter/assets/www/` ให้ตรงกัน 100% ทันที:
```powershell
# ซิงค์ไฟล์ Web Root ไปยัง Flutter Embedded Assets
Copy-Item -Path "index.html" -Destination "bkk_skytrains_flutter\assets\www\index.html" -Force
Copy-Item -Path "js\app.js" -Destination "bkk_skytrains_flutter\assets\www\js\app.js" -Force
if (Test-Path "js\jsencrypt.min.js") { Copy-Item -Path "js\jsencrypt.min.js" -Destination "bkk_skytrains_flutter\assets\www\js\jsencrypt.min.js" -Force }
```

### ✅ กฎข้อที่ 2: Code Validation & Quality Gates (การตรวจสอบคุณภาพ)
1. **JavaScript Syntax Check:**
   ```powershell
   node --check js/app.js
   node --check bkk_skytrains_flutter\assets\www\js\app.js
   ```
2. **Flutter / Dart Static Analysis (ต้อง 0 issues เสมอ):**
   ```powershell
   cd bkk_skytrains_flutter
   flutter analyze
   cd ..
   ```
3. **PowerShell Encoding:** บันทึกไฟล์ `.ps1` ทุกไฟล์ด้วยรูปแบบ **UTF-8 with BOM** เพื่อให้ทำงานได้ทั้ง PowerShell 5.1 และ pwsh 7+

### 🚊 กฎข้อที่ 3: Project Train Icon Standard (มาตรฐานไอคอนรถไฟประจำสาย & สัญลักษณ์โครงข่าย)
- สัญลักษณ์ระบุสายสี/ไลน์รถไฟฟ้าทั้งหมดในโปรเจกต์นี้ **จะต้องใช้ไอคอน SVG รูปรถไฟเฉพาะตามสายสีจากฟังก์ชัน `getLineIconSvg(lineId)` เสมอ**
- **ห้าม** ใช้จุดกลม (●) หรือไอคอนรถไฟทั่วไปที่ไม่ตรงกับสายโดยเด็ดขาด:
  - Line 1: BTS สายสุขุมวิท (`#7AB420`) — <img src="icons/lines/line-1.svg" width="16" height="16" alt="BTS Sukhumvit" style="vertical-align:middle;"> Heavy Rail EMU บนทางยกระดับ
  - Line 2: BTS สายสีลม (`#00807D`) — <img src="icons/lines/line-2.svg" width="16" height="16" alt="BTS Silom" style="vertical-align:middle;"> Heavy Rail EMU บนทางยกระดับ
  - Line 3: BTS สายสีทอง (`#C9A038`) — <img src="icons/lines/line-3.svg" width="16" height="16" alt="APM Gold" style="vertical-align:middle;"> APM People Mover ไร้คนขับ
  - Line 4: MRT สายสีเหลือง (`#FFD100`) — <img src="icons/lines/line-4.svg" width="16" height="16" alt="MRT Yellow" style="vertical-align:middle;"> Straddle Monorail คอนกรีตเดี่ยว
  - Line 5: MRT สายสีชมพู (`#EC4899`) — <img src="icons/lines/line-5.svg" width="16" height="16" alt="MRT Pink" style="vertical-align:middle;"> Straddle Monorail คอนกรีตเดี่ยว (พร้อมสายแยกเมืองทอง MT01-MT02)
  - Line 101: MRT สายสีน้ำเงิน (`#0284C7`) — <img src="icons/lines/line-101.svg" width="16" height="16" alt="MRT Blue" style="vertical-align:middle;"> Underground Tunnel Metro อุโมงค์ใต้ดิน
  - Line 102: MRT สายสีม่วง (`#8A2C9B`) — <img src="icons/lines/line-102.svg" width="16" height="16" alt="MRT Purple" style="vertical-align:middle;"> Sustina Heavy Rail Metro ยกระดับ
  - Line 103: SRTET สายสีแดงเข้ม (`#B91C1C`) — <img src="icons/lines/line-103.svg" width="16" height="16" alt="SRT Dark Red" style="vertical-align:middle;"> Commuter EMU เสารับไฟ Overhead Pantograph
  - Line 105: SRTET สายสีแดงอ่อน (`#F87171`) — <img src="icons/lines/line-105.svg" width="16" height="16" alt="SRT Light Red" style="vertical-align:middle;"> Light Commuter EMU แขนรับไฟ Single-arm Pantograph
  - Line 104: ARL แอร์พอร์ตลิงก์ (`#8A1538`) — <img src="icons/lines/line-104.svg" width="16" height="16" alt="ARL" style="vertical-align:middle;"> Airport Express Bullet Train
  - Line 201: BRT รถโดยสารด่วน (`#82C341`) — <img src="icons/lines/line-201.svg" width="16" height="16" alt="BRT" style="vertical-align:middle;"> Bus Rapid Transit ช่องทางเฉพาะ
  - Line 106: MRT สายสีส้ม (`#F58220`) — <img src="icons/lines/line-106.svg" width="16" height="16" alt="MRT Orange" style="vertical-align:middle;"> Orange Tunnel Metro
- สัญลักษณ์โครงข่ายและการเชื่อมต่อ (Transit Network Legend):
  - <img src="icons/legend/interchange.svg" width="30" height="15" alt="Interchange" style="vertical-align:middle;"> **จุดเชื่อมต่อข้ามสาย (Interchange)**: โหนดสถานีร่วมวงกลมคู่เชื่อมโยงกัน (`.legend-inter-node`)
  - <img src="icons/legend/airport.svg" width="18" height="18" alt="Airport" style="vertical-align:middle;"> **เชื่อมต่อท่าอากาศยาน (Airport)**: ท่าอากาศยานสุวรรณภูมิ หรือดอนเมือง
  - <img src="icons/legend/boat.svg" width="18" height="18" alt="Boat" style="vertical-align:middle;"> **ท่าเรือเชื่อมต่อ (Pier / Boat)**: เรือด่วนเจ้าพระยา หรือเรือคลองแสนแสบ
  - <img src="icons/legend/train.svg" width="18" height="18" alt="Train" style="vertical-align:middle;"> **เชื่อมต่อรถไฟทางไกล (SRT)**: สถานีกลางกรุงเทพอภิวัฒน์ / หัวลำโพง
  - <img src="icons/legend/bus.svg" width="18" height="18" alt="Bus" style="vertical-align:middle;"> **สถานีขนส่งผู้โดยสาร (Bus Terminal)**: สถานีขนส่งหมอชิต 2, เอกมัย, สายใต้
  - <img src="icons/legend/parking.svg" width="18" height="18" alt="Parking" style="vertical-align:middle;"> **อาคารจอดแล้วจร (Park & Ride)**: ลานและอาคารจอดรถ
  - <img src="icons/legend/branch.svg" width="90" height="16" alt="Branch" style="vertical-align:middle;"> **สายแยกเมืองทองธานี (Branch Line)**: ชานชาลาสายแยกอิมแพ็ค (PK10 ⇄ MT01, MT02)

### 🧹 กฎข้อที่ 4: Zero-Waste Pruning (ลบไฟล์และแอพที่ไม่สำคัญทิ้งทันที)
- **จัดระเบียบไฟล์ `C:\Users\Administrator\Documents\BKK Sky Trains` จากเครื่องให้เป็นระเบียบ พร้อมจัดหมวดหมู่/Folder ถ้าไฟล์หรือแอพไหนไม่สำคัญต่อระบบแล้ว และไม่ทำลายระบบให้เสียหาย ให้ลบทิ้งได้ทันที หลังมีการแก้ไขไฟล์**
- การจัดหมวดหมู่ 4 ส่วนหลัก: [1] Web App & PWA (Root), [2] Mobile Flutter App (`bkk_skytrains_flutter/`), [3] Releases & CI/CD (`releases/`, `.github/workflows/`), [4] Documentation & Specifications (`*.md`)
- ไฟล์ตัวติดตั้งหรือแอพเวอร์ชันเก่าที่ไม่ได้ใช้งานแล้ว (เช่น APK/AAB/IPA รุ่นเก่าที่ซ้ำซ้อนใน `releases/` ให้ลบทิ้งทันที เก็บเฉพาะรุ่นล่าสุด `*_latest.*` หรือรุ่นที่ใช้งานจริงเท่านั้น)
- โฟลเดอร์แคชบิลด์: `bkk_skytrains_flutter\build\`, `bkk_skytrains_flutter\.dart_tool\` (รัน `flutter clean` เสมอเมื่อทดสอบเสร็จ)
- โฟลเดอร์แคช Android & Compiler: `bkk_skytrains_flutter\android\.gradle\`, `bkk_skytrains_flutter\android\.kotlin\`
- โฟลเดอร์แคช IDE & OS: `.idea\`, `*.iml`, `Thumbs.db`, `Desktop.ini`, `.DS_Store`
- ไฟล์ขยะชั่วคราว: `.tmp`, `.bak`, `.old`, `.log`, `.swp`, `*~`
- ไฟล์ assets ซ้ำซ้อนหรือไม่จำเป็น ที่ไม่ได้ถูกอ้างอิงในระบบ
- ไฟล์ตัวติดตั้งที่เสร็จสมบูรณ์ให้จัดเก็บไว้ใน `releases/` (แบ่งแยกเป็น `Android/APK`, `Android/AAB` และ `Apple/IPA`) เท่านั้น

### ⛔ กฎข้อที่ 5: Strict Isolation Rule (การแยกโปรเจกต์โดยเด็ดขาด)
- ห้ามกระทำการใดๆ ข้าม Workspace หรือแตะต้อง `D:\Exclusions\Programs` และ `C:\Users\Administrator\Downloads\Programs` โดยเด็ดขาด

### 🎯 กฎข้อที่ 6: Project Element Centering Standard (มาตรฐานการจัดองค์ประกอบกึ่งกลาง)
- ทุกกรอบข้อความ รหัสสถานี (Station Code เช่น `YL20`, `CEN`), ไอคอนสัญลักษณ์ (Icons / Symbols เช่น Theme Button, Line Icons, Badges), และปุ่มควบคุมแบบ Pill/Box ทั้งหมดในโปรเจกต์นี้ จะต้องถูกจัดให้อยู่ "กึ่งกลาง" (Centered ทั้งแนวนอนและแนวตั้ง) ของกรอบเสมอ
- ใช้ `display: inline-flex` หรือ `display: flex` พร้อมด้วย `align-items: center; justify-content: center; text-align: center; line-height: 1; box-sizing: border-box;` และ `letter-spacing: 0;`
- สำหรับไอคอน SVG ภายในปุ่มหรือกรอบ ให้กำหนด `display: block; margin: auto; flex-shrink: 0;`

### 🎯 กฎข้อที่ 7: Strict Scope Adherence (ข้อห้ามเด็ดขาด: ห้ามแก้ไขในสิ่งที่ไม่ได้ร้องขอ)
- ต่อจากนี้ไปห้ามแก้ไขในสิ่งที่ไม่ได้ร้องขอโดยเด็ดขาด เพื่อป้องกันการแก้ไขไม่ตรงจุดประสงค์
- ปฏิบัติตามขอบเขตงานที่ผู้ใช้ระบุอย่างเคร่งครัด แก้ไขเฉพาะจุด ฟังก์ชัน หรือไฟล์ที่เกี่ยวข้องโดยตรงกับคำร้องขอเท่านั้น
- ห้ามแก้ไข ดัดแปลง ลบ หรือ Refactor โค้ด สไตล์ ข้อความ หรือฟังก์ชันส่วนอื่นๆ ที่ผู้ใช้ไม่ได้ร้องขอให้แก้ไขโดยเด็ดขาด

### 🚫 กฎข้อที่ 8: Project Non-Input Text Frame Standard (มาตรฐานการแสดงผลข้อความในกรอบและป้องกันเคอร์เซอร์กระพริบ)
- ข้อความ รหัสสถานี และตัวเลขที่อยู่ในกรอบทั้งหมด (เช่น รหัสสถานี `YL20`, กล่องเวลานับถอยหลังรถเข้า ขบวนแรก ขบวนที่สอง ขบวนที่สาม, การ์ดสถานี, ป้ายชานชาลา) จะต้องไม่มีเคอร์เซอร์เม้าส์กระพริบ (Blinking Text Caret) หรือเปลี่ยนเป็นเคอร์เซอร์พิมพ์ข้อความ (I-beam cursor) เมื่อคลิกหรือแตะ เว้นแต่จะเป็นช่องที่สามารถพิมพ์เพื่อกรอกข้อมูลได้จริงเท่านั้น (`<input>`, `<textarea>`, `[contenteditable="true"]`)
- ทุกองค์ประกอบที่ไม่ใช่ช่องกรอกข้อมูลจะต้องมี `caret-color: transparent !important;`, `user-select: none !important;`, และ `cursor: default !important;` (หรือ `cursor: pointer` หากเป็นปุ่มกดหรือลิงก์)

### 🛡️ กฎข้อที่ 9: Strict Live Transit Gateway Protection (ข้อห้ามเด็ดขาด: ห้ามแตะต้องเกตเวย์รับส่งสัญญาณสด BTS/EBM)
- ต่อจากนี้ไปเมื่อมีการแก้ไขเรื่องเวลา เวลานับถอยหลังรถเข้า ขบวนแรก ขบวนที่สอง ขบวนที่สาม จะไม่ไปกระทำการใดๆ กับส่วนที่ใช้ เกตเวย์รับส่งสัญญาณสดของ BTS/EBM (https://bkkskytrain.online/api/bts-proxy) โดยตรง โดยเด็ดขาด

---

## 4. ขั้นตอนการปฏิบัติงานมาตรฐาน (Standard Operating Procedures - SOP)

### SOP-1: การแก้ไขฟังก์ชันหรือ UI ของแอปพลิเคชัน
1. ทำการแก้ไขโค้ดที่ `index.html` หรือ `js/app.js`
2. ทำการซิงค์ไฟล์ไปยัง `bkk_skytrains_flutter/assets/www/`
3. รันคำสั่ง `node --check js/app.js` เพื่อตรวจสอบความถูกต้อง
4. ทดสอบความถูกต้องในการแสดงผลและการทำงาน

### SOP-2: การทดสอบรันเซิร์ฟเวอร์ในเครื่อง (Local Testing)
เปิด Local Server พร้อม Reverse Proxy สำหรับดึงข้อมูลสดจาก BTS:
```powershell
.\Start-BKK-Transit.ps1
```
- เซิร์ฟเวอร์จะเปิดที่ `http://localhost:3000`
- Reverse Proxy จะทำงานที่ `/api/bts-proxy`

### SOP-3: การคอมไพล์และบิลด์ตัวติดตั้ง Android (APK Build)
```powershell
cd bkk_skytrains_flutter
flutter clean
flutter pub get
flutter analyze
flutter build apk --release
# คัดลอกผลลัพธ์ไปยัง releases/Android/APK/
Copy-Item -Path "build\app\outputs\flutter-apk\app-release.apk" -Destination "..\releases\Android\APK\BKK_SkyTrains_V.1.3.6.apk" -Force
flutter clean
cd ..
```

### SOP-4: การบิลด์ตัวติดตั้ง iOS & Android (iOS IPA, Android APK & App Bundle Automated Build)
- ไฟล์ Workflow: `.github/workflows/build_ios.yml` ("Build iOS & Android Apps")
- รันบน GitHub Runner `macos-14` อัตโนมัติเมื่อมีการ Push ไปยัง branch `main` หรือ Tag `v*`
- สคริปต์ Workflow จะดึงเวอร์ชันจาก `pubspec.yaml` อัตโนมัติ และสร้างไฟล์แพ็กเกจ:
  - iOS IPA: `BKK_SkyTrains_V.${VERSION_BASE}.ipa` + `.sha256`
  - Android APK: `BKK_SkyTrains_V.${VERSION_BASE}.apk` + `.sha256`
  - Android App Bundle (AAB): `BKK_SkyTrains_V.${VERSION_BASE}.aab` + `.sha256`
- เผยแพร่ขึ้น GitHub Releases (Production / Official) แบบ Unified Release พร้อมแนบไฟล์ตัวติดตั้งและ SHA-256 Checksum ครบถ้วน

### SOP-5: การใช้งานสคริปต์ Release & Deploy (`Deploy-BKK-SkyTrains.ps1`)
รันคำสั่งเดียวเพื่อดำเนินการครบวงจรตามลำดับ 8 ขั้นตอน:
```powershell
.\Deploy-BKK-SkyTrains.ps1
```
1. **จัดระเบียบไฟล์:** `C:\Users\Administrator\Documents\BKK Sky Trains` จากเครื่องให้เป็นระเบียบ พร้อมจัดหมวดหมู่/Folder ถ้าไฟล์หรือแอพไหนไม่สำคัญต่อระบบแล้ว และไม่ทำลายระบบให้เสียหาย ให้ลบทิ้งได้ทันที
2. **Update .yml ทั้งหมด:** ตรวจสอบและอัปเดตไฟล์คอนฟิก CI/CD (`.github/workflows/*.yml`, `pubspec.yaml`) ให้สอดคล้องกับเวอร์ชันปัจจุบัน
3. **Update .md ทั้งหมดให้ตรงตามเว็บ/แอพ เท่านั้น:** ตรวจสอบและอัปเดตเอกสารทุกไฟล์ (`README.md`, `PRD.md`, `AGENTS.md`, `GEMINI.md`, `Skill.md`) ให้ตรงตามเว็บ/แอพ 100%
4. **Update .ps1 ทั้งหมดให้ตรงตามเว็บ/แอพ เท่านั้น:** ตรวจสอบและอัปเดตสคริปต์ PowerShell ทั้งหมด (`Deploy-BKK-SkyTrains.ps1`, `Start-BKK-Transit.ps1`) พร้อมบันทึกด้วย UTF-8 with BOM เสมอ
5. **ทำแอพ Android:** รันการตรวจสอบคุณภาพโค้ด (node --check, flutter analyze, flutter test) และคอมไพล์ Android Release APK พร้อมคำนวณ SHA-256 Checksum
6. **ต้องการให้ทำเป็น App Bundle:** คอมไพล์ Android App Bundle (`.aab`) สำหรับการแจกจ่ายบน Google Play Store พร้อมคำนวณ SHA-256 Checksum และเคลียร์แคชบิลด์
7. **ทำแอพ IOS:** ตรวจสอบโครงสร้าง Native iOS (Info.plist, Xcode Project, AppIcons) และคอมไพล์ iOS IPA (บน macOS) หรือเตรียมส่งต่อให้ Cloud Runner
8. **ลบข้อมูลเวอร์เก่า บน Github ออก และ Upload ขึ้น Github Build iOS & Android Apps เวอร์ชั่นที่ทำใหม่ล่าสุดเสมอ:** ล้าง Releases และ Tags เก่าบน GitHub, Commit, Tag และ Push เพื่อทริกเกอร์ GitHub Actions บิลด์ iOS & Android เวอร์ชันล่าสุด

---

## 5. คู่มือแก้ปัญหาและกรณีพิเศษ (Troubleshooting & Edge Cases)

| ปัญหา | สาเหตุ | วิธีแก้ไข |
| :--- | :--- | :--- |
| **พอร์ต 3000 ชนกัน** | มีโปรเซสค้างอยู่บนพอร์ต 3000 | สคริปต์ `Start-BKK-Transit.ps1` จะปิดโปรเซส Node เก่าให้อัตโนมัติ หรือเลื่อนหาพอร์ตว่างถัดไป |
| **CORS Error เมื่อเรียก API ของ BTS** | เรียกตรงโดยไม่ผ่าน Proxy | ตรวจสอบว่าแอปเรียกผ่าน `activeProxyBase` ซึ่งชี้ไปที่ `/api/bts-proxy` หรือ Production Reverse Proxy |
| **Flutter แสดงหน้าเว็บเก่า (Cache ค้าง)** | WebView แคชไฟล์เก่า | ตรวจสอบคำสั่ง `_controller.clearCache()` ใน `bkk_web_view_screen.dart` |
| **GPS ไม่ระบุตำแหน่งในแอปมือถือ** | ไม่ได้ขอสิทธิ์ Location | ตัวแอป Flutter มี `Geolocator.requestPermission()` ส่งพิกัดผ่าน `FlutterLocation` Javascript Channel |
| **ภาษาไทยแสดงผลเพี้ยน (Mojibake)** | บันทึกไฟล์ `.ps1` โดยไม่มี BOM | บันทึกไฟล์ `.ps1` ด้วย `UTF-8 with BOM` เสมอ |

---

## 6. รายการตรวจสอบก่อนเสร็จงาน (Pre-Completion Checklist)

- [ ] โค้ด `index.html` และ `js/app.js` ที่ Root และ `bkk_skytrains_flutter/assets/www/` ตรงกัน 100%
- [ ] ผ่านการทดสอบ `node --check js/app.js` (0 errors)
- [ ] ผ่านการทดสอบ `flutter analyze` ใน `bkk_skytrains_flutter` (0 issues)
- [ ] ทุกไอคอนสายสีใช้ `getLineIconSvg(lineId)` ตามมาตรฐานโครงการ
- [ ] รัน `flutter clean` และลบไฟล์แคชขยะชั่วคราวทั้งหมด
- [ ] ไฟล์ `.ps1` ทุกไฟล์เข้ารหัสด้วย `UTF-8 with BOM`
- [ ] ไม่มีการแตะต้องไดเรกทอรีภายนอก Workspace
