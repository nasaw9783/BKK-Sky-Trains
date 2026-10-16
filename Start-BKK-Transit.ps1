# ==================================================================
#  BKK SkyTrains - Bangkok Transit Real-Time Web App Launcher
#  Official BKK SkyTrains Live Platform Runner
# ==================================================================

[CmdletBinding()]
param(
    [int]$Port = 3000
)

# 1. Force UTF-8 Encoding in PowerShell Console
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

# 2. Set Working Directory to Script Root
$Workspace = $PSScriptRoot
if ($Workspace) {
    Set-Location -LiteralPath $Workspace
} else {
    $Workspace = (Get-Location).Path
}

# 3. Clean up any existing node server running on the target port
$existingConns = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($existingConns) {
    foreach ($conn in $existingConns) {
        $p = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
        if ($p -and $p.ProcessName -eq 'node') {
            Write-Host "🔄 กำลังรีเซ็ตเซิร์ฟเวอร์เดิมบนพอร์ต $Port (PID: $($p.Id))..." -ForegroundColor Yellow
            Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
            Start-Sleep -Milliseconds 600
        }
    }
}

# 4. Test if Port is Available; if occupied, find next open port
function Get-AvailablePort([int]$startPort) {
    $p = $startPort
    while ($p -lt ($startPort + 50)) {
        try {
            $listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, $p)
            $listener.Start()
            $listener.Stop()
            return $p
        } catch {
            $p++
        }
    }
    return $startPort
}

$ActualPort = Get-AvailablePort -startPort $Port
$AppUrl = "http://localhost:$ActualPort"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " 🚆 กำลังเริ่มต้น BKK SkyTrains - Real-Time Transit Platform" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "📂 ไดเรกทอรีโปรเจกต์ : $Workspace" -ForegroundColor Gray
Write-Host "🌐 พอร์ตที่ใช้งาน   : $ActualPort" -ForegroundColor Gray
Write-Host "กำลังตรวจสอบ Web Server และ Reverse Proxy..." -ForegroundColor Yellow

$nodeCmd = Get-Command node -ErrorAction SilentlyContinue

if ($nodeCmd) {
    Write-Host "✓ ตรวจพบ Node.js: กำลังเริ่ม Local Server พร้อม BTS Live API Proxy..." -ForegroundColor Green

    # Launch browser after brief delay once server starts
    Start-Job -ScriptBlock {
        param($url)
        Start-Sleep -Milliseconds 600
        Start-Process $url
    } -ArgumentList $AppUrl | Out-Null

    $nodeScript = @'
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();
const port = parseInt(process.env.APP_PORT || '3000', 10);

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8'
};

const server = http.createServer((req, res) => {
  // CORS Headers for universal access
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authkey, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const reqUrl = new URL(req.url, 'http://localhost:' + port);

  // Reverse Proxy for BTS Live API endpoints (/api/bts-proxy)
  if (reqUrl.pathname === '/api/bts-proxy') {
    const targetUrl = 'https://bkkskytrain.online' + req.url;
    console.log('[LIVE API ' + req.method + '] ' + reqUrl.search);

    const proxyReq = https.request(targetUrl, {
      method: req.method,
      headers: {
        'content-type': req.headers['content-type'] || 'application/json',
        'authkey': req.headers['authkey'] || '',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    }, proxyRes => {
      res.writeHead(proxyRes.statusCode, {
        'Content-Type': proxyRes.headers['content-type'] || 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      proxyRes.pipe(res);
    });

    proxyReq.on('error', err => {
      console.error('BTS Proxy Error:', err.message);
      res.writeHead(502, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ ErrCode: 502, ErrMessage: 'Gateway error: ' + err.message }));
    });

    req.pipe(proxyReq);
    return;
  }

  // Static File Server
  let cleanUrl = reqUrl.pathname;
  if (cleanUrl === '/' || cleanUrl === '') cleanUrl = '/index.html';
  
  const filePath = path.resolve(rootDir, '.' + cleanUrl);
  if (!filePath.startsWith(rootDir)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Forbidden');
  }
  
  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';
  
  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<h1>404 Not Found</h1><p>The file ' + cleanUrl + ' was not found.</p>');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Server Error: ' + err.code);
      }
    } else {
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(content);
    }
  });
});

server.listen(port, () => {
  console.log('✓ BTS Live Map พร้อมใช้งานแล้วที่: http://localhost:' + port);
  console.log('✓ ระบบ BTS Live Real-Time API Proxy พร้อมทำงาน');
  console.log('  (กด Ctrl+C เพื่อหยุดการทำงานของเซิร์ฟเวอร์)');
});
'@

    $env:APP_PORT = "$ActualPort"
    node -e $nodeScript
} else {
    Write-Host "✓ ตรวจไม่พบ Node.js: กำลังเริ่มเซิร์ฟเวอร์ด้วย Windows PowerShell .NET HttpListener..." -ForegroundColor Green
    Start-Process $AppUrl

    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add("http://localhost:$ActualPort/")
    $listener.Start()
    Write-Host "✓ BTS Live Map พร้อมใช้งานที่: $AppUrl" -ForegroundColor Green
    Write-Host "  (กด Ctrl+C เพื่อหยุดการทำงานของเซิร์ฟเวอร์)" -ForegroundColor Gray

    try {
        while ($listener.IsListening) {
            $context = $listener.GetContext()
            $request = $context.Request
            $response = $context.Response

            $response.AddHeader("Access-Control-Allow-Origin", "*")

            $reqPath = $request.Url.LocalPath.TrimStart('/')
            if ([string]::IsNullOrEmpty($reqPath)) { $reqPath = "index.html" }
            $localFile = Join-Path $Workspace $reqPath

            if (Test-Path $localFile -PathType Leaf) {
                $ext = [System.IO.Path]::GetExtension($localFile).ToLower()
                $contentType = switch ($ext) {
                    ".html" { "text/html; charset=utf-8" }
                    ".js"   { "application/javascript; charset=utf-8" }
                    ".css"  { "text/css; charset=utf-8" }
                    ".json" { "application/json; charset=utf-8" }
                    ".svg"  { "image/svg+xml" }
                    ".png"  { "image/png" }
                    ".ico"  { "image/x-icon" }
                    Default { "application/octet-stream" }
                }
                $response.ContentType = $contentType
                $bytes = [System.IO.File]::ReadAllBytes($localFile)
                $response.ContentLength64 = $bytes.Length
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
            } else {
                $response.StatusCode = 404
                $errBytes = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $reqPath")
                $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
            }
            $response.OutputStream.Close()
        }
    } finally {
        $listener.Stop()
    }
}
