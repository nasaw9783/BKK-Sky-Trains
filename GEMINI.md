# GEMINI.md - BKK SkyTrains Workspace Directives & Protocols

Directives and mandatory operational standards for Google Gemini and Antigravity AI Agents working within `C:\Users\Administrator\Documents\BKK Sky Trains`.

---

## 📁 1. Project Structure & Directory Organization

The workspace is structured into four clean, dedicated categories:

```text
C:\Users\Administrator\Documents\BKK Sky Trains\
├── [Web App & PWA]
│   ├── index.html                  # Main web application frontend
│   ├── js/
│   │   ├── app.js                  # Client-side routing, logic, real-time countdown, and UI
│   │   └── jsencrypt.min.js        # RSA cryptographic client library for secure transit API communications
│   ├── api/
│   │   └── bts-proxy.js            # Universal serverless reverse proxy & CORS bypass handler for BTS live transit APIs
│   ├── vercel.json                 # Deployment configuration for Vercel serverless functions and universal CORS routing
│   ├── sw.js                       # Offline service worker
│   ├── manifest.json               # Web App Manifest
│   ├── Start-BKK-Transit.ps1       # Local test server & reverse-proxy runner (UTF-8 with BOM)
│   ├── Deploy-BKK-SkyTrains.ps1    # Automated release, cleanup & GitHub push runner (UTF-8 with BOM)
│   ├── bkk_transit_map.svg         # Light theme vector blueprint transit map
│   ├── bkk_transit_map_dark.svg    # Dark theme vector blueprint transit map
│   ├── bkk_transit_map.jpg         # Fallback raster transit map
│   ├── robots.txt, sitemap.xml     # SEO metadata
│   └── *.png, *.svg, *.ico         # PWA icons and web assets
│
├── [Mobile Flutter App] (bkk_skytrains_flutter/)
│   ├── android/                    # Android native configuration, manifest, and Gradle files
│   ├── ios/                        # iOS native configuration, AppIcon, storyboard, and Info.plist
│   ├── lib/                        # Flutter Dart source code (screens, models, services, main.dart)
│   ├── test/                       # Flutter widget test suite
│   ├── assets/www/                 # Embedded offline web assets (synced with root web files 100%)
│   └── pubspec.yaml                # Flutter project configuration (Android & iOS targets only)
│
├── [Releases & CI/CD]
│   ├── releases/                   # Distribution packages:
│   │   ├── Android/                # Android packages:
│   │   │   ├── APK/                # BKK_SkyTrains_V.xxxx.apk, .sha256
│   │   │   └── AAB/                # BKK_SkyTrains_V.xxxx.aab, .sha256
│   │   └── Apple/                  # iOS package:
│   │       └── IPA/                # BKK_SkyTrains_V.xxxx.ipa, .sha256
│   └── .github/workflows/          # GitHub Actions workflows (build_ios.yml for automated iOS & Android builds & releases)
│
└── [Documentation & Specifications]
    ├── README.md                   # Workspace overview and documentation
    ├── PRD.md                      # Product Requirements Document
    ├── Skill.md                    # Antigravity / Gemini Agent skill specification
    ├── AGENTS.md                   # Agent guidelines & post-file-edit protocol
    └── GEMINI.md                   # Workspace directives & protocols
```

---

## 🔄 2. Post-File-Edit Protocol (ข้อกำหนดหลังการแก้ไขไฟล์)

ทุกครั้งหลังมีการแก้ไขหรือสร้างไฟล์ใดๆ ในระบบ Agent จะต้องปฏิบัติตามคำสั่งจัดระเบียบและตรวจสอบต่อไปนี้ทันที:

1. **Dual-Asset Synchronization (ซิงค์ไฟล์อัตโนมัติ)**:
   - หากมีการแก้ไข `index.html`, `js/app.js`, หรือ `js/jsencrypt.min.js` ที่โฟลเดอร์ Root ต้องคัดลอกและซิงค์ไปยัง `bkk_skytrains_flutter/assets/www/` ให้ตรงกัน 100% เสมอ
   - โค้ดของทั้งสองจุดต้องเหมือนกัน เพื่อให้ทั้งเว็บ PWA และแอปมือถือแสดงผลและทำงานได้เหมือนกันทุกประการ

2. **Validation & Code Quality (ตรวจสอบความถูกต้อง)**:
   - **JavaScript:** ตรวจสอบไวยากรณ์ด้วย `node --check js/app.js` ทุกครั้ง
   - **Flutter / Dart:** รัน `flutter analyze` ภายใน `bkk_skytrains_flutter` และต้องไม่มีข้อผิดพลาด (0 issues)
   - **PowerShell:** บันทึกไฟล์ `.ps1` ทุกไฟล์ด้วยรูปแบบ **UTF-8 with BOM** เสมอ เพื่อป้องกันปัญหา Encoding ใน PowerShell 5.1

3. **Zero-Waste Pruning & Workspace Organization (จัดระเบียบไฟล์และลบไฟล์ที่ไม่สำคัญทิ้งทันที)**:
   - **จัดระเบียบไฟล์ `C:\Users\Administrator\Documents\BKK Sky Trains` จากเครื่องให้เป็นระเบียบ พร้อมจัดหมวดหมู่/Folder ถ้าไฟล์หรือแอพไหนไม่สำคัญต่อระบบแล้ว และไม่ทำลายระบบให้เสียหาย ให้ลบทิ้งได้ทันที หลังมีการแก้ไขไฟล์**
   - การจัดหมวดหมู่ 4 ส่วนหลัก:
     - 1. Web App & PWA (Root)
     - 2. Mobile Flutter App (`bkk_skytrains_flutter/`)
     - 3. Releases & CI/CD (`releases/`, `.github/workflows/`)
     - 4. Documentation & Specifications (`*.md`)
   - ไฟล์ตัวติดตั้งหรือแอพเวอร์ชันเก่าที่ไม่ได้ใช้งานแล้ว (เช่น APK/AAB/IPA รุ่นเก่าที่ซ้ำซ้อนใน `releases/` ให้ลบทิ้งทันที เก็บเฉพาะรุ่นล่าสุด `*_latest.*` หรือรุ่นที่ใช้งานจริงเท่านั้น)
   - แคช Intermediate build: โฟลเดอร์ `build/`, `.dart_tool/` (รัน `flutter clean` เสมอเมื่อไม่ได้บิลด์หรือทดสอบเสร็จ)
   - แคช Android & Compiler: `android/.gradle/`, `android/.kotlin/`
   - แคช IDE & OS: `.idea/`, `*.iml`, `Thumbs.db`, `Desktop.ini`, `.DS_Store`
   - ไฟล์ขยะชั่วคราว: `.tmp`, `.bak`, `.old`, `.log`, `.swp`, `*~`
   - ไฟล์ assets ซ้ำซ้อนหรือไม่จำเป็น ที่ไม่ได้ถูกอ้างอิงในระบบ
   - จัดระเบียบไฟล์เอกสาร (`.md`) และสคริปต์ (`.ps1`) ให้อยู่เฉพาะในขอบเขต Workspace ของโปรเจกต์นี้เท่านั้น
   - ไฟล์ตัวติดตั้งที่เสร็จสมบูรณ์ให้จัดเก็บไว้ในโฟลเดอร์ `releases/` (แบ่งแยกเป็นโฟลเดอร์ `Android/APK`, `Android/AAB` และ `Apple/IPA`) เท่านั้น

4. **Automated Release & Deployment Sequence (ลำดับขั้นตอนสคริปต์ Deploy-BKK-SkyTrains.ps1)**:
   - สคริปต์ `Deploy-BKK-SkyTrains.ps1` และ Agent จะต้องทำงานตามลำดับ 8 ขั้นตอนดังนี้อย่างเคร่งครัด:
     1. **จัดระเบียบไฟล์:** `C:\Users\Administrator\Documents\BKK Sky Trains` จากเครื่องให้เป็นระเบียบ พร้อมจัดหมวดหมู่/Folder ถ้าไฟล์หรือแอพไหนไม่สำคัญต่อระบบแล้ว และไม่ทำลายระบบให้เสียหาย ให้ลบทิ้งได้ทันที
     2. **Update .yml ทั้งหมด:** ตรวจสอบและอัปเดตไฟล์คอนฟิก CI/CD (`.github/workflows/*.yml`, `pubspec.yaml`) ให้สอดคล้องกับเวอร์ชันปัจจุบัน
     3. **Update .md ทั้งหมดให้ตรงตามเว็บ/แอพ เท่านั้น:** ตรวจสอบและอัปเดตเอกสารทุกไฟล์ (`README.md`, `PRD.md`, `AGENTS.md`, `GEMINI.md`, `Skill.md`) ให้ตรงตามเว็บ/แอพ 100%
     4. **Update .ps1 ทั้งหมดให้ตรงตามเว็บ/แอพ เท่านั้น:** ตรวจสอบและอัปเดตสคริปต์ PowerShell ทั้งหมด (`Deploy-BKK-SkyTrains.ps1`, `Start-BKK-Transit.ps1`) พร้อมบันทึกด้วย UTF-8 with BOM เสมอ
     5. **ทำแอพ Android:** รันการตรวจสอบคุณภาพโค้ด (node --check, flutter analyze, flutter test) และคอมไพล์ Android Release APK พร้อมคำนวณ SHA-256 Checksum
     6. **ต้องการให้ทำเป็น App Bundle:** คอมไพล์ Android App Bundle (`.aab`) สำหรับการแจกจ่ายบน Google Play Store พร้อมคำนวณ SHA-256 Checksum และเคลียร์แคชบิลด์
     7. **ทำแอพ IOS:** ตรวจสอบโครงสร้าง Native iOS (Info.plist, Xcode Project, AppIcons) และคอมไพล์ iOS IPA (บน macOS) หรือเตรียมส่งต่อให้ Cloud Runner
     8. **ลบข้อมูลเวอร์เก่า บน Github ออก และ Upload ขึ้น Github Build iOS & Android Apps เวอร์ชั่นที่ทำใหม่ล่าสุดเสมอ:** ล้าง Releases และ Tags เก่าบน GitHub, Commit, Tag และ Push เพื่อทริกเกอร์ GitHub Actions บิลด์ iOS & Android เวอร์ชันล่าสุด

5. **⛔ Strict Isolation Rule (ข้อห้ามเด็ดขาด)**:
   - ห้ามกระทำการใดๆ ข้าม Workspace ระหว่างโปรเจกต์ที่ไม่เกี่ยวข้องกัน
   - โปรเจกต์นี้ **ไม่มีความเกี่ยวข้องใดๆ กับ `D:\Exclusions\Programs` และ `C:\Users\Administrator\Downloads\Programs`** ห้ามเข้าไปรันสคริปต์หรือแก้ไขไฟล์ในไดเรกทอรีดังกล่าวโดยเด็ดขาด

6. **Project Train Icon Standard (มาตรฐานสัญลักษณ์รูปรถไฟประจำสายสี & สัญลักษณ์โครงข่าย)**:
   - สัญลักษณ์ระบุสายสี/ไลน์ของรถไฟฟ้าทั้งหมดในโปรเจกต์นี้ จะต้องใช้ไอคอนรูปรถไฟเฉพาะตามสายสีจากฟังก์ชัน `getLineIconSvg(lineId)` เสมอ (ห้ามใช้จุดกลม ● หรือไอคอนรถไฟทั่วไปที่ไม่ตรงกับสาย):
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

7. **Project Element Centering Standard (มาตรฐานการจัดองค์ประกอบกึ่งกลางกรอบข้อความและสัญลักษณ์)**:
   - ทุกกรอบข้อความ รหัสสถานี (Station Code เช่น `YL20`, `CEN`), ไอคอนสัญลักษณ์ (Icons / Symbols เช่น Theme Button, Line Icons, Badges), และปุ่มควบคุมแบบ Pill/Box ทั้งหมดในโปรเจกต์นี้ จะต้องถูกจัดให้อยู่ "กึ่งกลาง" (Centered ทั้งแนวนอน Horizontal และแนวตั้ง Vertical) ของกรอบเสมอ
   - ต้องใช้ `display: inline-flex` หรือ `display: flex` พร้อมด้วย `align-items: center; justify-content: center; text-align: center; line-height: 1; box-sizing: border-box;` และ `letter-spacing: 0;` (เพื่อไม่ให้ trailing space ดันตัวอักษรเอียงไปทางซ้าย)
   - สำหรับไอคอน SVG ภายในปุ่มหรือกรอบ ให้กำหนด `display: block; margin: auto; flex-shrink: 0;` เพื่อป้องกันปัญหา baseline alignment ตกบรรทัดหรือเยื้องขอบ

8. **🎯 Strict Scope Adherence (ข้อห้ามเด็ดขาด: ห้ามแก้ไขในสิ่งที่ไม่ได้ร้องขอ)**:
   - **ต่อจากนี้ไปห้ามแก้ไขในสิ่งที่ไม่ได้ร้องขอโดยเด็ดขาด** เพื่อป้องกันการแก้ไขไม่ตรงจุดประสงค์
   - ปฏิบัติตามขอบเขตงานที่ผู้ใช้ระบุอย่างเคร่งครัด แก้ไขเฉพาะจุด ฟังก์ชัน หรือไฟล์ที่เกี่ยวข้องโดยตรงกับคำร้องขอเท่านั้น
   - ห้ามแก้ไข ดัดแปลง ลบ หรือ Refactor โค้ด สไตล์ ข้อความ หรือฟังก์ชันส่วนอื่นๆ ที่ผู้ใช้ไม่ได้ร้องขอให้แก้ไขโดยเด็ดขาด
