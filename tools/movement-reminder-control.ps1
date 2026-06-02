Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$taskName = "PaddockMovementReminder"
$projectRoot = Split-Path -Parent $PSScriptRoot
$reminderScript = Join-Path $PSScriptRoot "movement-reminder.ps1"

function Get-ReminderEnabled {
  $task = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
  return $task -and $task.State -ne "Disabled"
}

function Enable-Reminder {
  if (-not (Test-Path $reminderScript)) {
    [System.Windows.Forms.MessageBox]::Show(
      "Le script de rappel est introuvable : $reminderScript",
      "Rappel mouvement",
      [System.Windows.Forms.MessageBoxButtons]::OK,
      [System.Windows.Forms.MessageBoxIcon]::Error
    ) | Out-Null
    return
  }

  $action = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$reminderScript`""

  $trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(30) `
    -RepetitionInterval (New-TimeSpan -Minutes 30) `
    -RepetitionDuration ([TimeSpan]::MaxValue)

  $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
  Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Force | Out-Null
}

function Disable-Reminder {
  $task = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
  if ($task) {
    Disable-ScheduledTask -TaskName $taskName | Out-Null
  }
}

$form = New-Object System.Windows.Forms.Form
$form.Text = "Rappel mouvement"
$form.Size = New-Object System.Drawing.Size(360, 180)
$form.StartPosition = "CenterScreen"
$form.FormBorderStyle = "FixedDialog"
$form.MaximizeBox = $false

$statusLabel = New-Object System.Windows.Forms.Label
$statusLabel.AutoSize = $false
$statusLabel.Location = New-Object System.Drawing.Point(20, 20)
$statusLabel.Size = New-Object System.Drawing.Size(310, 32)
$statusLabel.TextAlign = "MiddleCenter"

$onButton = New-Object System.Windows.Forms.Button
$onButton.Text = "Activer"
$onButton.Location = New-Object System.Drawing.Point(45, 75)
$onButton.Size = New-Object System.Drawing.Size(110, 36)

$offButton = New-Object System.Windows.Forms.Button
$offButton.Text = "Désactiver"
$offButton.Location = New-Object System.Drawing.Point(190, 75)
$offButton.Size = New-Object System.Drawing.Size(110, 36)

function Update-Status {
  if (Get-ReminderEnabled) {
    $statusLabel.Text = "Rappel actif : toutes les 30 minutes."
    $statusLabel.ForeColor = [System.Drawing.Color]::DarkGreen
  } else {
    $statusLabel.Text = "Rappel désactivé."
    $statusLabel.ForeColor = [System.Drawing.Color]::DarkRed
  }
}

$onButton.Add_Click({
  Enable-Reminder
  Update-Status
})

$offButton.Add_Click({
  Disable-Reminder
  Update-Status
})

$form.Controls.Add($statusLabel)
$form.Controls.Add($onButton)
$form.Controls.Add($offButton)
Update-Status
$form.ShowDialog() | Out-Null
