# Runs the full render only while the laptop is on mains power. Windows throttles the CPU roughly 10x on
# battery, so a multi-hour render there is both pointless and a way to drain the battery to zero.
#   - waits until the charger is connected, then starts blender/render_all.sh
#   - if the charger is pulled it stops the render (progress is kept) and waits again
#   - keeps Windows from idle-sleeping while it works (process-scoped; no power settings are changed)
#   - exits when renders/ALL_DONE.txt appears
param(
    [string]$Out = "C:\Users\Owner\Glass2Go\renders",
    [string]$Width = "1920"
)

Add-Type -AssemblyName System.Windows.Forms
Add-Type -Namespace Win -Name Power -MemberDefinition @'
[System.Runtime.InteropServices.DllImport("kernel32.dll")]
public static extern uint SetThreadExecutionState(uint esFlags);
'@

$marker = Join-Path $Out "ALL_DONE.txt"
$log = Join-Path $Out "supervisor.log"
function Log($m) { Add-Content -Path $log -Value ("{0}  {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $m) }
function OnMains { [System.Windows.Forms.SystemInformation]::PowerStatus.PowerLineStatus -eq 'Online' }
function StopRender {
    Get-CimInstance Win32_Process |
        Where-Object { $_.CommandLine -match 'render_all\.sh' -or $_.Name -eq 'blender.exe' } |
        ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
}

$ES_CONTINUOUS = [uint32]2147483648
$ES_SYSTEM_REQUIRED = [uint32]1
$proc = $null
$waitingLogged = $false
Log "supervisor started (width $Width)"

while (-not (Test-Path $marker)) {
    [void][Win.Power]::SetThreadExecutionState($ES_CONTINUOUS -bor $ES_SYSTEM_REQUIRED)
    $running = ($null -ne $proc) -and (-not $proc.HasExited)
    if (OnMains) {
        $waitingLogged = $false
        if (-not $running) {
            if ($null -ne $proc) { Log "render process ended without finishing; restarting in 60 s"; Start-Sleep -Seconds 60 }
            $env:G2G_FINAL_WIDTH = $Width
            $cmd = 'cd /c/Users/Owner/Glass2Go && blender/render_all.sh C:/Users/Owner/Glass2Go/renders >> renders/render.log 2>&1'
            $proc = Start-Process -FilePath "C:\Program Files\Git\bin\bash.exe" -ArgumentList @('-lc', "`"$cmd`"") -PassThru -WindowStyle Hidden
            Log "on mains: render started (pid $($proc.Id))"
        }
    } else {
        if ($running) { StopRender; $proc = $null; Log "charger removed: render paused (progress kept)" }
        elseif (-not $waitingLogged) { Log "waiting for the charger to be connected"; $waitingLogged = $true }
    }
    Start-Sleep -Seconds 15
}
[void][Win.Power]::SetThreadExecutionState($ES_CONTINUOUS)
Log "all done"
