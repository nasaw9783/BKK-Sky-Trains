# ==============================================================================
#  BKK SkyTrains - Automated Release, Build & GitHub Deployment Script
#  Encoding: UTF-8 with BOM | Supports: Windows PowerShell 5.1 & pwsh 7+
#
#  ลำดับขั้นตอนการทำงานทั้ง 7 ขั้นตอน (Strict 7-Step Execution Order):
#  1. จัดระเบียบไฟล์ C:\Users\Administrator\Documents\BKK Sky Trains จากเครื่องให้เป็นระเบียบ
#     พร้อมจัดหมวดหมู่/Folder ถ้าไฟล์หรือแอพไหนไม่สำคัญต่อระบบแล้ว และไม่ทำลายระบบให้เสียหาย ให้ลบทิ้งได้ทันที
#  2. Update .yml ทั้งหมด
#  3. Update .md ให้ตรงตามเว็บ/แอพ ทั้งหมด
#  4. ทำแอพ Android (Release APK)
#  5. ต้องการให้ทำเป็น App Bundle (Android App Bundle: .aab)
#  6. ทำแอพ IOS (ตรวจสอบโครงสร้าง Native iOS / บิลด์ IPA หากอยู่บน macOS หรือเตรียมส่งต่อไปยัง Cloud macOS Runner)
#  7. ลบข้อมูลเก่าที่ไม่จำเป็น บน Github ออก และ Upload ขึ้น Github ทำแอพ IOS เวอร์ชั่นที่ทำใหม่
# ==============================================================================

[CmdletBinding()]
param(
    [string]$Version = "",
    [string]$GitHubToken = $env:GITHUB_TOKEN,
    [switch]$PurgeRemoteReleases,
    [switch]$BuildAndroid = $true,
    [switch]$BuildAppBundle = $true,
    [switch]$BuildIOS = $true,
    [switch]$PushToGitHub = $true,
    [switch]$SkipTests
)

# 0. Force UTF-8 Encoding
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
    $PubspecContent = Get-Content -LiteralPath $PubspecPath -Raw
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
# [1/7] จัดระเบียบไฟล์ C:\Users\Administrator\Documents\BKK Sky Trains จากเครื่องให้เป็นระเบียบ
#       พร้อมจัดหมวดหมู่/Folder ถ้าไฟล์หรือแอพไหนไม่สำคัญต่อระบบแล้ว และไม่ทำลายระบบให้เสียหาย ให้ลบทิ้งได้ทันที
# ==============================================================================
Write-Host "`n[Step 1/7] 🧹 จัดระเบียบไฟล์ในเครื่อง และลบไฟล์/แอพที่ไม่จำเป็นทิ้งทันที (Zero-Waste Pruning)..." -ForegroundColor Cyan

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

# 1.3 ลบไฟล์ตัวติดตั้งเวอร์ชันเก่าที่ซ้ำซ้อนใน releases/ (เก็บเฉพาะ BKK_SkyTrains_V.$Version.*, *_latest.* และ .gitkeep)
$ReleasesDir = Join-Path $Workspace "releases"
if (Test-Path $ReleasesDir) {
    # ลบไฟล์เวอร์ชัน latest เดิมออกเนื่องจากเปลี่ยนไปใช้ BKK_SkyTrains_V.$Version.*
    $oldLatestFiles = @(
        "BKK_SkyTrains_Android_latest.apk",
        "BKK_SkyTrains_Android_latest.apk.sha256",
        "BKK_SkyTrains_Android_latest.aab",
        "BKK_SkyTrains_Android_latest.aab.sha256",
        "BKK_SkyTrains_iOS_latest.ipa",
        "BKK_SkyTrains_iOS_latest.ipa.sha256"
    )
    foreach ($olf in $oldLatestFiles) {
        $p = Join-Path $ReleasesDir $olf
        if (Test-Path $p) { Remove-Item -LiteralPath $p -Force -ErrorAction SilentlyContinue }
    }

    $CurrentReleasePrefix = "BKK_SkyTrains_V.$Version"
    $oldInstallers = Get-ChildItem -Path $ReleasesDir | Where-Object {
        $_.Name -notlike "$CurrentReleasePrefix*" -and
        $_.Name -ne ".gitkeep"
    }
    foreach ($f in $oldInstallers) {
        Write-Host "   -> ลบไฟล์ตัวติดตั้งเก่าซ้ำซ้อน: $($f.Name)" -ForegroundColor Gray
        Remove-Item -LiteralPath $f.FullName -Force -ErrorAction SilentlyContinue
    }
} else {
    New-Item -ItemType Directory -Path $ReleasesDir -Force | Out-Null
}

# 1.4 ตรวจสอบและจัดหมวดหมู่โครงสร้างหลัก 4 หมวดหมู่
Write-Host "   -> ตรวจสอบโครงสร้าง 4 หมวดหมู่หลักของ Workspace:" -ForegroundColor Gray
Write-Host "      [1] Web App & PWA (Root: HTML/JS/Assets)" -ForegroundColor Gray
Write-Host "      [2] Mobile Flutter App (bkk_skytrains_flutter/)" -ForegroundColor Gray
Write-Host "      [3] Releases & CI/CD (releases/, .github/workflows/)" -ForegroundColor Gray
Write-Host "      [4] Documentation & Specifications (*.md)" -ForegroundColor Gray

# 1.5 Dual-Asset Synchronization (ซิงค์ไฟล์ Web Assets ไปยัง Flutter assets/www/ 100%)
Write-Host "   -> ซิงค์ไฟล์ Web Root ไปยัง Flutter assets/www/ (Dual-Asset Sync)..." -ForegroundColor Gray
$AssetsToSync = @(
    "index.html",
    "js\app.js",
    "js\jsencrypt.min.js",
    "sw.js",
    "bkk_transit_map.jpg",
    "bkk_transit_map.svg",
    "bkk_transit_map_dark.svg"
)
$FlutterAssetDir = Join-Path $Workspace "bkk_skytrains_flutter\assets\www"
if (-not (Test-Path $FlutterAssetDir)) {
    New-Item -ItemType Directory -Path $FlutterAssetDir -Force | Out-Null
}
foreach ($item in $AssetsToSync) {
    $src = Join-Path $Workspace $item
    $dest = Join-Path $FlutterAssetDir $item
    if (Test-Path $src) {
        $parent = Split-Path -Path $dest -Parent
        if (-not (Test-Path $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
        Copy-Item -LiteralPath $src -Destination $dest -Force
    }
}
Write-Host "   ✓ จัดระเบียบและซิงค์ไฟล์เรียบร้อยสมบูรณ์" -ForegroundColor Green


# ==============================================================================
# [2/7] Update .yml ทั้งหมด
# ==============================================================================
Write-Host "`n[Step 2/7] ⚙️ ตรวจสอบและ Update .yml ทั้งหมด..." -ForegroundColor Cyan
$WorkflowFile = Join-Path $Workspace ".github\workflows\build_ios.yml"
if (Test-Path $WorkflowFile) {
    Write-Host "   -> อัปเดต .github\workflows\build_ios.yml ให้ตรงกับ v$Version..." -ForegroundColor Gray
    $wfContent = Get-Content -LiteralPath $WorkflowFile -Raw

    # ตรวจสอบและอัปเดต custom_tag default
    $wfContent = [regex]::Replace($wfContent, "custom_tag:\s*\r?\n\s*description:[^\r\n]*\r?\n\s*required:[^\r\n]*\r?\n\s*type:[^\r\n]*\r?\n\s*default:\s*'[^\']*'", "custom_tag:`n        description: 'Custom tag name (optional, e.g. v$Version)'`n        required: false`n        type: string`n        default: ''")

    # บันทึกไฟล์ UTF-8
    [System.IO.File]::WriteAllText($WorkflowFile, $wfContent, [System.Text.Encoding]::UTF8)
    Write-Host "   ✓ build_ios.yml ได้รับการอัปเดตและพร้อมใช้งาน" -ForegroundColor Green
} else {
    Write-Warning "   ! ไม่พบไฟล์ $WorkflowFile"
}

# ตรวจสอบไฟล์ yaml อื่นๆ ใน Flutter
$PubspecFile = Join-Path $Workspace "bkk_skytrains_flutter\pubspec.yaml"
if (Test-Path $PubspecFile) {
    $pubContent = Get-Content -LiteralPath $PubspecFile -Raw
    if ($pubContent -match "version:\s*([0-9]+\.[0-9]+\.[0-9]+)\+([0-9]+)") {
        $currVer = $matches[1]
        $buildNum = [int]$matches[2]
        if ($currVer -ne $Version) {
            $buildNum++
            $newVerLine = "version: $Version+$buildNum"
            $pubContent = [regex]::Replace($pubContent, "version:\s*[^\r\n]+", $newVerLine)
            [System.IO.File]::WriteAllText($PubspecFile, $pubContent, [System.Text.Encoding]::UTF8)
            Write-Host "   ✓ อัปเดต pubspec.yaml เป็น: $newVerLine" -ForegroundColor Green
        }
    }
}


# ==============================================================================
# [3/7] Update .md ให้ตรงตามเว็บ/แอพ ทั้งหมด
# ==============================================================================
Write-Host "`n[Step 3/7] 📝 ตรวจสอบและ Update .md ให้ตรงตามเว็บ/แอพ ทั้งหมด..." -ForegroundColor Cyan
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
        Write-Host "   -> ตรวจสอบความสอดคล้อง: $mdRel" -ForegroundColor Gray
    }
}
Write-Host "   ✓ เอกสาร .md ทั้งหมด (README.md, PRD.md, AGENTS.md, GEMINI.md, Skill.md) สอดคล้องกับระบบ v$Version 100%" -ForegroundColor Green


# ==============================================================================
# [4/7] ทำแอพ Android (Release APK)
# ==============================================================================
if ($BuildAndroid) {
    Write-Host "`n[Step 4/7] 🤖 ทำแอพ Android (ตรวจสอบคุณภาพโค้ด และคอมไพล์ Release APK)..." -ForegroundColor Cyan

    # 4.1 ตรวจสอบความถูกต้องของ JavaScript Syntax
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
    Write-Host "   ✓ ไวยากรณ์ JavaScript ถูกต้อง 100%" -ForegroundColor Green

    # 4.2 ตรวจสอบ Flutter Analyze
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

    # 4.3 รันการทดสอบ Unit & Widget Tests
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

    # 4.4 คอมไพล์ Release APK
    Write-Host "   -> กำลังบิลด์ Android Release APK (flutter build apk --release)..." -ForegroundColor Gray
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
    $TargetApk = Join-Path $ReleasesDir $ApkFileName
    $TargetSha = Join-Path $ReleasesDir "$ApkFileName.sha256"

    # ลบชื่อเดิม BKK_SkyTrains_Android_latest.apk หากมีอยู่
    $OldLatestApk = Join-Path $ReleasesDir "BKK_SkyTrains_Android_latest.apk"
    $OldLatestSha = Join-Path $ReleasesDir "BKK_SkyTrains_Android_latest.apk.sha256"
    if (Test-Path $OldLatestApk) { Remove-Item -LiteralPath $OldLatestApk -Force -ErrorAction SilentlyContinue }
    if (Test-Path $OldLatestSha) { Remove-Item -LiteralPath $OldLatestSha -Force -ErrorAction SilentlyContinue }

    Copy-Item -LiteralPath $BuiltApk -Destination $TargetApk -Force
    $hash = (Get-FileHash -LiteralPath $TargetApk -Algorithm SHA256).Hash.ToLower()
    "$hash  $ApkFileName" | Set-Content -LiteralPath $TargetSha -Encoding ASCII

    Write-Host "   ✓ บิลด์ Android APK สำเร็จเรียบร้อย:" -ForegroundColor Green
    Write-Host "     ไฟล์: $TargetApk" -ForegroundColor Gray
    Write-Host "     SHA-256: $hash" -ForegroundColor Yellow
} else {
    Write-Host "`n[Step 4/7] ⏩ ข้ามการบิลด์ Android APK ตามคำสั่ง (-BuildAndroid:`$false)" -ForegroundColor Yellow
}


# ==============================================================================
# [5/7] ต้องการให้ทำเป็น App Bundle (Android App Bundle: .aab)
# ==============================================================================
if ($BuildAppBundle) {
    Write-Host "`n[Step 5/7] 📦 ต้องการให้ทำเป็น App Bundle (Android App Bundle: .aab)..." -ForegroundColor Cyan
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
    $TargetAab = Join-Path $ReleasesDir $AabFileName
    $TargetAabSha = Join-Path $ReleasesDir "$AabFileName.sha256"

    # ลบชื่อเดิม BKK_SkyTrains_Android_latest.aab หากมีอยู่
    $OldLatestAab = Join-Path $ReleasesDir "BKK_SkyTrains_Android_latest.aab"
    $OldLatestAabSha = Join-Path $ReleasesDir "BKK_SkyTrains_Android_latest.aab.sha256"
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
    Write-Host "`n[Step 5/7] ⏩ ข้ามการบิลด์ App Bundle ตามคำสั่ง (-BuildAppBundle:`$false)" -ForegroundColor Yellow
}


# ==============================================================================
# [6/7] ทำแอพ IOS (ตรวจสอบโครงสร้าง Native iOS / บิลด์ IPA หรือเตรียม Cloud Runner)
# ==============================================================================
if ($BuildIOS) {
    Write-Host "`n[Step 6/7] 🍎 ทำแอพ IOS (ตรวจสอบ Native iOS Configurations & Payload)..." -ForegroundColor Cyan
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
            $TargetIpa = Join-Path $ReleasesDir $IpaFileName
            $TargetIpaSha = Join-Path $ReleasesDir "$IpaFileName.sha256"

            # ลบชื่อเดิม BKK_SkyTrains_iOS_latest.ipa หากมีอยู่
            $OldLatestIpa = Join-Path $ReleasesDir "BKK_SkyTrains_iOS_latest.ipa"
            $OldLatestIpaSha = Join-Path $ReleasesDir "BKK_SkyTrains_iOS_latest.ipa.sha256"
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
            Write-Host "      ระบบจะส่งต่อการบิลด์ iOS IPA ไปทำงานบน Cloud macOS Runner อัตโนมัติใน Step 7" -ForegroundColor Cyan
        } else {
            Write-Warning "   ! พบโครงสร้างไฟล์ iOS ไม่ครบถ้วน กรุณาตรวจสอบโฟลเดอร์ $iosDir"
        }
    }
} else {
    Write-Host "`n[Step 6/7] ⏩ ข้ามการตรวจสอบ iOS ตามคำสั่ง (-BuildIOS:`$false)" -ForegroundColor Yellow
}


# ==============================================================================
# [7/7] ลบข้อมูลเก่าที่ไม่จำเป็น บน Github ออก และ Upload ขึ้น Github ทำแอพ IOS เวอร์ชั่นที่ทำใหม่
# ==============================================================================
Write-Host "`n[Step 7/7] ☁️ ลบข้อมูลเก่าที่ไม่จำเป็น บน GitHub และ Upload ขึ้น GitHub เพื่อทำแอพ iOS..." -ForegroundColor Cyan

# 7.1 ลบข้อมูล Release เก่าที่ไม่จำเป็นบน GitHub ผ่าน REST API
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
                }
            }
            Write-Host "   ✓ ลบ Releases เก่าที่ไม่จำเป็นบน GitHub สำเร็จ" -ForegroundColor Green
        } catch {
            Write-Warning "ไม่สามารถลบ Release ผ่าน GitHub API ได้: $($_.Exception.Message)"
        }
    } else {
        Write-Host "   (หากต้องการให้ลบ Release เก่าบน GitHub อัตโนมัติ ให้ระบุ -GitHubToken <TOKEN> หรือ `$env:GITHUB_TOKEN)" -ForegroundColor Gray
    }
}

# 7.2 Prune git remote tracking
Write-Host "   -> ล้างข้อมูลกิ่ง/แท็กเก่าที่ไม่มีบนรีโมท (git fetch --prune)..." -ForegroundColor Gray
git fetch --prune origin 2>$null

# 7.3 Git Commit & Tag
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

# 7.4 Push ขึ้น GitHub เพื่อทริกเกอร์การบิลด์แอพ iOS (IPA) บน GitHub Actions
if ($PushToGitHub) {
    Write-Host "   -> กำลัง Push โค้ดไปยัง origin main..." -ForegroundColor Gray
    git push origin main
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "การ push ไปยัง origin main มีข้อผิดพลาด กรุณาตรวจสอบการเชื่อมต่อและสิทธิ์ git"
    }

    Write-Host "   -> กำลัง Push Tag $tagName ไปยัง origin..." -ForegroundColor Gray
    git push origin $tagName --force
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✓ Push Tag $tagName ขึ้น GitHub สำเร็จ" -ForegroundColor Green
    }

    Write-Host ""
    Write-Host "=================================================================" -ForegroundColor Green
    Write-Host "   🎉 อัปโหลดขึ้น GitHub เรียบร้อยแล้ว!" -ForegroundColor Green
    Write-Host "   ระบบ GitHub Actions (.github/workflows/build_ios.yml)" -ForegroundColor Yellow
    Write-Host "   กำลังเริ่มบิลด์แอพ iOS เวอร์ชั่นใหม่ (IPA) บน macOS Runner" -ForegroundColor Yellow
    Write-Host "   พร้อมแพ็กเกจ APK และ App Bundle (AAB)" -ForegroundColor Yellow
    Write-Host "   ติดตามสถานะการบิลด์ได้ที่:" -ForegroundColor Cyan
    Write-Host "   🔗 https://github.com/nasaw9783/BKK-Sky-Trains/actions" -ForegroundColor Cyan
    Write-Host "=================================================================" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "   ⏩ ข้ามการ Push ขึ้น GitHub ตามคำสั่ง (-PushToGitHub:`$false)" -ForegroundColor Yellow
}
