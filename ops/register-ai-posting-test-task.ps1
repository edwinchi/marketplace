# Registers a daily Windows Scheduled Task that runs the AI-assisted-posting reliability check
# (apps/web/scripts/test-ai-posting-reliability.mjs) once a day with a small count (5) -- a
# regression canary, not a stress test. Run this once.
#
# Deliberately NOT run at 99/day: every attempt that falls through past Gemini's own quota lands on
# OpenRouter's shared free pool (real users draw from the same bucket) and, if that's exhausted too,
# a real paid call. 5/day is enough to catch "the whole provider chain is broken" without materially
# competing with real traffic. Run a larger one-off batch manually any time you want deeper
# confidence: `node scripts/test-ai-posting-reliability.mjs 99`.
#
# To remove: Unregister-ScheduledTask -TaskName "AfrodealsAiPostingTest" -Confirm:$false

$TaskName = "AfrodealsAiPostingTest"
$WebDir = Join-Path (Split-Path $PSScriptRoot -Parent) "apps\web"
$ScriptPath = Join-Path $WebDir "scripts\test-ai-posting-reliability.mjs"
$NodePath = (Get-Command node).Source

$Action = New-ScheduledTaskAction -Execute $NodePath -Argument "`"$ScriptPath`" 5" -WorkingDirectory $WebDir
$Trigger = New-ScheduledTaskTrigger -Daily -At "09:00"
$Settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopOnIdleEnd -ExecutionTimeLimit (New-TimeSpan -Minutes 10)

Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Force

Write-Host "Registered '$TaskName' -- runs 5 AI-posting reliability checks daily at 09:00 via $NodePath."
Write-Host "Check ops/ai-posting-test.log after the first run; alerts only email on <90% success or >20% paid-fallback rate."
