[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$vscodeDir = Join-Path $repoRoot '.vscode'
$extensionsFile = Join-Path $vscodeDir 'extensions.json'
$settingsFile = Join-Path $vscodeDir 'settings.json'

$extensions = @(
  'pranaygp.vscode-css-peek',
  'ecmel.vscode-html-css',
  'ms-playwright.playwright',
  'dbaeumer.vscode-eslint',
  'esbenp.prettier-vscode',
  'usernamehw.errorlens',
  'formulahendry.auto-rename-tag',
  'naumovs.color-highlight',
  'streetsidesoftware.code-spell-checker',
  'ms-vscode.live-server'
)

function Write-Step {
  param([string]$Message)
  Write-Host "==> $Message" -ForegroundColor Cyan
}

Write-Step 'Preparing .vscode directory'
New-Item -ItemType Directory -Path $vscodeDir -Force | Out-Null

if (Get-Command code -ErrorAction SilentlyContinue) {
  Write-Step 'Installing recommended VS Code extensions'
  foreach ($extension in $extensions) {
    Write-Host "Installing $extension"
    & code --install-extension $extension --force | Out-Host
  }
} else {
  Write-Warning "VS Code CLI 'code' was not found in PATH. Install it from VS Code: 'Shell Command: Install ''code'' command in PATH'."
}

Write-Step 'Writing workspace extension recommendations'
$extensionsPayload = @{
  recommendations = $extensions
}
$extensionsPayload | ConvertTo-Json -Depth 4 | Set-Content -Path $extensionsFile -Encoding utf8

Write-Step 'Validating workspace settings file'
if (-not (Test-Path $settingsFile)) {
  '{}' | Set-Content -Path $settingsFile -Encoding utf8
}

try {
  $settingsRaw = Get-Content -Path $settingsFile -Raw
  $settings = if ([string]::IsNullOrWhiteSpace($settingsRaw)) {
    [ordered]@{}
  } else {
    $settingsRaw | ConvertFrom-Json -AsHashtable
  }
} catch {
  throw "The file '$settingsFile' is not valid JSON. Fix it before running this script."
}

$desiredSettings = [ordered]@{
  'editor.formatOnSave' = $true
  'editor.codeActionsOnSave' = @{
    'source.fixAll.eslint' = 'explicit'
  }
  'editor.linkedEditing' = $true
  'editor.minimap.enabled' = $false
  'editor.renderWhitespace' = 'selection'
  'editor.guides.bracketPairs' = $true
  'files.autoSave' = 'afterDelay'
  'files.autoSaveDelay' = 800
  'files.trimTrailingWhitespace' = $true
  'files.insertFinalNewline' = $true
  'search.useIgnoreFiles' = $true
  'emmet.includeLanguages' = @{
    'javascript' = 'html'
  }
  'css.validate' = $true
  'javascript.validate.enable' = $true
  'html.format.wrapLineLength' = 120
  'prettier.printWidth' = 120
  'prettier.singleQuote' = $true
  'prettier.semi' = $true
  'workbench.editor.enablePreview' = $false
  'explorer.confirmDelete' = $false
  'terminal.integrated.defaultProfile.windows' = 'PowerShell'
}

foreach ($entry in $desiredSettings.GetEnumerator()) {
  $settings[$entry.Key] = $entry.Value
}

Write-Step 'Writing merged workspace settings'
$settings | ConvertTo-Json -Depth 8 | Set-Content -Path $settingsFile -Encoding utf8

Write-Step 'VS Code workspace bootstrap complete'
Write-Host "Extensions file: $extensionsFile"
Write-Host "Settings file:   $settingsFile"
