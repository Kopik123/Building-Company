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
  'streetsidesoftware.code-spell-checker'
)

function Write-Step {
  param([string]$Message)
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function ConvertTo-PlainHashtable {
  param([Parameter(ValueFromPipeline = $true)] $InputObject)

  if ($null -eq $InputObject) {
    return $null
  }

  if ($InputObject -is [System.Collections.IDictionary]) {
    $table = [ordered]@{}
    foreach ($key in $InputObject.Keys) {
      $table[$key] = ConvertTo-PlainHashtable $InputObject[$key]
    }
    return $table
  }

  if ($InputObject -is [System.Collections.IEnumerable] -and -not ($InputObject -is [string])) {
    $items = @()
    foreach ($item in $InputObject) {
      $items += ,(ConvertTo-PlainHashtable $item)
    }
    return $items
  }

  if ($InputObject -is [pscustomobject]) {
    $table = [ordered]@{}
    foreach ($property in $InputObject.PSObject.Properties) {
      $table[$property.Name] = ConvertTo-PlainHashtable $property.Value
    }
    return $table
  }

  return $InputObject
}

Write-Step 'Preparing .vscode directory'
New-Item -ItemType Directory -Path $vscodeDir -Force | Out-Null

$codeCli = Get-Command code.cmd -ErrorAction SilentlyContinue
if (-not $codeCli) {
  $codeCli = Get-Command code -ErrorAction SilentlyContinue
}

if ($codeCli) {
  Write-Step 'Installing recommended VS Code extensions'
  foreach ($extension in $extensions) {
    Write-Host "Installing $extension"
    & $codeCli.Source --install-extension $extension --force | Out-Host
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
    ConvertTo-PlainHashtable ($settingsRaw | ConvertFrom-Json)
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
