param(
  # Ha be van kapcsolva, a JWT_SECRET minimum hosszat is ellenorizzuk.
  [switch]$StrictJwtLength
)

$ErrorActionPreference = 'Stop'

function Test-RequiredEnv {
  param(
    [Parameter(Mandatory = $true)][string]$Name
  )

  $value = [Environment]::GetEnvironmentVariable($Name)
  # Hianyzo kotelezo env eseten hibas allapotot jelzunk, de nem allitjuk le azonnal a teljes futast.
  if ([string]::IsNullOrWhiteSpace($value)) {
    Write-Host "HIBA: Hianyzik a kotelezo kornyezeti valtozo: $Name"
    return $false
  }

  Write-Host "OK: $Name be van allitva."
  return $true
}

$allGood = $true
# Ezek nelkul a prod-like inditas nem tekintheto ervenyesnek.
$required = @('JWT_SECRET', 'DB_USER', 'DB_PASSWORD')

foreach ($name in $required) {
  # Osszegyujtjuk az osszes hianyzo kotelezo valtozot egy futasban.
  if (-not (Test-RequiredEnv -Name $name)) {
    $allGood = $false
  }
}

# A hosszusag ellenorzest csak opcionisan futtatjuk, hogy lokalis tesztelesnel se legyen kenyszer.
if ($allGood -and $StrictJwtLength.IsPresent) {
  $jwtSecret = [Environment]::GetEnvironmentVariable('JWT_SECRET')
  # Egyszeru erossegi minimum: legalabb 43 karakter (kb. 32 byte base64) vagy annal hosszabb.
  if ($jwtSecret.Length -lt 43) {
    Write-Host 'HIBA: A JWT_SECRET tul rovid. Javasolt legalabb 32 random byte base64 kodolva.'
    $allGood = $false
  } else {
    Write-Host 'OK: JWT_SECRET hossza megfelelo minimumon van.'
  }
}

$optional = @('DB_HOST', 'DB_PORT', 'DB_NAME', 'SPRING_PROFILES_ACTIVE')
foreach ($name in $optional) {
  # Az opcionlis valtozokrol tajekoztato logot adunk, de ezek hianya nem bukta.
  $value = [Environment]::GetEnvironmentVariable($name)
  if ([string]::IsNullOrWhiteSpace($value)) {
    Write-Host "INFO: $name nincs beallitva (alkalmazas defaultot hasznalhat)."
  } else {
    Write-Host "OK: $name be van allitva."
  }
}

if (-not $allGood) {
  # Nem megfelelo konfiguracio eseten nem-null exit kodot adunk a pipeline-nak.
  Write-Host 'Prod-like env validacio sikertelen.'
  exit 1
}

Write-Host 'Prod-like env validacio sikeres.'
exit 0
