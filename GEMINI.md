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
│   │   ├── BKK_SkyTrains_Android_latest.apk, .sha256
│   │   └── BKK_SkyTrains_iOS_latest.ipa, .sha256
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
   - ไฟล์ตัวติดตั้งที่เสร็จสมบูรณ์ให้จัดเก็บไว้ในโฟลเดอร์ `releases/` เท่านั้น

4. **Automated Release & Deployment Sequence (ลำดับขั้นตอนสคริปต์ Deploy-BKK-SkyTrains.ps1)**:
   - สคริปต์ `Deploy-BKK-SkyTrains.ps1` และ Agent จะต้องทำงานตามลำดับ 7 ขั้นตอนดังนี้อย่างเคร่งครัด:
     1. **จัดระเบียบไฟล์:** `C:\Users\Administrator\Documents\BKK Sky Trains` จากเครื่องให้เป็นระเบียบ พร้อมจัดหมวดหมู่/Folder ถ้าไฟล์หรือแอพไหนไม่สำคัญต่อระบบแล้ว และไม่ทำลายระบบให้เสียหาย ให้ลบทิ้งได้ทันที
     2. **Update .yml ทั้งหมด:** ตรวจสอบและอัปเดตไฟล์คอนฟิก CI/CD (`.github/workflows/*.yml`) ให้สอดคล้องกับเวอร์ชันปัจจุบัน
     3. **Update .md ทั้งหมด:** ตรวจสอบและอัปเดตเอกสารทุกไฟล์ (`README.md`, `PRD.md`, `AGENTS.md`, `GEMINI.md`, `Skill.md`) ให้ตรงตามเว็บ/แอพ 100%
     4. **ทำแอพ Android:** รันการตรวจสอบคุณภาพโค้ด (node --check, flutter analyze, flutter test) และคอมไพล์ Android Release APK พร้อมคำนวณ SHA-256 Checksum
     5. **ต้องการให้ทำเป็น App Bundle:** คอมไพล์ Android App Bundle (`.aab`) สำหรับการแจกจ่ายบน Google Play Store พร้อมคำนวณ SHA-256 Checksum และเคลียร์แคชบิลด์
     6. **ทำแอพ IOS:** ตรวจสอบโครงสร้าง Native iOS (Info.plist, Xcode Project, AppIcons) และคอมไพล์ iOS IPA (บน macOS) หรือเตรียมส่งต่อให้ Cloud Runner
     7. **ลบข้อมูลเก่าที่ไม่จำเป็น บน Github ออก และ Upload ขึ้น Github ทำแอพ IOS เวอร์ชั่นที่ทำใหม่:** ล้าง Releases เก่าบน GitHub, Commit, Tag และ Push เพื่อทริกเกอร์ GitHub Actions บิลด์ iOS IPA

5. **⛔ Strict Isolation Rule (ข้อห้ามเด็ดขาด)**:
   - ห้ามกระทำการใดๆ ข้าม Workspace ระหว่างโปรเจกต์ที่ไม่เกี่ยวข้องกัน
   - โปรเจกต์นี้ **ไม่มีความเกี่ยวข้องใดๆ กับ `D:\Exclusions\Programs` และ `C:\Users\Administrator\Downloads\Programs`** ห้ามเข้าไปรันสคริปต์หรือแก้ไขไฟล์ในไดเรกทอรีดังกล่าวโดยเด็ดขาด

6. **Project Train Icon Standard (มาตรฐานสัญลักษณ์รูปรถไฟประจำสายสี)**:
   - สัญลักษณ์ระบุสายสี/ไลน์ของรถไฟฟ้าทั้งหมดในโปรเจกต์นี้ จะต้องใช้ไอคอนรูปรถไฟเฉพาะตามสายสีจากฟังก์ชัน `getLineIconSvg(lineId)` เสมอ (ห้ามใช้จุดกลม ● หรือไอคอนรถไฟทั่วไปที่ไม่ตรงกับสาย)

7. **Project Element Centering Standard (มาตรฐานการจัดองค์ประกอบกึ่งกลางกรอบข้อความและสัญลักษณ์)**:
   - ทุกกรอบข้อความ รหัสสถานี (Station Code เช่น `YL20`, `CEN`), ไอคอนสัญลักษณ์ (Icons / Symbols เช่น Theme Button, Line Icons, Badges), และปุ่มควบคุมแบบ Pill/Box ทั้งหมดในโปรเจกต์นี้ จะต้องถูกจัดให้อยู่ "กึ่งกลาง" (Centered ทั้งแนวนอน Horizontal และแนวตั้ง Vertical) ของกรอบเสมอ
   - ต้องใช้ `display: inline-flex` หรือ `display: flex` พร้อมด้วย `align-items: center; justify-content: center; text-align: center; line-height: 1; box-sizing: border-box;` และ `letter-spacing: 0;` (เพื่อไม่ให้ trailing space ดันตัวอักษรเอียงไปทางซ้าย)
   - สำหรับไอคอน SVG ภายในปุ่มหรือกรอบ ให้กำหนด `display: block; margin: auto; flex-shrink: 0;` เพื่อป้องกันปัญหา baseline alignment ตกบรรทัดหรือเยื้องขอบ

8. **🎯 Strict Scope Adherence (ข้อห้ามเด็ดขาด: ห้ามแก้ไขในสิ่งที่ไม่ได้ร้องขอ)**:
   - **ต่อจากนี้ไปห้ามแก้ไขในสิ่งที่ไม่ได้ร้องขอโดยเด็ดขาด** เพื่อป้องกันการแก้ไขไม่ตรงจุดประสงค์
   - ปฏิบัติตามขอบเขตงานที่ผู้ใช้ระบุอย่างเคร่งครัด แก้ไขเฉพาะจุด ฟังก์ชัน หรือไฟล์ที่เกี่ยวข้องโดยตรงกับคำร้องขอเท่านั้น
   - ห้ามแก้ไข ดัดแปลง ลบ หรือ Refactor โค้ด สไตล์ ข้อความ หรือฟังก์ชันส่วนอื่นๆ ที่ผู้ใช้ไม่ได้ร้องขอให้แก้ไขโดยเด็ดขาด
