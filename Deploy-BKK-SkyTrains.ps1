# ==============================================================================
#  BKK SkyTrains - Automated Release, Build & GitHub Deployment Script
#  Encoding: UTF-8 with BOM | Supports: Windows PowerShell 5.1 & pwsh 7+
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

# 1. Force UTF-8 Encoding
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

# 2. Set Workspace Root
$Workspace = $PSScriptRoot
if (-not $Workspace) { $Workspace = (Get-Location).Path }
Set-Location -LiteralPath $Workspace

Write-Host ""
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "   🚀 BKK SKYTRAINs - Unified Release & GitHub Deployment" -ForegroundColor Green
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host ""

# 3. Detect / Validate Version
$PubspecPath = Join-Path $Workspace "bkk_skytrains_flutter\pubspec.yaml"
if (-not (Test-Path $PubspecPath)) {
    Write-Error "ไม่พบไฟล์ $PubspecPath"
    exit 1
}

$PubspecContent = Get-Content -LiteralPath $PubspecPath -Raw
if ($PubspecContent -match 'version:\s*([0-9]+\.[0-9]+\.[0-9]+)') {
    $DetectedVersion = $matches[1]
} else {
    $DetectedVersion = "1.3.6"
}

if ([string]::IsNullOrWhiteSpace($Version)) {
    $Version = $DetectedVersion
}
Write-Host "📦 กำลังดำเนินการเวอร์ชัน: v$Version" -ForegroundColor Yellow

# 4. Dual-Asset Synchronization
Write-Host "`n[Step 1/6] 🔄 กำลังซิงค์ไฟล์ Web Assets ไปยัง Flutter (Dual-Asset Sync)..." -ForegroundColor Cyan
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
        Write-Host "   -> ซิงค์: $item" -ForegroundColor Gray
    }
}
Write-Host "   ✓ ซิงค์ไฟล์ครบถ้วน 100%" -ForegroundColor Green

# 5. Code Quality Gates
Write-Host "`n[Step 2/6] 🔍 ตรวจสอบคุณภาพโค้ด (Validation & Linting)..." -ForegroundColor Cyan
Write-Host "   -> ตรวจสอบ JavaScript Syntax (node --check)..." -ForegroundColor Gray
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
Write-Host "   ✓ ไวยากรณ์ JavaScript ผ่าน 100%" -ForegroundColor Green

Write-Host "   -> ตรวจสอบ Flutter Code (flutter analyze)..." -ForegroundColor Gray
Push-Location "bkk_skytrains_flutter"
flutter analyze
$analyzeCode = $LASTEXITCODE
Pop-Location
if ($analyzeCode -ne 0) {
    Write-Error "Flutter analyze ตรวจพบปัญหา (ต้อง 0 issues)"
    exit $analyzeCode
}
Write-Host "   ✓ Flutter analyze ผ่าน 100% (0 issues)" -ForegroundColor Green

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

# 6. Build Android App Locally (if requested)
if ($BuildAndroid) {
    Write-Host "`n[Step 3/6] 🤖 กำลังคอมไพล์และบิลด์แอป Android (Flutter Release APK)..." -ForegroundColor Cyan
    Push-Location "bkk_skytrains_flutter"
    flutter build apk --release
    $buildCode = $LASTEXITCODE
    Pop-Location

    if ($buildCode -ne 0) {
        Write-Error "การบิลด์ Android APK ล้มเหลว"
        exit $buildCode
    }

    $BuiltApk = Join-Path $Workspace "bkk_skytrains_flutter\build\app\outputs\flutter-apk\app-release.apk"
    $ReleasesDir = Join-Path $Workspace "releases"
    if (-not (Test-Path $ReleasesDir)) { New-Item -ItemType Directory -Path $ReleasesDir -Force | Out-Null }

    $LatestApk = Join-Path $ReleasesDir "BKK_SkyTrains_Android_latest.apk"
    $LatestSha = Join-Path $ReleasesDir "BKK_SkyTrains_Android_latest.apk.sha256"

    Copy-Item -LiteralPath $BuiltApk -Destination $LatestApk -Force
    $hash = (Get-FileHash -LiteralPath $LatestApk -Algorithm SHA256).Hash.ToLower()
    "$hash  BKK_SkyTrains_Android_latest.apk" | Set-Content -LiteralPath $LatestSha -Encoding ASCII

    Write-Host "   ✓ บิลด์ Android APK สำเร็จ:" -ForegroundColor Green
    Write-Host "     ไฟล์: $LatestApk" -ForegroundColor Gray
    Write-Host "     SHA-256: $hash" -ForegroundColor Yellow

    # Zero-Waste Clean build folder
    Write-Host "   -> ล้างโฟลเดอร์แคชบิลด์ชั่วคราว (flutter clean)..." -ForegroundColor Gray
    Push-Location "bkk_skytrains_flutter"
    flutter clean | Out-Null
    flutter pub get | Out-Null
    Pop-Location
} else {
    Write-Host "`n[Step 3/6] ⏩ ข้ามการบิลด์ Android ตามคำสั่ง (-BuildAndroid:$false)" -ForegroundColor Yellow
}

# 7. Clean up unnecessary old data on GitHub / Releases
Write-Host "`n[Step 4/6] 🧹 ตรวจสอบและทำความสะอาดข้อมูลเก่าที่ไม่จำเป็น (Zero-Waste Pruning)..." -ForegroundColor Cyan
$ReleasesDir = Join-Path $Workspace "releases"
if (Test-Path $ReleasesDir) {
    # Keep only latest packages and gitkeep
    $oldFiles = Get-ChildItem -Path $ReleasesDir | Where-Object {
        $_.Name -notlike "*latest*" -and $_.Name -ne ".gitkeep"
    }
    foreach ($f in $oldFiles) {
        Write-Host "   -> ลบไฟล์ตัวติดตั้งเก่าซ้ำซ้อน: $($f.Name)" -ForegroundColor Gray
        Remove-Item -LiteralPath $f.FullName -Force -ErrorAction SilentlyContinue
    }
}

if ($PurgeRemoteReleases -or $GitHubToken) {
    if (-not [string]::IsNullOrWhiteSpace($GitHubToken)) {
        Write-Host "   -> กำลังตรวจสอบและลบ Releases เก่าที่ไม่จำเป็นบน GitHub ผ่าน REST API..." -ForegroundColor Yellow
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
                    Write-Host "   -> กำลังลบ GitHub Release เก่า: $($rel.name) (tag: $($rel.tag_name), id: $($rel.id))..." -ForegroundColor Gray
                    Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/releases/$($rel.id)" -Method Delete -Headers $headers | Out-Null
                }
            }
            Write-Host "   ✓ ทำความสะอาด Releases เก่าบน GitHub สำเร็จ" -ForegroundColor Green
        } catch {
            Write-Warning "ไม่สามารถลบ Release ผ่าน GitHub API ได้: $($_.Exception.Message)"
        }
    } else {
        Write-Host "   (หากต้องการให้สคริปต์ลบ Release เก่าบน GitHub อัตโนมัติ ให้ระบุ -GitHubToken <TOKEN> หรือตั้งค่า `$env:GITHUB_TOKEN)" -ForegroundColor Gray
    }
}

# 8. Git Commit & Tag
Write-Host "`n[Step 5/6] 📝 จัดเตรียมและบันทึกการเปลี่ยนแปลง (Git Commit & Tag)..." -ForegroundColor Cyan
git add .
$status = git status --porcelain
if ($status) {
    $commitMsg = "feat(release): BKK SkyTrains v$Version with Transit Blueprint Map, interactive hotspots, and updated iOS & Android builds"
    git commit -m $commitMsg
    Write-Host "   ✓ บันทึก Commit: $commitMsg" -ForegroundColor Green
} else {
    Write-Host "   -> ไม่มีไฟล์เปลี่ยนแปลงใหม่สำหรับ Commit" -ForegroundColor Gray
}

# Update git tag
$tagName = "v$Version"
Write-Host "   -> กำหนด Git Tag: $tagName" -ForegroundColor Gray
git tag -d $tagName 2>$null
git tag -a $tagName -m "Release $($tagName): BKK SkyTrains production release with interactive vector transit map, iOS and Android apps"

# 9. Upload & Push to GitHub
if ($PushToGitHub) {
    Write-Host "`n[Step 6/6] ☁️ อัปโหลดขึ้น GitHub เพื่อทริกเกอร์สร้างแอพ iOS & Android (GitHub Actions)..." -ForegroundColor Cyan
    Write-Host "   -> Push commit ไปยัง origin main..." -ForegroundColor Gray
    git push origin main
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "การ push ไปยัง origin main มีข้อผิดพลาด กรุณาตรวจสอบสิทธิ์ของ git"
    }

    Write-Host "   -> Push tag $tagName ไปยัง origin..." -ForegroundColor Gray
    git push origin $tagName --force
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✓ Push Tag $tagName ขึ้น GitHub สำเร็จ" -ForegroundColor Green
    }

    Write-Host ""
    Write-Host "=================================================================" -ForegroundColor Green
    Write-Host "   🎉 อัปโหลดขึ้น GitHub เรียบร้อยแล้ว!" -ForegroundColor Green
    Write-Host "   ระบบ GitHub Actions (.github/workflows/build_ios.yml)" -ForegroundColor Yellow
    Write-Host "   กำลังเริ่มบิลด์แอพ iOS (IPA) และ Android (APK) บน macOS Runner" -ForegroundColor Yellow
    Write-Host "   ติดตามสถานะการบิลด์ได้ที่:" -ForegroundColor Cyan
    Write-Host "   🔗 https://github.com/nasaw9783/BKK-Sky-Trains/actions" -ForegroundColor Cyan
    Write-Host "=================================================================" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "`n[Step 6/6] ⏩ ข้ามการ Push ขึ้น GitHub ตามคำสั่ง (-PushToGitHub:$false)" -ForegroundColor Yellow
}
