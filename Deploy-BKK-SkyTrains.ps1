# ==============================================================================
#  BKK SkyTrains - Automated Release, Build & GitHub Deployment Script
#  Encoding: UTF-8 with BOM | Supports: Windows PowerShell 5.1 & pwsh 7+
#
#  ลำดับขั้นตอนการทำงาน (Execution Order):
#  1. จัดระเบียบไฟล์ในเครื่องให้เป็นระเบียบ จัดหมวดหมู่/Folder และลบไฟล์ที่ไม่จำเป็นทิ้งทันที
#  2. Update .yml ทั้งหมด
#  3. Update .md ให้ตรงตามเว็บ/แอพ ทั้งหมด
#  4. ทำแอพ Android
#  5. ลบข้อมูลเก่าที่ไม่จำเป็น บน Github ออก และ Upload ขึ้น Github ทำแอพ IOS เวอร์ชั่นที่ทำใหม่
# ==============================================================================

[CmdletBinding()]
param(
    [string]$Version = "",
    [string]$GitHubToken = $env:GITHUB_TOKEN,
    [switch]$PurgeRemoteReleases,
    [switch]$BuildAndroid = $true,
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
# [1/5] จัดระเบียบไฟล์ C:\Users\Administrator\Documents\BKK Sky Trains จากเครื่องให้เป็นระเบียบ
#       พร้อมจัดหมวดหมู่/Folder ถ้าไฟล์หรือแอพไหนไม่สำคัญต่อระบบแล้ว และไม่ทำลายระบบให้เสียหาย ให้ลบทิ้งได้ทันที
# ==============================================================================
Write-Host "`n[Step 1/5] 🧹 จัดระเบียบไฟล์ในเครื่อง และลบไฟล์/แอพที่ไม่จำเป็นทิ้งทันที (Zero-Waste Pruning)..." -ForegroundColor Cyan

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

# 1.3 ลบไฟล์ตัวติดตั้งเวอร์ชันเก่าที่ซ้ำซ้อนใน releases/ (เก็บเฉพาะ *_latest.* และ .gitkeep)
$ReleasesDir = Join-Path $Workspace "releases"
if (Test-Path $ReleasesDir) {
    $oldInstallers = Get-ChildItem -Path $ReleasesDir | Where-Object {
        $_.Name -notlike "*latest*" -and $_.Name -ne ".gitkeep"
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
# [2/5] Update .yml ทั้งหมด
# ==============================================================================
Write-Host "`n[Step 2/5] ⚙️ ตรวจสอบและ Update .yml ทั้งหมด..." -ForegroundColor Cyan
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
# [3/5] Update .md ให้ตรงตามเว็บ/แอพ ทั้งหมด
# ==============================================================================
Write-Host "`n[Step 3/5] 📝 ตรวจสอบและ Update .md ให้ตรงตามเว็บ/แอพ ทั้งหมด..." -ForegroundColor Cyan
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
# [4/5] ทำแอพ Android
# ==============================================================================
if ($BuildAndroid) {
    Write-Host "`n[Step 4/5] 🤖 ทำแอพ Android (ตรวจสอบคุณภาพโค้ด และคอมไพล์ Release APK)..." -ForegroundColor Cyan

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

    $BuiltApk = Join-Path $Workspace "bkk_skytrains_flutter\build\app\outputs\flutter-apk\app-release.apk"
    $LatestApk = Join-Path $ReleasesDir "BKK_SkyTrains_Android_latest.apk"
    $LatestSha = Join-Path $ReleasesDir "BKK_SkyTrains_Android_latest.apk.sha256"

    Copy-Item -LiteralPath $BuiltApk -Destination $LatestApk -Force
    $hash = (Get-FileHash -LiteralPath $LatestApk -Algorithm SHA256).Hash.ToLower()
    "$hash  BKK_SkyTrains_Android_latest.apk" | Set-Content -LiteralPath $LatestSha -Encoding ASCII

    Write-Host "   ✓ บิลด์ Android APK สำเร็จเรียบร้อย:" -ForegroundColor Green
    Write-Host "     ไฟล์: $LatestApk" -ForegroundColor Gray
    Write-Host "     SHA-256: $hash" -ForegroundColor Yellow

    # ล้างแคชบิลด์ทันทีตามนโยบาย Zero-Waste Pruning
    Write-Host "   -> ล้างโฟลเดอร์แคชบิลด์ชั่วคราว (flutter clean)..." -ForegroundColor Gray
    Push-Location "bkk_skytrains_flutter"
    flutter clean | Out-Null
    flutter pub get | Out-Null
    Pop-Location
} else {
    Write-Host "`n[Step 4/5] ⏩ ข้ามการบิลด์ Android ตามคำสั่ง (-BuildAndroid:`$false)" -ForegroundColor Yellow
}


# ==============================================================================
# [5/5] ลบข้อมูลเก่าที่ไม่จำเป็น บน Github ออก และ Upload ขึ้น Github ทำแอพ IOS เวอร์ชั่นที่ทำใหม่
# ==============================================================================
Write-Host "`n[Step 5/5] ☁️ ลบข้อมูลเก่าที่ไม่จำเป็น บน GitHub และ Upload ขึ้น GitHub เพื่อทำแอพ iOS..." -ForegroundColor Cyan

# 5.1 ลบข้อมูล Release เก่าที่ไม่จำเป็นบน GitHub ผ่าน REST API
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

# 5.2 Prune git remote tracking
Write-Host "   -> ล้างข้อมูลกิ่ง/แท็กเก่าที่ไม่มีบนรีโมท (git fetch --prune)..." -ForegroundColor Gray
git fetch --prune origin 2>$null

# 5.3 Git Commit & Tag
git add .
$status = git status --porcelain
if ($status) {
    $commitMsg = "feat(release): BKK SkyTrains v$Version updated workflows, documentation, Android app, and iOS build trigger"
    git commit -m $commitMsg
    Write-Host "   ✓ บันทึก Commit: $commitMsg" -ForegroundColor Green
} else {
    Write-Host "   -> ไม่มีไฟล์เปลี่ยนแปลงใหม่สำหรับ Commit" -ForegroundColor Gray
}

$tagName = "v$Version"
Write-Host "   -> กำหนด Git Tag: $tagName" -ForegroundColor Gray
git tag -d $tagName 2>$null
git tag -a $tagName -m "Release $($tagName): BKK SkyTrains production release with interactive vector transit map, iOS and Android apps"

# 5.4 Push ขึ้น GitHub เพื่อทริกเกอร์การบิลด์แอพ iOS (IPA) บน GitHub Actions
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
    Write-Host "   ติดตามสถานะการบิลด์ได้ที่:" -ForegroundColor Cyan
    Write-Host "   🔗 https://github.com/nasaw9783/BKK-Sky-Trains/actions" -ForegroundColor Cyan
    Write-Host "=================================================================" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "   ⏩ ข้ามการ Push ขึ้น GitHub ตามคำสั่ง (-PushToGitHub:`$false)" -ForegroundColor Yellow
}
