# AGENTS.md - BKK SkyTrains Workspace Guidelines

Directives and mandatory standards for AI Agents working within `C:\Users\Administrator\Documents\BKK Sky Trains`.

---

## 🏗️ Project Architecture & Categories

1. **Web App & PWA (Root Directory)**:
   - `index.html`: Main real-time web application frontend.
   - `js/app.js`: Core client-side logic, routing, stations data, real-time countdown, and UI rendering.
   - `sw.js`: Service worker for offline caching and PWA support.
   - `manifest.json`: Web App Manifest for mobile installation.
   - `icon-192.png`, `icon-512.png`, `icon.svg`, `favicon.*`, `apple-touch-icon.png`: Application branding and icons.
   - `Start-BKK-Transit.ps1`: Local development server and reverse-proxy runner (UTF-8 with BOM).

2. **Mobile App (Flutter Multi-platform in `bkk_skytrains_flutter/`)**:
   - `android/`: Android native project configuration, launcher icons, manifest, and Gradle build files.
   - `ios/`: iOS native project configuration, AppIcon.appiconset, LaunchScreen storyboard, and Info.plist.
   - `lib/`: Flutter Dart codebase (`bkk_web_view_screen.dart`, theme, services).
   - `assets/www/`: Embedded offline web assets (automatically synchronized with root web files).
   - Targeted platforms: **Android & iOS only**. Do not introduce unused desktop boilerplate (Linux/Windows/macOS).

3. **Releases & Deployment**:
   - `releases/`: Dedicated directory for built installer packages (e.g. `BKK_SkyTrains_Android_latest.apk`).
   - `.github/workflows/build_ios.yml`: Cloud CI/CD workflow for automated iOS `.ipa` building on GitHub macOS runners.

---

## 🔄 Post-File-Edit Protocol (ข้อกำหนดหลังการแก้ไขไฟล์)

ทุกครั้งหลังมีการแก้ไขหรือสร้างไฟล์ใดๆ ในระบบ ให้ปฏิบัติตามมาตรฐานต่อไปนี้ทันที:

1. **Dual-Asset Synchronization (ซิงค์ไฟล์อัตโนมัติ)**:
   - หากมีการแก้ไข `index.html` หรือ `js/app.js` ที่โฟลเดอร์ Root ให้คัดลอกและซิงค์ไปยัง `bkk_skytrains_flutter/assets/www/` ให้ตรงกัน 100% เสมอ

2. **Code Validation (ตรวจสอบความถูกต้อง)**:
   - สำหรับ JavaScript: รัน `node --check js/app.js` ทุกครั้งหลังแก้ไข
   - สำหรับ Flutter/Dart: รัน `flutter analyze` เพื่อให้มั่นใจว่าไม่มี Error หรือ Warning
   - สำหรับ PowerShell: บันทึกไฟล์ `.ps1` ทุกไฟล์ด้วยรูปแบบ **UTF-8 with BOM**

3. **File Hygiene & Cleanliness (ความสะอาดและการจัดระเบียบ)**:
   - ห้ามทิ้งไฟล์ขยะ เช่น `.tmp`, `.bak`, `.old`, หรือไฟล์ทดสอบที่ไม่ได้ใช้งานไว้ใน Workspace
   - จัดระเบียบไฟล์เอกสาร (`.md`) และสคริปต์ (`.ps1`) ให้อยู่เฉพาะในขอบเขต Workspace นี้เท่านั้น
   - หลีกเลี่ยงการสะสมแคชชั่วคราวที่ไม่จำเป็น เช่น แคช intermediate build ขนาดยักษ์ (หากต้องการบิลด์ ให้เก็บเฉพาะไฟล์ผลลัพธ์ `.apk`/`.ipa` ไว้ในโฟลเดอร์ `releases/`)

4. **Strict Isolation Rule (ข้อห้ามเด็ดขาด)**:
   - ห้ามกระทำการใดๆ ข้าม Workspace หรือแตะต้อง `D:\Exclusions\Programs` และ `C:\Users\Administrator\Downloads\Programs` โดยเด็ดขาด
