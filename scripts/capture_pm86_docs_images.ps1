param(
  [string]$OutputDir = "docs/images"
)

$ErrorActionPreference = "Stop"

function Get-ConnectedDevices {
  $lines = adb devices
  if ($LASTEXITCODE -ne 0) {
    throw "Khong chay duoc adb. Kiem tra Android Platform Tools."
  }
  return ($lines | Where-Object { $_ -match "\tdevice$" } | ForEach-Object { ($_ -split "\t")[0] })
}

if (!(Test-Path $OutputDir)) {
  New-Item -ItemType Directory -Path $OutputDir | Out-Null
}

$screens = @(
  @{ Name = "HINH-01-home-overview.png"; Prompt = "Home overview" },
  @{ Name = "HINH-02-home-session-modal.png"; Prompt = "Home session history modal" },
  @{ Name = "HINH-03-home-file-manager.png"; Prompt = "Home file manager modal" },
  @{ Name = "HINH-04-inventory-kpi.png"; Prompt = "Inventory KPI" },
  @{ Name = "HINH-05-inventory-location-list.png"; Prompt = "Inventory location list" },
  @{ Name = "HINH-06-inventory-export-sheet.png"; Prompt = "Inventory export sheet" },
  @{ Name = "HINH-07-locations-list-progress.png"; Prompt = "Locations list progress" },
  @{ Name = "HINH-08-locations-operations-panel.png"; Prompt = "Locations operations panel" },
  @{ Name = "HINH-09-locations-add-edit-modal.png"; Prompt = "Locations add/edit modal" },
  @{ Name = "HINH-10-scan-camera-frame.png"; Prompt = "Scan camera frame" },
  @{ Name = "HINH-11-scan-item-qty.png"; Prompt = "Scan item + qty control" },
  @{ Name = "HINH-12-scan-draft-sheet.png"; Prompt = "Scan draft sheet" },
  @{ Name = "HINH-13-scan-not-found-add-new.png"; Prompt = "Scan not found + add new" },
  @{ Name = "HINH-14-report-item-overview.png"; Prompt = "Report item overview" },
  @{ Name = "HINH-15-report-by-location.png"; Prompt = "Report by location" },
  @{ Name = "HINH-16-report-item-exceptions.png"; Prompt = "Report item exceptions" }
)

$devices = Get-ConnectedDevices
if ($devices.Count -eq 0) {
  throw "Khong co thiet bi/emulator online. Hay ket noi truoc khi capture."
}

$device = $devices[0]
Write-Host "Dang su dung thiet bi: $device"

for ($i = 0; $i -lt $screens.Count; $i++) {
  $step = $i + 1
  $name = $screens[$i].Name
  $prompt = $screens[$i].Prompt
  Write-Host ""
  Write-Host "[$step/$($screens.Count)] $name"
  Write-Host "Man hinh can chup: $prompt"
  [void](Read-Host "Dieu huong den man hinh nay tren app roi bam Enter")

  $remote = "/sdcard/$name"
  adb -s $device shell screencap -p $remote | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw "Khong chup duoc anh $name"
  }

  $local = Join-Path $OutputDir $name
  adb -s $device pull $remote $local | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw "Khong pull duoc anh $name"
  }
  adb -s $device shell rm $remote | Out-Null

  $size = (Get-Item $local).Length
  if ($size -lt 5000) {
    Write-Warning "Anh $name co dung luong rat nho ($size bytes). Kiem tra lai."
  } else {
    Write-Host "Da luu: $local ($size bytes)"
  }
}

Write-Host ""
Write-Host "Hoan tat capture. Tiep theo chay:"
Write-Host "python scripts/export_master_guide_docx.py"
