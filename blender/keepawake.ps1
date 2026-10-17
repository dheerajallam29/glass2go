# Keeps Windows from idle-sleeping while the render runs. Process-scoped (the standard request a video
# encoder makes): no power settings are changed, and it lets go as soon as the marker file appears or
# the script is stopped. A closed lid still sleeps.
param([string]$Marker = "C:\Users\Owner\Glass2Go\renders\ALL_DONE.txt", [int]$MaxHours = 14)

Add-Type -Namespace Win -Name Power -MemberDefinition @'
[System.Runtime.InteropServices.DllImport("kernel32.dll")]
public static extern uint SetThreadExecutionState(uint esFlags);
'@

$ES_CONTINUOUS = [uint32]2147483648
$ES_SYSTEM_REQUIRED = [uint32]1
$ES_AWAYMODE_REQUIRED = [uint32]64   # not needed; left out below

$deadline = (Get-Date).AddHours($MaxHours)
while ((Get-Date) -lt $deadline -and -not (Test-Path $Marker)) {
    [void][Win.Power]::SetThreadExecutionState($ES_CONTINUOUS -bor $ES_SYSTEM_REQUIRED)
    Start-Sleep -Seconds 30
}
[void][Win.Power]::SetThreadExecutionState($ES_CONTINUOUS)   # release
