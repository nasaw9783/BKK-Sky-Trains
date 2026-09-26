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
│   └── *.png, *.svg, *.ico         # PWA icons and web assets
│
├── [Mobile Flutter App] (bkk_skytrains_flutter/)
│   ├── android/                    # Android native configuration, manifest, and Gradle files
│   ├── ios/                        # iOS native configuration, AppIcon, storyboard, and Info.plist
│   ├── lib/                        # Flutter Dart source code (bkk_web_view_screen.dart, main.dart)
│   ├── assets/www/                 # Embedded offline web assets (synced with root web files)
│   └── pubspec.yaml                # Flutter project configuration (Android & iOS targets only)
│
└── [Releases & CI/CD]
    ├── releases/                   # Distribution packages (e.g., BKK_SkyTrains_Android_latest.apk)
    └── .github/workflows/          # GitHub Actions workflows (build_ios.yml for automated iOS builds)
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

3. **Workspace Hygiene & Space Optimization (ความสะอาดและการประหยัดพื้นที่)**:
   - จัดระเบียบไฟล์ `.md`, `.ps1` ให้อยู่เฉพาะในขอบเขต Workspace ของโปรเจกต์นี้เท่านั้น
   - ห้ามทิ้งไฟล์ขยะ เช่น `.tmp`, `.bak`, `.old`, ไฟล์แคช หรือไฟล์ทดสอบที่ไม่ได้ใช้งานไว้ใน Workspace
   - ไฟล์ตัวติดตั้งที่เสร็จสมบูรณ์ให้จัดเก็บไว้ในโฟลเดอร์ `releases/` เท่านั้น
   - อย่าสะสมแคช intermediate build ขนาดยักษ์ (เช่น โฟลเดอร์ `build/` ใน Flutter เมื่อไม่ได้ใช้งาน ให้ทำความสะอาดผ่าน `flutter clean`)

4. **⛔ Strict Isolation Rule (ข้อห้ามเด็ดขาด)**:
   - ห้ามกระทำการใดๆ ข้าม Workspace ระหว่างโปรเจกต์ที่ไม่เกี่ยวข้องกัน
   - โปรเจกต์นี้ **ไม่มีความเกี่ยวข้องใดๆ กับ `D:\Exclusions\Programs` และ `C:\Users\Administrator\Downloads\Programs`** ห้ามเข้าไปรันสคริปต์หรือแก้ไขไฟล์ในไดเรกทอรีดังกล่าวโดยเด็ดขาด
