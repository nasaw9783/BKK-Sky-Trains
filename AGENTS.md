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
   - `robots.txt`, `sitemap.xml`: Web SEO metadata.
   - `Start-BKK-Transit.ps1`: Local development server and reverse-proxy runner (UTF-8 with BOM).

2. **Mobile App (Flutter Multi-platform in `bkk_skytrains_flutter/`)**:
   - `android/`: Android native project configuration, launcher icons, manifest, and Gradle build files.
   - `ios/`: iOS native project configuration, AppIcon.appiconset, LaunchScreen storyboard, and Info.plist.
   - `lib/`: Flutter Dart codebase (`bkk_web_view_screen.dart`, theme, services, screens, models).
   - `test/`: Flutter widget test suite.
   - `assets/www/`: Embedded offline web assets (automatically synchronized with root web files).
   - Targeted platforms: **Android & iOS only**. Do not introduce unused desktop boilerplate (Linux/Windows/macOS).

3. **Releases & Deployment**:
   - `releases/`: Dedicated directory for built installer packages (e.g. `BKK_SkyTrains_Android_latest.apk`, `BKK_SkyTrains_iOS_latest.ipa`, `.sha256`).
   - `.github/workflows/build_ios.yml`: Cloud CI/CD workflow for automated iOS `.ipa` building on GitHub macOS runners.

4. **Documentation & Specifications**:
   - `README.md`: Workspace overview and documentation.
   - `PRD.md`: Product Requirements Document detailing product vision, personas, features, live TTA, routing, fares, and roadmap.
   - `Skill.md`: Antigravity / Gemini Agent skill specification.
   - `AGENTS.md`, `GEMINI.md`: Mandatory Agent operating guidelines, post-file-edit protocols, and system standards.

---

## 🔄 Post-File-Edit Protocol (ข้อกำหนดหลังการแก้ไขไฟล์)

ทุกครั้งหลังมีการแก้ไขหรือสร้างไฟล์ใดๆ ในระบบ ให้ปฏิบัติตามมาตรฐานต่อไปนี้ทันที:

1. **Dual-Asset Synchronization (ซิงค์ไฟล์อัตโนมัติ)**:
   - หากมีการแก้ไข `index.html` หรือ `js/app.js` ที่โฟลเดอร์ Root ให้คัดลอกและซิงค์ไปยัง `bkk_skytrains_flutter/assets/www/` ให้ตรงกัน 100% เสมอ
   - โค้ดของทั้งสองจุดต้องเหมือนกัน เพื่อให้ทั้งเว็บ PWA และแอปมือถือแสดงผลและทำงานได้เหมือนกันทุกประการ

2. **Code Validation (ตรวจสอบความถูกต้อง)**:
   - สำหรับ JavaScript: รัน `node --check js/app.js` ทุกครั้งหลังแก้ไข
   - สำหรับ Flutter/Dart: รัน `flutter analyze` เพื่อให้มั่นใจว่าไม่มี Error หรือ Warning (0 issues)
   - สำหรับ PowerShell: บันทึกไฟล์ `.ps1` ทุกไฟล์ด้วยรูปแบบ **UTF-8 with BOM** เสมอ

3. **Zero-Waste Pruning & Workspace Cleanliness (ลบไฟล์และแอพที่ไม่สำคัญทิ้งทันที)**:
   - **ถ้าไฟล์หรือแอพไหนไม่สำคัญต่อระบบแล้ว และไม่ทำลายระบบให้เสียหาย ให้ลบทิ้งได้ทันที** หลังแก้ไขหรือทดสอบไฟล์ทุกครั้ง:
     - ไฟล์ตัวติดตั้งหรือแอพเวอร์ชันเก่าที่ไม่ได้ใช้งานแล้ว (เช่น APK/AAB/IPA รุ่นเก่าที่ซ้ำซ้อนใน `releases/` ให้ลบทิ้งทันที เก็บเฉพาะรุ่นล่าสุด `*_latest.*` หรือรุ่นที่ใช้งานจริงเท่านั้น)
     - แคช Intermediate build: `build/`, `.dart_tool/` (รัน `flutter clean` เสมอเมื่อทดสอบเสร็จ)
     - แคช Android & Compiler: `android/.gradle/`, `android/.kotlin/`
     - แคช IDE & OS: `.idea/`, `*.iml`, `Thumbs.db`, `Desktop.ini`, `.DS_Store`
     - ไฟล์ขยะชั่วคราว: `.tmp`, `.bak`, `.old`, `.log`, `.swp`, `*~`
     - ไฟล์ assets ซ้ำซ้อนหรือไม่จำเป็น ที่ไม่ได้ถูกอ้างอิงในระบบ
   - จัดระเบียบไฟล์เอกสาร (`.md`) และสคริปต์ (`.ps1`) ให้อยู่เฉพาะในขอบเขต Workspace นี้เท่านั้น
   - ไฟล์ตัวติดตั้งที่เสร็จสมบูรณ์ให้จัดเก็บไว้ในโฟลเดอร์ `releases/` เท่านั้น

4. **Strict Isolation Rule (ข้อห้ามเด็ดขาด)**:
   - ห้ามกระทำการใดๆ ข้าม Workspace หรือแตะต้อง `D:\Exclusions\Programs` และ `C:\Users\Administrator\Downloads\Programs` โดยเด็ดขาด

5. **Project Train Icon Standard (มาตรฐานสัญลักษณ์รูปรถไฟประจำสายสี)**:
   - สัญลักษณ์ระบุสายสี/ไลน์ของรถไฟฟ้าทั้งหมดในโปรเจกต์นี้ จะต้องใช้ไอคอนรูปรถไฟเฉพาะตามสายสีจากฟังก์ชัน `getLineIconSvg(lineId)` เสมอ (ห้ามใช้จุดกลม ● หรือไอคอนรถไฟทั่วไปที่ไม่ตรงกับสาย)

