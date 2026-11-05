# GEMINI.md - BKK SkyTrains Workspace Directives & Protocols

Directives and mandatory operational standards for Google Gemini and Antigravity AI Agents working within `C:\Users\Administrator\Documents\BKK Sky Trains`.

---

## 📌 Single Source of Truth: Centralized Workspace Standards

To eliminate rule duplication and ensure consistency across all AI tools, all workspace directives, architectural standards, post-file-edit protocols, and mandatory prohibitions are consolidated in **[AGENTS.md](AGENTS.md)**:

1. **Project Architecture & Categories**: 4 core categories (Web App, Mobile Flutter App, Releases & CI/CD, Documentation).
2. **Post-File-Edit Protocol & Coding Standards**:
   - Dual-Asset Synchronization (`root/` ⇄ `bkk_skytrains_flutter/assets/www/` 100%)
   - Code Validation (`node --check`, `flutter analyze` 0 issues, `flutter test`, PowerShell `UTF-8 with BOM`)
   - Zero-Waste Pruning & Workspace Organization
   - Automated Release & Deployment Sequence (Strict 8-Step sequence for `Deploy-BKK-SkyTrains.ps1`)
   - Project Train Icon Standard (`getLineIconSvg` & Transit Network Legend)
   - Project Element Centering Standard (flex/inline-flex centered)
   - Project Non-Input Text Frame Standard (caret-color transparent, user-select none)
3. **Mandatory Prohibitions (ข้อห้ามเด็ดขาด)**:
   - 🎯 **Strict Scope Adherence**: ห้ามแก้ไขในสิ่งที่ไม่ได้ร้องขอโดยเด็ดขาด
   - ⛔ **Strict Isolation Rule**: ห้ามกระทำการใดๆ ข้าม Workspace หรือแตะต้อง `D:\Exclusions\Programs` และ `C:\Users\Administrator\Downloads\Programs`
   - 🛡️ **Strict Live Transit Gateway Protection**: ห้ามแตะต้องเกตเวย์รับส่งสัญญาณสด BTS/EBM (`https://bkkskytrain.online/api/bts-proxy`)

> [!IMPORTANT]
> All AI Agents operating in this workspace must strictly follow the comprehensive guidelines defined in [AGENTS.md](AGENTS.md).
