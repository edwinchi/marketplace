# Registers ops/security-audit.mjs as a Windows Scheduled Task running every 12 hours, mirroring
# the watchdog.py task referenced in its own docstring. Run this once, as the same user the task
# should run under (it needs read access to apps/web/.env.local).
#
# To remove: Unregister-ScheduledTask -TaskName "AfrodealsSecurityAudit" -Confirm:$false

$TaskName = "AfrodealsSecurityAudit"
$ScriptPath = Join-Path $PSScriptRoot "security-audit.mjs"
$NodePath = (Get-Command node).Source

$Action = New-ScheduledTaskAction -Execute $NodePath -Argument "`"$ScriptPath`"" -WorkingDirectory $PSScriptRoot
$Trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Hours 12)
$Settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopOnIdleEnd -ExecutionTimeLimit (New-TimeSpan -Minutes 10)

Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Force

Write-Host "Registered '$TaskName' -- runs security-audit.mjs every 12 hours via $NodePath."
Write-Host "First run happens now (the trigger's start time is 'now'); check ops/security-audit.log after."
