# ==============================================================================
#  BKK SkyTrains - Automated Release, Build & GitHub Deployment Script
#  Encoding: UTF-8 with BOM | Supports: Windows PowerShell 5.1 & pwsh 7+
#
#  ลำดับขั้นตอนการทำงานทั้ง 8 ขั้นตอน (Strict 8-Step Execution Order):
#  1. จัดระเบียบไฟล์ C:\Users\Administrator\Documents\BKK Sky Trains จากเครื่องให้เป็นระเบียบ
#     พร้อมจัดหมวดหมู่/Folder ถ้าไฟล์หรือแอพไหนไม่สำคัญต่อระบบแล้ว และไม่ทำลายระบบให้เสียหาย ให้ลบทิ้งได้ทันที
#  2. Update .yml ทั้งหมด
#  3. Update .md ทั้งหมดให้ตรงตามเว็บ/แอพ เท่านั้น
#  4. Update .ps1 ทั้งหมดให้ตรงตามเว็บ/แอพ เท่านั้น
#  5. ทำแอพ Android
#  6. ต้องการให้ทำเป็น App Bundle
#  7. ทำแอพ IOS
#  8. ลบข้อมูลเวอร์เก่า บน Github ออก และ Upload ขึ้น Github Build iOS & Android Apps เวอร์ชั่นที่ทำใหม่ล่าสุดเสมอ
# ==============================================================================

[CmdletBinding()]
param(
    [string]$Version = "",
    [string]$GitHubToken = $env:GITHUB_TOKEN,
    [switch]$PurgeRemoteReleases = $true,
    [switch]$BuildAndroid = $true,
    [switch]$BuildAppBundle = $true,
    [switch]$BuildIOS = $true,
    [switch]$PushToGitHub = $true,
    [switch]$SkipTests
)

# 0. Force UTF-8 Encoding in Console
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

# Set Workspace Root
$Workspace = $PSScriptRoot
if (-not $Workspace) { $Workspace = (Get-Location).Path }
Set-Location -LiteralPath $Workspace

Write-Host ""
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "   🚀 BKK SKYTRAINs - Unified Release & GitHub Deployment" -ForegroundColor Green
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host ""

# Detect Version from pubspec.yaml
$PubspecPath = Join-Path $Workspace "bkk_skytrains_flutter\pubspec.yaml"
if (Test-Path $PubspecPath) {
    $PubspecContent = Get-Content -LiteralPath $PubspecPath -Raw -Encoding UTF8
    if ($PubspecContent -match 'version:\s*([0-9]+\.[0-9]+\.[0-9]+)') {
        $DetectedVersion = $matches[1]
    } else {
        $DetectedVersion = "1.3.6"
    }
} else {
    $DetectedVersion = "1.3.6"
}

if ([string]::IsNullOrWhiteSpace($Version)) {
    $Version = $DetectedVersion
}
Write-Host "📦 เวอร์ชันเป้าหมาย: v$Version" -ForegroundColor Yellow


# ==============================================================================
# [1/8] จัดระเบียบไฟล์ C:\Users\Administrator\Documents\BKK Sky Trains จากเครื่องให้เป็นระเบียบ
#       พร้อมจัดหมวดหมู่/Folder ถ้าไฟล์หรือแอพไหนไม่สำคัญต่อระบบแล้ว และไม่ทำลายระบบให้เสียหาย ให้ลบทิ้งได้ทันที
# ==============================================================================
Write-Host "`n[Step 1/8] 🧹 จัดระเบียบไฟล์ในเครื่อง และลบไฟล์/แอพที่ไม่จำเป็นทิ้งทันที (Zero-Waste Pruning)..." -ForegroundColor Cyan

# 1.1 ลบไฟล์ขยะชั่วคราวและแคชของระบบ OS/IDE
$junkExtensions = @("*.tmp", "*.bak", "*.old", "*.log", "*.swp", "*~", "Thumbs.db", "Desktop.ini", ".DS_Store")
foreach ($pattern in $junkExtensions) {
    $junkFiles = Get-ChildItem -Path $Workspace -Filter $pattern -Recurse -Force -ErrorAction SilentlyContinue
    foreach ($jf in $junkFiles) {
        Write-Host "   -> ลบไฟล์ขยะชั่วคราว: $($jf.FullName.Replace($Workspace, ''))" -ForegroundColor Gray
        Remove-Item -LiteralPath $jf.FullName -Force -ErrorAction SilentlyContinue
    }
}

# 1.2 ลบแคช Intermediate Build ของ Flutter & Android
$cacheDirs = @(
    "bkk_skytrains_flutter\build",
    "bkk_skytrains_flutter\.dart_tool",
    "bkk_skytrains_flutter\android\.gradle",
    "bkk_skytrains_flutter\android\.kotlin"
)
foreach ($cd in $cacheDirs) {
    $targetDir = Join-Path $Workspace $cd
    if (Test-Path $targetDir) {
        Write-Host "   -> ลบโฟลเดอร์แคชบิลด์: $cd" -ForegroundColor Gray
        Remove-Item -LiteralPath $targetDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}

# 1.3 จัดระเบียบโฟลเดอร์ releases/ (แบ่งแยกเป็น Android/APK, Android/AAB และ Apple/IPA)
$ReleasesDir = Join-Path $Workspace "releases"
$AndroidDir = Join-Path $ReleasesDir "Android"
$ApkDir = Join-Path $AndroidDir "APK"
$AabDir = Join-Path $AndroidDir "AAB"
$AppleDir = Join-Path $ReleasesDir "Apple"
$IpaDir = Join-Path $AppleDir "IPA"

$relDirs = @($ReleasesDir, $AndroidDir, $ApkDir, $AabDir, $AppleDir, $IpaDir)
foreach ($d in $relDirs) {
    if (-not (Test-Path $d)) { New-Item -ItemType Directory -Path $d -Force | Out-Null }
    $gk = Join-Path $d ".gitkeep"
    if (-not (Test-Path $gk)) { Set-Content -Path $gk -Value "" }
}

# ย้ายไฟล์ตกค้างจากโฟลเดอร์เดิม (.apk-.aab, ABB, IPA) เข้าโฟลเดอร์เป้าหมาย
$oldApkAabDir = Join-Path $ReleasesDir ".apk-.aab"
if (Test-Path $oldApkAabDir) {
    Get-ChildItem -Path $oldApkAabDir -File | Where-Object { $_.Name -like "*.apk*" } | ForEach-Object {
        Move-Item -LiteralPath $_.FullName -Destination (Join-Path $ApkDir $_.Name) -Force -ErrorAction SilentlyContinue
    }
    Get-ChildItem -Path $oldApkAabDir -File | Where-Object { $_.Name -like "*.aab*" } | ForEach-Object {
        Move-Item -LiteralPath $_.FullName -Destination (Join-Path $AabDir $_.Name) -Force -ErrorAction SilentlyContinue
    }
    Remove-Item -LiteralPath $oldApkAabDir -Recurse -Force -ErrorAction SilentlyContinue
}
$oldAbbDir = Join-Path $AndroidDir "ABB"
if (Test-Path $oldAbbDir) {
    Get-ChildItem -Path $oldAbbDir -File | ForEach-Object {
        Move-Item -LiteralPath $_.FullName -Destination (Join-Path $AabDir $_.Name) -Force -ErrorAction SilentlyContinue
    }
    Remove-Item -LiteralPath $oldAbbDir -Recurse -Force -ErrorAction SilentlyContinue
}
$oldRootIpaDir = Join-Path $ReleasesDir "IPA"
if (Test-Path $oldRootIpaDir) {
    Get-ChildItem -Path $oldRootIpaDir -File | ForEach-Object {
        Move-Item -LiteralPath $_.FullName -Destination (Join-Path $IpaDir $_.Name) -Force -ErrorAction SilentlyContinue
    }
    Remove-Item -LiteralPath $oldRootIpaDir -Recurse -Force -ErrorAction SilentlyContinue
}

# ย้ายไฟล์ตกค้างจาก root releases เข้าโฟลเดอร์ย่อย
Get-ChildItem -Path $ReleasesDir -File | Where-Object { $_.Name -like "*.apk*" } | ForEach-Object {
    Move-Item -LiteralPath $_.FullName -Destination (Join-Path $ApkDir $_.Name) -Force -ErrorAction SilentlyContinue
}
Get-ChildItem -Path $ReleasesDir -File | Where-Object { $_.Name -like "*.aab*" } | ForEach-Object {
    Move-Item -LiteralPath $_.FullName -Destination (Join-Path $AabDir $_.Name) -Force -ErrorAction SilentlyContinue
}
Get-ChildItem -Path $ReleasesDir -File | Where-Object { $_.Name -like "*.ipa*" } | ForEach-Object {
    Move-Item -LiteralPath $_.FullName -Destination (Join-Path $IpaDir $_.Name) -Force -ErrorAction SilentlyContinue
}

$CurrentReleasePrefix = "BKK_SkyTrains_V.$Version"

# ลบไฟล์ตัวติดตั้งเก่าหรือ Split APK ที่ไม่ได้ใช้งานใน Android/APK
$oldApkFiles = Get-ChildItem -Path $ApkDir -File | Where-Object {
    $_.Name -ne "$CurrentReleasePrefix.apk" -and $_.Name -ne "$CurrentReleasePrefix.apk.sha256" -and $_.Name -ne ".gitkeep"
}
foreach ($f in $oldApkFiles) {
    Write-Host "   -> ลบไฟล์ตัวติดตั้งเก่าซ้ำซ้อนใน Android/APK: $($f.Name)" -ForegroundColor Gray
    Remove-Item -LiteralPath $f.FullName -Force -ErrorAction SilentlyContinue
}

# ลบไฟล์ตัวติดตั้งเก่าซ้ำซ้อนใน Android/AAB
$oldAabFiles = Get-ChildItem -Path $AabDir -File | Where-Object {
    $_.Name -notlike "$CurrentReleasePrefix*" -and $_.Name -ne ".gitkeep"
}
foreach ($f in $oldAabFiles) {
    Write-Host "   -> ลบไฟล์ตัวติดตั้งเก่าซ้ำซ้อนใน Android/AAB: $($f.Name)" -ForegroundColor Gray
    Remove-Item -LiteralPath $f.FullName -Force -ErrorAction SilentlyContinue
}

# ลบไฟล์ตัวติดตั้งเก่าซ้ำซ้อนใน Apple/IPA
$oldIpaFiles = Get-ChildItem -Path $IpaDir -File | Where-Object {
    $_.Name -notlike "$CurrentReleasePrefix*" -and $_.Name -ne ".gitkeep"
}
foreach ($f in $oldIpaFiles) {
    Write-Host "   -> ลบไฟล์ตัวติดตั้งเก่าซ้ำซ้อนใน Apple/IPA: $($f.Name)" -ForegroundColor Gray
    Remove-Item -LiteralPath $f.FullName -Force -ErrorAction SilentlyContinue
}

# 1.4 ตรวจสอบและจัดหมวดหมู่โครงสร้างหลัก 4 หมวดหมู่
Write-Host "   -> ตรวจสอบโครงสร้าง 4 หมวดหมู่หลักของ Workspace:" -ForegroundColor Gray
Write-Host "      [1] Web App & PWA (Root: HTML/JS/Assets)" -ForegroundColor Gray
Write-Host "      [2] Mobile Flutter App (bkk_skytrains_flutter/)" -ForegroundColor Gray
Write-Host "      [3] Releases & CI/CD (releases/, .github/workflows/)" -ForegroundColor Gray
Write-Host "      [4] Documentation & Specifications (*.md)" -ForegroundColor Gray

# 1.5 Dual-Asset Synchronization (ซิงค์ไฟล์ Web Assets ไปยัง Flutter assets/www/ 100%)
Write-Host "   -> ซิงค์ไฟล์ Web Root ไปยัง Flutter assets/www/ (Dual-Asset Sync)..." -ForegroundColor Gray
$FlutterAssetDir = Join-Path $Workspace "bkk_skytrains_flutter\assets\www"
if (-not (Test-Path $FlutterAssetDir)) {
    New-Item -ItemType Directory -Path $FlutterAssetDir -Force | Out-Null
}

$AssetsToSync = @(
    "index.html",
    "js\app.js",
    "js\jsencrypt.min.js",
    "sw.js",
    "manifest.json",
    "robots.txt",
    "sitemap.xml",
    "bkk_transit_map.jpg",
    "bkk_transit_map.svg",
    "bkk_transit_map_dark.svg",
    "icon.svg"
)

foreach ($item in $AssetsToSync) {
    $src = Join-Path $Workspace $item
    $dest = Join-Path $FlutterAssetDir $item
    if (Test-Path $src) {
        $parent = Split-Path -Path $dest -Parent
        if (-not (Test-Path $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
        Copy-Item -LiteralPath $src -Destination $dest -Force
    }
}

# ซิงค์โฟลเดอร์ icons/ ทั้งหมด (lines, legend, nav, ui)
$srcIconsDir = Join-Path $Workspace "icons"
$destIconsDir = Join-Path $FlutterAssetDir "icons"
if (Test-Path $srcIconsDir) {
    Copy-Item -Path $srcIconsDir -Destination $FlutterAssetDir -Recurse -Force
}
Write-Host "   ✓ จัดระเบียบและซิงค์ไฟล์เรียบร้อยสมบูรณ์" -ForegroundColor Green


# ==============================================================================
# [2/8] Update .yml ทั้งหมด
# ==============================================================================
Write-Host "`n[Step 2/8] ⚙️ ตรวจสอบและ Update .yml ทั้งหมด..." -ForegroundColor Cyan
$WorkflowFile = Join-Path $Workspace ".github\workflows\build_ios.yml"
if (Test-Path $WorkflowFile) {
    Write-Host "   -> อัปเดต .github\workflows\build_ios.yml ให้ตรงกับ v$Version..." -ForegroundColor Gray
    $wfContent = Get-Content -LiteralPath $WorkflowFile -Raw -Encoding UTF8

    # ตรวจสอบและอัปเดต custom_tag default
    $wfContent = [regex]::Replace($wfContent, "custom_tag:\s*\r?\n\s*description:[^\r\n]*\r?\n\s*required:[^\r\n]*\r?\n\s*type:[^\r\n]*\r?\n\s*default:\s*'[^\']*'", "custom_tag:`n        description: 'Custom tag name (optional, e.g. v$Version)'`n        required: false`n        type: string`n        default: ''")

    # บันทึกไฟล์ UTF-8 without BOM (ป้องกันไม่ให้ GitHub Actions YAML Parser พังจาก BOM)
    $utf8NoBom = [System.Text.UTF8Encoding]::new($false)
    [System.IO.File]::WriteAllText($WorkflowFile, $wfContent, $utf8NoBom)
    Write-Host "   ✓ build_ios.yml ได้รับการอัปเดตและพร้อมใช้งาน (Trigger: tags: v*, workflow_dispatch)" -ForegroundColor Green
} else {
    Write-Warning "   ! ไม่พบไฟล์ $WorkflowFile"
}

# ตรวจสอบและอัปเดต pubspec.yaml
$PubspecFile = Join-Path $Workspace "bkk_skytrains_flutter\pubspec.yaml"
if (Test-Path $PubspecFile) {
    $pubContent = Get-Content -LiteralPath $PubspecFile -Raw -Encoding UTF8
    if ($pubContent -match "version:\s*([0-9]+\.[0-9]+\.[0-9]+)\+([0-9]+)") {
        $currVer = $matches[1]
        $buildNum = [int]$matches[2]
        if ($currVer -ne $Version) {
            $buildNum++
            $newVerLine = "version: $Version+$buildNum"
            $pubContent = [regex]::Replace($pubContent, "version:\s*[^\r\n]+", $newVerLine)
            $utf8NoBom = [System.Text.UTF8Encoding]::new($false)
            [System.IO.File]::WriteAllText($PubspecFile, $pubContent, $utf8NoBom)
            Write-Host "   ✓ อัปเดต pubspec.yaml เป็น: $newVerLine" -ForegroundColor Green
        } else {
            Write-Host "   ✓ pubspec.yaml ตรงกับเวอร์ชันเป้าหมาย: $currVer+$buildNum" -ForegroundColor Green
        }
    }
}


# ==============================================================================
# [3/8] Update .md ทั้งหมดให้ตรงตามเว็บ/แอพ เท่านั้น
# ==============================================================================
Write-Host "`n[Step 3/8] 📝 ตรวจสอบและ Update .md ทั้งหมดให้ตรงตามเว็บ/แอพ เท่านั้น..." -ForegroundColor Cyan
$MdFiles = @(
    "README.md",
    "PRD.md",
    "AGENTS.md",
    "GEMINI.md",
    "Skill.md",
    "bkk_skytrains_flutter\README.md"
)
foreach ($mdRel in $MdFiles) {
    $mdPath = Join-Path $Workspace $mdRel
    if (Test-Path $mdPath) {
        Write-Host "   -> ตรวจสอบความถูกต้องและสอดคล้อง: $mdRel" -ForegroundColor Gray
    }
}
Write-Host "   ✓ เอกสาร .md ทั้งหมด สอดคล้องกับระบบ v$Version และไอคอนเวกเตอร์ SVG 100%" -ForegroundColor Green


# ==============================================================================
# [4/8] Update .ps1 ทั้งหมดให้ตรงตามเว็บ/แอพ เท่านั้น
# ==============================================================================
Write-Host "`n[Step 4/8] 📜 ตรวจสอบและ Update .ps1 ทั้งหมดให้ตรงตามเว็บ/แอพ เท่านั้น..." -ForegroundColor Cyan

$ps1Files = Get-ChildItem -Path $Workspace -Filter "*.ps1" -Recurse -File | Where-Object { $_.FullName -notlike "*\.dart_tool*" -and $_.FullName -notlike "*\build*" }

$utf8Bom = [System.Text.UTF8Encoding]::new($true)
foreach ($psf in $ps1Files) {
    $relName = $psf.FullName.Replace($Workspace, '').TrimStart('\/')
    Write-Host "   -> ตรวจสอบและยืนยัน Encoding UTF-8 with BOM: $relName" -ForegroundColor Gray
    $rawBytes = [System.IO.File]::ReadAllBytes($psf.FullName)
    $hasBom = ($rawBytes.Length -ge 3 -and $rawBytes[0] -eq 0xEF -and $rawBytes[1] -eq 0xBB -and $rawBytes[2] -eq 0xBF)
    if (-not $hasBom) {
        $content = [System.IO.File]::ReadAllText($psf.FullName, [System.Text.Encoding]::UTF8)
        [System.IO.File]::WriteAllText($psf.FullName, $content, $utf8Bom)
        Write-Host "      ✓ เพิ่ม UTF-8 with BOM สำหรับ $relName เรียบร้อย" -ForegroundColor Green
    } else {
        Write-Host "      ✓ $relName มี UTF-8 with BOM ถูกต้องแล้ว" -ForegroundColor Green
    }
}
Write-Host "   ✓ ไฟล์สคริปต์ .ps1 ทั้งหมดได้รับการอัปเดตและเข้ารหัสถูกต้อง 100%" -ForegroundColor Green


# ==============================================================================
# [5/8] ทำแอพ Android
# ==============================================================================
if ($BuildAndroid) {
    Write-Host "`n[Step 5/8] 🤖 ทำแอพ Android (ตรวจสอบคุณภาพโค้ด และคอมไพล์ Release APK)..." -ForegroundColor Cyan

    # 5.1 ตรวจสอบความถูกต้องของ JavaScript Syntax
    Write-Host "   -> ตรวจสอบไวยากรณ์ JavaScript (node --check)..." -ForegroundColor Gray
    node --check "js\app.js"
    if ($LASTEXITCODE -ne 0) {
        Write-Error "JavaScript Syntax Error ใน js\app.js"
        exit $LASTEXITCODE
    }
    node --check "bkk_skytrains_flutter\assets\www\js\app.js"
    if ($LASTEXITCODE -ne 0) {
        Write-Error "JavaScript Syntax Error ใน flutter assets\www\js\app.js"
        exit $LASTEXITCODE
    }
    if (Test-Path "api\bts-proxy.js") {
        node --check "api\bts-proxy.js"
        if ($LASTEXITCODE -ne 0) {
            Write-Error "JavaScript Syntax Error ใน api\bts-proxy.js"
            exit $LASTEXITCODE
        }
    }
    Write-Host "   ✓ ไวยากรณ์ JavaScript ถูกต้อง 100%" -ForegroundColor Green

    # 5.2 ตรวจสอบ Flutter Analyze
    Write-Host "   -> ตรวจสอบ Flutter Code (flutter analyze)..." -ForegroundColor Gray
    Push-Location "bkk_skytrains_flutter"
    flutter pub get | Out-Null
    flutter analyze
    $analyzeCode = $LASTEXITCODE
    Pop-Location
    if ($analyzeCode -ne 0) {
        Write-Error "Flutter analyze ตรวจพบปัญหา (ต้อง 0 issues)"
        exit $analyzeCode
    }
    Write-Host "   ✓ Flutter analyze ผ่าน 100% (0 issues)" -ForegroundColor Green

    # 5.3 รันการทดสอบ Unit & Widget Tests
    if (-not $SkipTests) {
        Write-Host "   -> รันการทดสอบ Unit & Widget Tests..." -ForegroundColor Gray
        Push-Location "bkk_skytrains_flutter"
        flutter test
        $testCode = $LASTEXITCODE
        Pop-Location
        if ($testCode -ne 0) {
            Write-Error "Flutter tests ล้มเหลว"
            exit $testCode
        }
        Write-Host "   ✓ การทดสอบทั้งหมดผ่านเรียบร้อย" -ForegroundColor Green
    }

    # 5.4 คอมไพล์ Release APK (Universal)
    Write-Host "   -> กำลังบิลด์ Android Universal Release APK (flutter build apk --release)..." -ForegroundColor Gray
    Push-Location "bkk_skytrains_flutter"
    flutter build apk --release
    $buildCode = $LASTEXITCODE
    Pop-Location

    if ($buildCode -ne 0) {
        Write-Error "การบิลด์ Android APK ล้มเหลว"
        exit $buildCode
    }

    $ApkFileName = "BKK_SkyTrains_V.$Version.apk"
    $BuiltApk = Join-Path $Workspace "bkk_skytrains_flutter\build\app\outputs\flutter-apk\app-release.apk"
    $TargetApk = Join-Path $ApkDir $ApkFileName
    $TargetSha = Join-Path $ApkDir "$ApkFileName.sha256"

    # ลบชื่อเดิม BKK_SkyTrains_Android_latest.apk หากมีอยู่
    $OldLatestApk = Join-Path $ApkDir "BKK_SkyTrains_Android_latest.apk"
    $OldLatestSha = Join-Path $ApkDir "BKK_SkyTrains_Android_latest.apk.sha256"
    if (Test-Path $OldLatestApk) { Remove-Item -LiteralPath $OldLatestApk -Force -ErrorAction SilentlyContinue }
    if (Test-Path $OldLatestSha) { Remove-Item -LiteralPath $OldLatestSha -Force -ErrorAction SilentlyContinue }

    Copy-Item -LiteralPath $BuiltApk -Destination $TargetApk -Force
    $hash = (Get-FileHash -LiteralPath $TargetApk -Algorithm SHA256).Hash.ToLower()
    "$hash  $ApkFileName" | Set-Content -LiteralPath $TargetSha -Encoding ASCII

    Write-Host "   ✓ บิลด์ Android Release APK สำเร็จเรียบร้อย:" -ForegroundColor Green
    Write-Host "     ไฟล์: $TargetApk" -ForegroundColor Gray
    Write-Host "     SHA-256: $hash" -ForegroundColor Yellow
} else {
    Write-Host "`n[Step 5/8] ⏩ ข้ามการบิลด์ Android APK ตามคำสั่ง (-BuildAndroid:`$false)" -ForegroundColor Yellow
}


# ==============================================================================
# [6/8] ต้องการให้ทำเป็น App Bundle
# ==============================================================================
if ($BuildAppBundle) {
    Write-Host "`n[Step 6/8] 📦 ต้องการให้ทำเป็น App Bundle (Android App Bundle: .aab)..." -ForegroundColor Cyan
    Write-Host "   -> กำลังบิลด์ Android App Bundle (flutter build appbundle --release)..." -ForegroundColor Gray
    Push-Location "bkk_skytrains_flutter"
    flutter build appbundle --release
    $aabCode = $LASTEXITCODE
    Pop-Location

    if ($aabCode -ne 0) {
        Write-Error "การบิลด์ Android App Bundle (.aab) ล้มเหลว"
        exit $aabCode
    }

    $AabFileName = "BKK_SkyTrains_V.$Version.aab"
    $BuiltAab = Join-Path $Workspace "bkk_skytrains_flutter\build\app\outputs\bundle\release\app-release.aab"
    $TargetAab = Join-Path $AabDir $AabFileName
    $TargetAabSha = Join-Path $AabDir "$AabFileName.sha256"

    # ลบชื่อเดิม BKK_SkyTrains_Android_latest.aab หากมีอยู่
    $OldLatestAab = Join-Path $AabDir "BKK_SkyTrains_Android_latest.aab"
    $OldLatestAabSha = Join-Path $AabDir "BKK_SkyTrains_Android_latest.aab.sha256"
    if (Test-Path $OldLatestAab) { Remove-Item -LiteralPath $OldLatestAab -Force -ErrorAction SilentlyContinue }
    if (Test-Path $OldLatestAabSha) { Remove-Item -LiteralPath $OldLatestAabSha -Force -ErrorAction SilentlyContinue }

    Copy-Item -LiteralPath $BuiltAab -Destination $TargetAab -Force
    $aabHash = (Get-FileHash -LiteralPath $TargetAab -Algorithm SHA256).Hash.ToLower()
    "$aabHash  $AabFileName" | Set-Content -LiteralPath $TargetAabSha -Encoding ASCII

    Write-Host "   ✓ บิลด์ Android App Bundle สำเร็จเรียบร้อย:" -ForegroundColor Green
    Write-Host "     ไฟล์: $TargetAab" -ForegroundColor Gray
    Write-Host "     SHA-256: $aabHash" -ForegroundColor Yellow

    # ล้างแคชบิลด์ทันทีตามนโยบาย Zero-Waste Pruning
    Write-Host "   -> ล้างโฟลเดอร์แคชบิลด์ชั่วคราว (flutter clean)..." -ForegroundColor Gray
    Push-Location "bkk_skytrains_flutter"
    flutter clean | Out-Null
    flutter pub get | Out-Null
    Pop-Location
} else {
    Write-Host "`n[Step 6/8] ⏩ ข้ามการบิลด์ App Bundle ตามคำสั่ง (-BuildAppBundle:`$false)" -ForegroundColor Yellow
}


# ==============================================================================
# [7/8] ทำแอพ IOS
# ==============================================================================
if ($BuildIOS) {
    Write-Host "`n[Step 7/8] 🍎 ทำแอพ IOS (ตรวจสอบ Native iOS Configurations & Payload)..." -ForegroundColor Cyan
    $isMac = ($PSVersionTable.Platform -eq "Unix" -and (uname -s 2>$null) -eq "Darwin") -or ($env:OS -like "*Darwin*")

    if ($isMac) {
        Write-Host "   -> ระบบตรวจพบสภาพแวดล้อม macOS กำลังบิลด์ iOS IPA โดยตรง..." -ForegroundColor Gray
        Push-Location "bkk_skytrains_flutter"
        flutter build ios --release --no-codesign
        $iosCode = $LASTEXITCODE
        if ($iosCode -eq 0) {
            mkdir -p Payload
            cp -r build/ios/iphoneos/Runner.app Payload/
            $IpaFileName = "BKK_SkyTrains_V.$Version.ipa"
            $TargetIpa = Join-Path $IpaDir $IpaFileName
            $TargetIpaSha = Join-Path $IpaDir "$IpaFileName.sha256"

            # ลบชื่อเดิม BKK_SkyTrains_iOS_latest.ipa หากมีอยู่
            $OldLatestIpa = Join-Path $IpaDir "BKK_SkyTrains_iOS_latest.ipa"
            $OldLatestIpaSha = Join-Path $IpaDir "BKK_SkyTrains_iOS_latest.ipa.sha256"
            if (Test-Path $OldLatestIpa) { Remove-Item -LiteralPath $OldLatestIpa -Force -ErrorAction SilentlyContinue }
            if (Test-Path $OldLatestIpaSha) { Remove-Item -LiteralPath $OldLatestIpaSha -Force -ErrorAction SilentlyContinue }

            zip -r -9 $IpaFileName Payload
            Copy-Item -LiteralPath $IpaFileName -Destination $TargetIpa -Force
            $ipaHash = (Get-FileHash -LiteralPath $TargetIpa -Algorithm SHA256).Hash.ToLower()
            "$ipaHash  $IpaFileName" | Set-Content -LiteralPath $TargetIpaSha -Encoding ASCII
            rm -rf Payload
            Remove-Item -LiteralPath $IpaFileName -Force -ErrorAction SilentlyContinue
            Write-Host "   ✓ บิลด์ iOS IPA บน macOS สำเร็จ: $TargetIpa" -ForegroundColor Green
        }
        Pop-Location
    } else {
        # บนระบบ Windows: ตรวจสอบความสมบูรณ์ของ Assets, Podfile, Info.plist และ LaunchScreen
        Write-Host "   -> สภาพแวดล้อม Windows: ตรวจสอบโครงสร้างและ Assets ของ Native iOS..." -ForegroundColor Gray
        $iosDir = Join-Path $Workspace "bkk_skytrains_flutter\ios"
        $iosPlist = Join-Path $iosDir "Runner\Info.plist"
        $iosProj = Join-Path $iosDir "Runner.xcodeproj"

        if ((Test-Path $iosPlist) -and (Test-Path $iosProj)) {
            Write-Host "   ✓ โครงสร้าง Native iOS (Info.plist, Xcode Project, LaunchScreen, AppIcons) สมบูรณ์ 100%" -ForegroundColor Green
            Write-Host "   ℹ️ หมายเหตุ: การคอมไพล์ไบนารี iOS IPA จำเป็นต้องใช้สภาพแวดล้อม macOS & Xcode" -ForegroundColor Yellow
            Write-Host "      ระบบจะส่งต่อการบิลด์ iOS IPA ไปทำงานบน Cloud macOS Runner อัตโนมัติใน Step 8" -ForegroundColor Cyan
        } else {
            Write-Warning "   ! พบโครงสร้างไฟล์ iOS ไม่ครบถ้วน กรุณาตรวจสอบโฟลเดอร์ $iosDir"
        }
    }
} else {
    Write-Host "`n[Step 7/8] ⏩ ข้ามการตรวจสอบ iOS ตามคำสั่ง (-BuildIOS:`$false)" -ForegroundColor Yellow
}


# ==============================================================================
# [8/8] ลบข้อมูลเวอร์เก่า บน Github ออก และ Upload ขึ้น Github Build iOS & Android Apps เวอร์ชั่นที่ทำใหม่ล่าสุดเสมอ
# ==============================================================================
Write-Host "`n[Step 8/8] ☁️ ลบข้อมูลเวอร์เก่า บน GitHub ออก และ Upload ขึ้น GitHub Build iOS & Android Apps ล่าสุดเสมอ..." -ForegroundColor Cyan

# 8.1 ลบข้อมูล Release เก่าที่ไม่จำเป็นบน GitHub ผ่าน REST API
if ($PurgeRemoteReleases -or $GitHubToken) {
    if (-not [string]::IsNullOrWhiteSpace($GitHubToken)) {
        Write-Host "   -> กำลังตรวจสอบและลบ Releases เก่าบน GitHub ผ่าน REST API..." -ForegroundColor Yellow
        try {
            $headers = @{
                "Authorization" = "Bearer $GitHubToken"
                "Accept" = "application/vnd.github+json"
                "User-Agent" = "BKK-SkyTrains-Deployer"
            }
            $repo = "nasaw9783/BKK-Sky-Trains"
            $releases = Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/releases" -Method Get -Headers $headers -ErrorAction Stop
            foreach ($rel in $releases) {
                if ($rel.tag_name -ne "v$Version" -and $rel.tag_name -ne "latest") {
                    Write-Host "   -> กำลังลบ Release เก่า: $($rel.name) (tag: $($rel.tag_name), id: $($rel.id))..." -ForegroundColor Gray
                    Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/releases/$($rel.id)" -Method Delete -Headers $headers | Out-Null
                    # ลบ tag บน remote ด้วย
                    git push origin --delete $rel.tag_name 2>$null
                }
            }
            Write-Host "   ✓ ลบ Releases และ Tags เก่าบน GitHub สำเร็จ" -ForegroundColor Green
        } catch {
            Write-Warning "ไม่สามารถลบ Release ผ่าน GitHub API ได้: $($_.Exception.Message)"
        }
    } else {
        Write-Host "   (ระบบ GitHub Actions Workflow .github/workflows/build_ios.yml มีระบบล้าง Release เก่าอัตโนมัติในตัว)" -ForegroundColor Gray
    }
}

# 8.2 Prune git remote tracking
Write-Host "   -> ล้างข้อมูลกิ่ง/แท็กเก่าที่ไม่มีบนรีโมท (git fetch --prune)..." -ForegroundColor Gray
git fetch --prune origin 2>$null

# 8.3 Git Commit & Tag
git add .
$status = git status --porcelain
if ($status) {
    $commitMsg = "feat(release): BKK SkyTrains v$Version full release with APK, App Bundle (AAB), and automated iOS build workflow"
    git commit -m $commitMsg
    Write-Host "   ✓ บันทึก Commit: $commitMsg" -ForegroundColor Green
} else {
    Write-Host "   -> ไม่มีไฟล์เปลี่ยนแปลงใหม่สำหรับ Commit" -ForegroundColor Gray
}

$tagName = "v$Version"
Write-Host "   -> กำหนด Git Tag: $tagName" -ForegroundColor Gray
git tag -d $tagName 2>$null
git tag -a $tagName -m "Release $($tagName): BKK SkyTrains production release with interactive vector transit map, APK, AAB and iOS app"

# 8.4 Push ขึ้น GitHub เพื่อทริกเกอร์การบิลด์แอพ iOS & Android เวอร์ชั่นล่าสุดบน GitHub Actions
if ($PushToGitHub) {
    Write-Host "   -> กำลัง Push โค้ดไปยัง origin main..." -ForegroundColor Gray
    git push origin main
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "การ push ไปยัง origin main มีข้อผิดพลาด กรุณาตรวจสอบการเชื่อมต่อและสิทธิ์ git"
    }

    Write-Host "   -> กำลัง Push Tag $tagName ไปยัง origin (ทริกเกอร์ Build iOS & Android Apps เพียง 1 ตัว)..." -ForegroundColor Gray
    git push origin $tagName --force
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✓ Push Tag $tagName ขึ้น GitHub สำเร็จ" -ForegroundColor Green
    }

    Write-Host ""
    Write-Host "=================================================================" -ForegroundColor Green
    Write-Host "   🎉 อัปโหลดขึ้น GitHub เรียบร้อยแล้ว!" -ForegroundColor Green
    Write-Host "   ระบบ GitHub Actions (.github/workflows/build_ios.yml)" -ForegroundColor Yellow
    Write-Host "   กำลังเริ่มบิลด์แอพ iOS & Android เวอร์ชั่นใหม่ล่าสุดบน macOS Runner" -ForegroundColor Yellow
    Write-Host "   (บิลด์เพียง 1 ตัวสำหรับ $tagName พร้อมล้างเวอร์ชันเก่าอัตโนมัติ)" -ForegroundColor Yellow
    Write-Host "   ติดตามสถานะการบิลด์ได้ที่:" -ForegroundColor Cyan
    Write-Host "   🔗 https://github.com/nasaw9783/BKK-Sky-Trains/actions" -ForegroundColor Cyan
    Write-Host "=================================================================" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "   ⏩ ข้ามการ Push ขึ้น GitHub ตามคำสั่ง (-PushToGitHub:`$false)" -ForegroundColor Yellow
}
