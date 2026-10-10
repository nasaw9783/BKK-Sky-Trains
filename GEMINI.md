# GEMINI.md - BKK SkyTrains Workspace Directives & Protocols

Directives and mandatory operational standards for Google Gemini and Antigravity AI Agents working within `C:\Users\Administrator\Documents\BKK Sky Trains`.

---

## 📁 1. Project Structure & Directory Organization

The workspace is structured into three clean, dedicated categories:

```text
C:\Users\Administrator\Documents\BKK Sky Trains\
├── [Web App & PWA]
│   ├── index.html                  # Main web application frontend
│   ├── js/app.js                   # Client-side routing, logic, real-time countdown, and UI
│   ├── sw.js                       # Offline service worker
│   ├── manifest.json               # Web App Manifest
│   ├── Start-BKK-Transit.ps1       # Local test server & reverse-proxy runner (UTF-8 with BOM)
│   ├── robots.txt, sitemap.xml     # SEO metadata
│   └── *.png, *.svg, *.ico         # PWA icons and web assets
│
├── [Mobile Flutter App] (bkk_skytrains_flutter/)
│   ├── android/                    # Android native configuration, manifest, and Gradle files
│   ├── ios/                        # iOS native configuration, AppIcon, storyboard, and Info.plist
│   ├── lib/                        # Flutter Dart source code (screens, models, services, main.dart)
│   ├── test/                       # Flutter widget test suite
│   ├── assets/www/                 # Embedded offline web assets (synced with root web files)
│   └── pubspec.yaml                # Flutter project configuration (Android & iOS targets only)
│
├── [Releases & CI/CD]
│   ├── releases/                   # Distribution packages (e.g., BKK_SkyTrains_Android_latest.apk, .ipa)
│   └── .github/workflows/          # GitHub Actions workflows (build_ios.yml for automated iOS builds)
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
   - หากมีการแก้ไข `index.html` หรือ `js/app.js` ที่โฟลเดอร์ Root ต้องคัดลอกและซิงค์ไปยัง `bkk_skytrains_flutter/assets/www/` ให้ตรงกัน 100% เสมอ
   - โค้ดของทั้งสองจุดต้องเหมือนกัน เพื่อให้ทั้งเว็บ PWA และแอปมือถือแสดงผลและทำงานได้เหมือนกันทุกประการ

2. **Validation & Code Quality (ตรวจสอบความถูกต้อง)**:
   - **JavaScript:** ตรวจสอบไวยากรณ์ด้วย `node --check js/app.js` ทุกครั้ง
   - **Flutter / Dart:** รัน `flutter analyze` ภายใน `bkk_skytrains_flutter` และต้องไม่มีข้อผิดพลาด (0 issues)
   - **PowerShell:** บันทึกไฟล์ `.ps1` ทุกไฟล์ด้วยรูปแบบ **UTF-8 with BOM** เสมอ เพื่อป้องกันปัญหา Encoding ใน PowerShell 5.1

3. **Zero-Waste Pruning & Space Optimization (ลบไฟล์และแอพที่ไม่สำคัญทิ้งทันที)**:
   - **ถ้าไฟล์หรือแอพไหนไม่สำคัญต่อระบบแล้ว และไม่ทำลายระบบให้เสียหาย ให้ลบทิ้งได้ทันที** หลังแก้ไขหรือทดสอบไฟล์ทุกครั้ง:
     - ไฟล์ตัวติดตั้งหรือแอพเวอร์ชันเก่าที่ไม่ได้ใช้งานแล้ว (เช่น APK/AAB/IPA รุ่นเก่าที่ซ้ำซ้อนใน `releases/` ให้ลบทิ้งทันที เก็บเฉพาะรุ่นล่าสุด `*_latest.*` หรือรุ่นที่ใช้งานจริงเท่านั้น)
     - แคช Intermediate build: โฟลเดอร์ `build/`, `.dart_tool/` (รัน `flutter clean` เสมอเมื่อไม่ได้บิลด์หรือทดสอบเสร็จ)
     - แคช Android & Compiler: `android/.gradle/`, `android/.kotlin/`
     - แคช IDE & OS: `.idea/`, `*.iml`, `Thumbs.db`, `Desktop.ini`, `.DS_Store`
     - ไฟล์ขยะชั่วคราว: `.tmp`, `.bak`, `.old`, `.log`, `.swp`, `*~`
     - ไฟล์ assets ซ้ำซ้อนหรือไม่จำเป็น ที่ไม่ได้ถูกอ้างอิงในระบบ
   - จัดระเบียบไฟล์เอกสาร (`.md`) และสคริปต์ (`.ps1`) ให้อยู่เฉพาะในขอบเขต Workspace ของโปรเจกต์นี้เท่านั้น
   - ไฟล์ตัวติดตั้งที่เสร็จสมบูรณ์ให้จัดเก็บไว้ในโฟลเดอร์ `releases/` เท่านั้น

4. **⛔ Strict Isolation Rule (ข้อห้ามเด็ดขาด)**:
   - ห้ามกระทำการใดๆ ข้าม Workspace ระหว่างโปรเจกต์ที่ไม่เกี่ยวข้องกัน
   - โปรเจกต์นี้ **ไม่มีความเกี่ยวข้องใดๆ กับ `D:\Exclusions\Programs` และ `C:\Users\Administrator\Downloads\Programs`** ห้ามเข้าไปรันสคริปต์หรือแก้ไขไฟล์ในไดเรกทอรีดังกล่าวโดยเด็ดขาด

5. **Project Train Icon Standard (มาตรฐานสัญลักษณ์รูปรถไฟประจำสายสี)**:
   - สัญลักษณ์ระบุสายสี/ไลน์ของรถไฟฟ้าทั้งหมดในโปรเจกต์นี้ จะต้องใช้ไอคอนรูปรถไฟเฉพาะตามสายสีจากฟังก์ชัน `getLineIconSvg(lineId)` เสมอ (ห้ามใช้จุดกลม ● หรือไอคอนรถไฟทั่วไปที่ไม่ตรงกับสาย)

