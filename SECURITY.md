# Security Policy

## Supported Versions

| Version / Component | Supported | Notes |
| --- | :---: | --- |
| **v1.3.6 (Build 19)** — Android APK/AAB & iOS IPA | ✅ | Current production mobile release (`bkk_skytrains_flutter`) |
| **Web PWA (`bkk-v111`)** | ✅ | Service Worker Offline Cache & Vercel Serverless Gateway |
| **< v1.3.6 (< Build 19)** | ❌ | Upgrade recommended; older builds lack current hardening and UI fixes |

---

## Implemented Security & Privacy Controls

1. **HTTPS-Only Native Transport (Android)**:
   - `android:usesCleartextTraffic="false"` in `bkk_skytrains_flutter/android/app/src/main/AndroidManifest.xml`.
   - `network_security_config.xml` disables cleartext traffic globally (`cleartextTrafficPermitted="false"`) and enforces system trust anchors.

2. **WebView Navigation Allowlist (`bkk_web_view_screen.dart`)**:
   - In-app `WebViewController` restricts navigation strictly to local bundled `assets/www/`, approved domains (`nasaw9783.github.io`, `bkk-skytrains.vercel.app`, `appassets.androidplatform.net`, `localhost`, `127.0.0.1`), and `about:`/`data:` schemes.
   - GitHub release links open cleanly via `url_launcher` (`LaunchMode.externalApplication`); all unapproved external URLs are blocked by `NavigationDelegate`.

3. **Web HTTP Security & CORS Headers (`vercel.json`)**:
   - Global security headers: `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Permissions-Policy: camera=(), microphone=(), payment=()`.
   - Reverse proxy `/api/*` endpoints permit scoped transit API methods (`GET, POST, OPTIONS`) and required headers only.

4. **Reverse Proxy & API Payload Safeguards (`api/bkk-proxy.js` & `jsencrypt.min.js`)**:
   - Upstream endpoints can be configured via environment variable (`UPSTREAM_BTS_API`), avoiding plaintext upstream secrets in the repository.
   - Requests are validated against `ACTION_MAP` (`tta`, `station-list`, `traffic`, `journey`) and RSA-encrypted payload helpers (`JSEncrypt`) where required.

5. **On-Device Location Privacy & Package Integrity**:
   - Nearest-station distance calculations use client-side Haversine formulas in JavaScript; user coordinates are processed locally on-device (except coordinate queries strictly needed for optional Open-Meteo current weather lookup at nearest station area).
   - Every release package (`.apk`, `.aab`, `.ipa`, `_Release_Packages.zip`) ships with a cryptographic `.sha256` checksum generated during build/CI.

---

## Reporting a Vulnerability

If you discover a security issue in the Web PWA, Reverse Proxy, or Flutter Android/iOS application:

1. **Do not** publicly post exploits, credentials, or sensitive payloads in public commits.
2. Open a private security report via **GitHub Security Advisories** at `https://github.com/nasaw9783/BKK-Sky-Trains/security` or contact the repository maintainers through an issue without leaking secret values.
3. Include affected component (Web PWA, `api/bkk-proxy.js`, Android APK/AAB, or iOS IPA), version/build number (`v1.3.6 Build 19`), reproduction steps, and potential impact.
