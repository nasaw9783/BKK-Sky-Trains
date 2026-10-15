# 📱 BKK SkyTrains - Flutter Mobile App

แอปพลิเคชันมือถือติดตามระบบรถไฟฟ้ากรุงเทพมหานคร พัฒนาด้วย **Flutter SDK** รองรับแพลตฟอร์ม **Android** และ **iOS**

---

## 🏗️ สถาปัตยกรรมแอปพลิเคชัน (Architecture)

แอปพลิเคชันใช้สถาปัตยกรรมแบบ **Hybrid In-App Container**:

1. **Embedded WebView Engine (`lib/screens/bkk_web_view_screen.dart`)**:
   - ทำงานผ่าน `webview_flutter` โดยโหลดเว็บแอปพลิเคชันเวอร์ชันออฟไลน์จาก `assets/www/index.html` ภายในเครื่องโดยตรง
   - มีระบบ `clearCache()` ก่อนโหลด เพื่อให้แน่ใจว่าได้ใช้ไฟล์ asset ล่าสุดเสมอ
   - ให้ประสิทธิภาพสูง โหลดหน้าจอได้ทันที 0ms โดยไม่ต้องพึ่งพาเซิร์ฟเวอร์ภายนอกสำหรับ UI
   - มาพร้อมแผนผังโครงข่ายรถไฟฟ้าเวกเตอร์แบบพิมพ์เขียว (Transit Blueprint Vector Map) สลับธีมมืด/สว่างอัตโนมัติ (`bkk_transit_map.svg`, `bkk_transit_map_dark.svg`) พร้อมจุดฮอตสปอตสถานีแบบโต้ตอบ (`MAP_STATION_HOTSPOTS`)
2. **Native Geolocation Bridge (`geolocator`)**:
   - เชื่อมต่อการขอสิทธิ์ GPS และพิกัดตำแหน่งของผู้ใช้งานผ่าน Native Android/iOS API
   - ส่งต่อพิกัดความแม่นยำสูงเข้าไปยัง JavaScript ในหน้าเว็บแบบเรียลไทม์ผ่าน `JavaScriptChannel`
3. **Train Icon Standard & Element Centering Standard**:
   - รองรับมาตรฐานไอคอนรูปรถไฟประจำสายสีเฉพาะ (`getLineIconSvg`)
   - รองรับมาตรฐานการจัดกึ่งกลางของกรอบข้อความและสัญลักษณ์ (Station Codes, Line Badges, Control Buttons)
   - ผสานการทำงานร่วมกับไลบรารี `JSEncrypt` (`assets/www/js/jsencrypt.min.js`) สำหรับความปลอดภัยของข้อมูล
   - ระบบกรองขบวนรถศูนย์ซ่อมบำรุง/รถเปล่า (`YL00`, `PK00`) และตรวจสอบเวลาเปิดให้บริการ (Operating Hours Validation)
   - หน้าต่างคำอธิบายสัญลักษณ์สายและจุดเชื่อมต่อ (Transit Legend) และแคช Service Worker `bts-v52`
4. **Clean Platform Footprint**:
   - รองรับเฉพาะ **Android** และ **iOS**
   - ตัดโฟลเดอร์ boilerplate ที่ไม่จำเป็น (Linux, macOS, Windows Desktop) ออกทั้งหมด เพื่อลดขนาดโปรเจกต์และประหยัดพื้นที่จัดเก็บ
5. **Native Fallback & Modules**:
   - มีชุดหน้าจอเนทีฟใน `lib/screens/` (`home_screen.dart`, `fares_screen.dart`, `trip_planner_screen.dart`, `map_screen.dart`) และโมเดลข้อมูล (`lib/models/`) พร้อมรองรับการขยายตัวในอนาคต

---

## 📁 โครงสร้างไดเรกทอรี (Directory Structure)

```text
bkk_skytrains_flutter/
├── android/                    # การตั้งค่า Native Android (Manifest, Gradle, App Icons)
├── ios/                        # การตั้งค่า Native iOS (Info.plist, AppIcon, LaunchScreen)
├── assets/
│   └── www/                    # ไฟล์เว็บแอปพลิเคชันออฟไลน์ที่ฝังในตัวแอป (ซิงค์ตรงกับ Root 100%)
│       ├── index.html
│       ├── js/
│       │   ├── app.js
│       │   └── jsencrypt.min.js
│       ├── sw.js               # Service Worker (bts-v52)
│       ├── bkk_transit_map.svg # เวกเตอร์แผนที่โหมดสว่าง
│       ├── bkk_transit_map_dark.svg # เวกเตอร์แผนที่โหมดมืด
│       ├── bkk_transit_map.jpg # รูปภาพสำรอง
│       └── *.png, *.svg
├── lib/                        # โค้ด Flutter Dart
│   ├── main.dart               # จุดเริ่มต้นของแอปพลิเคชัน
│   ├── models/                 # Data Models (Station, Journey)
│   ├── screens/
│   │   ├── bkk_web_view_screen.dart  # หน้าจอหลักรัน WebView + Location Bridge
│   │   ├── home_screen.dart          # หน้าจอ Home แบบเนทีฟ
│   │   ├── fares_screen.dart         # หน้าจอค่าโดยสาร
│   │   ├── trip_planner_screen.dart  # หน้าจอคำนวณการเดินทาง
│   │   └── map_screen.dart           # หน้าจอแผนผัง
│   ├── services/
│   │   ├── api_service.dart          # เซอร์วิสเรียก API
│   │   ├── location_service.dart     # เซอร์วิสจัดการ GPS และพิกัดตำแหน่ง
│   │   └── static_stations.dart      # ข้อมูลสถานีและพิกัดแบบคงที่
│   ├── theme/
│   │   └── app_theme.dart            # การตั้งค่าธีมสีและสไตล์ของแอป
│   └── widgets/                      # วิดเจ็ตที่ใช้ร่วมกัน
├── test/                       # Unit & Widget Tests
└── pubspec.yaml                # การตั้งค่า Dependencies และ Assets (Android & iOS v1.3.6+10)
```

---

## 🚀 การติดตั้งและรันโปรเจกต์ (Getting Started)

### ความต้องการของระบบ (Prerequisites)
- Flutter SDK 3.24+ หรือเวอร์ชันเสถียรล่าสุด
- Dart SDK 3.5+
- Android Studio หรือ Android SDK Platform 34+ (สำหรับการพัฒนา Android)
- Xcode 15+ และ CocoaPods (สำหรับการพัฒนา iOS)

### คำสั่งเริ่มต้น (Commands)

1. **ดาวน์โหลดและอัปเดต Packages:**
   ```bash
   flutter pub get
   ```

2. **ตรวจสอบคุณภาพโค้ด (Lint & Analysis):**
   ```bash
   flutter analyze
   ```

3. **รันบน Emulator หรือเครื่องจริง:**
   ```bash
   flutter run
   ```

4. **รันการทดสอบ Unit / Widget Test:**
   ```bash
   flutter test
   ```

---

## 📦 การบิลด์แพ็กเกจติดตั้ง (Building Releases)

### บิลด์ Android APK:
```bash
flutter build apk --release
```
*ไฟล์ APK ที่สร้างเสร็จแล้วจะอยู่ที่ `build/app/outputs/flutter-apk/app-release.apk` และถูกคัดลอกไปไว้ที่โฟลเดอร์ `../releases/BKK_SkyTrains_Android_latest.apk` สำหรับการแจกจ่าย*

### บิลด์ Android App Bundle (AAB):
```bash
flutter build appbundle --release
```
*ไฟล์ AAB ที่สร้างเสร็จแล้วจะอยู่ที่ `build/app/outputs/bundle/release/app-release.aab` และถูกคัดลอกไปไว้ที่โฟลเดอร์ `../releases/BKK_SkyTrains_Android_latest.aab` สำหรับการแจกจ่ายบน Google Play Store*

### บิลด์ iOS Bundle / IPA:
```bash
flutter build ipa --no-codesign
```
*หรือใช้ระบบ **Automated iOS & Android CI/CD** ผ่าน GitHub Actions ใน `.github/workflows/build_ios.yml` เพื่อให้ GitHub macOS Runner บิลด์ทั้งไฟล์ `.ipa`, `.apk` และ `.aab` ให้อัตโนมัติในระบบคลาวด์ พร้อมแพ็กเกจ `BKK_SkyTrains_iOS_latest.ipa`, `BKK_SkyTrains_iOS_v*.ipa`, `BKK_SkyTrains_Android_latest.apk`, `BKK_SkyTrains_Android_v*.apk`, `BKK_SkyTrains_Android_latest.aab`, `BKK_SkyTrains_Android_v*.aab` พร้อมไฟล์ตรวจสอบ SHA-256 Checksum และอัปโหลดขึ้น GitHub Releases โดยตรง*

---

## 🔄 กฎการซิงค์ไฟล์ (Dual-Asset Synchronization Protocol)

- โฟลเดอร์ `assets/www/` ในโปรเจกต์นี้ เป็นสำเนาของไฟล์เว็บแอปพลิเคชันจากโฟลเดอร์ Root (`index.html`, `js/app.js`, `js/jsencrypt.min.js`, `sw.js` ฯลฯ)
- **ทุกครั้ง** ที่มีการแก้ไขไฟล์เว็บในโฟลเดอร์หลัก จะต้องคัดลอกไฟล์มาทับใน `assets/www/` ให้ตรงกัน 100% เสมอ เพื่อให้การทำงานในแอปมือถือและบนเว็บมีความถูกต้องตรงกัน
- ตรวจสอบความถูกต้องด้วย `flutter analyze` ทุกครั้งหลังอัปเดตไฟล์
- **Zero-Waste Pruning**: ถ้าไฟล์หรือแอพไหนไม่สำคัญต่อระบบแล้ว และไม่ทำลายระบบให้เสียหาย ให้ลบทิ้งได้ทันทีหลังแก้ไขหรือทดสอบไฟล์ทุกครั้ง (เช่น โฟลเดอร์แคชบิลด์ `build/`, `.dart_tool/`, `android/.gradle/`) โดยรัน `flutter clean` เสมอหลังทดสอบเสร็จ
