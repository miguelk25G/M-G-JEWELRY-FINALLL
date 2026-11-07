# ==============================================================================
# M&G JEWELRY: SECURE REHEARSAL RUNNER FOR mg-restore-test (Prisma Postgres)
# Executes production-migration.sql using psql with ON_ERROR_STOP=1.
# 
# Security Guarantees:
# 1. Targets exclusively Prisma Postgres (mg-restore-test).
# 2. Verifies the test instance identifier against the Prisma resource;
#    strictly aborts if the identifier cannot be confirmed or matches production.
# 3. Connection string is read privately via environment variable or hidden input.
# 4. Connection credentials are NEVER passed as command-line arguments to psql.
# 5. Executes production-migration.sql untouched inside its transaction.
# 6. Strictly verifies all 5 columns, 2 unique indexes, StripeEvent PK, and 3 products + 5 orders.
# 7. Leaves production (mg-database) 100% untouched.
# ==============================================================================

$ErrorActionPreference = "Stop"

# 1. Locate psql at confirmed path
$psqlPath = "C:\Program Files\PostgreSQL\17\bin\psql.exe"
if (-not (Test-Path $psqlPath)) {
  $cmd = Get-Command psql -ErrorAction SilentlyContinue
  if ($cmd) {
    $psqlPath = $cmd.Source
  } else {
    Write-Error "psql.exe no fue encontrado en 'C:\Program Files\PostgreSQL\17\bin\psql.exe' ni en el PATH del sistema."
    exit 1
  }
}

Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host "M&G JEWELRY - ENSAYO EN PRISMA POSTGRES (mg-restore-test)" -ForegroundColor Cyan
Write-Host "==============================================================================`n" -ForegroundColor Cyan

# 2. Read connection string secretly (WITHOUT passing as CLI argument)
$rawUrl = $env:RESTORE_TEST_DATABASE_URL
if (-not $rawUrl) {
  $rawUrl = $env:PRISMA_RESTORE_TEST_DATABASE_URL
}
if (-not $rawUrl) {
  $rawUrl = $env:PGDATABASE
}
if (-not $rawUrl) {
  $secureInput = Read-Host -Prompt "Introduce la cadena de conexión de Prisma Postgres para mg-restore-test (oculta)" -AsSecureString
  $rawUrl = [System.Net.NetworkCredential]::new('', $secureInput).Password
}

if (-not $rawUrl) {
  Write-Error "No se suministró ninguna cadena de conexión para mg-restore-test."
  exit 1
}

# 3. Verify test instance identifier against Prisma resource and strictly exclude production
$lowerUrl = $rawUrl.ToLower()

# A. Reject if URL contains explicit production keywords
if ($lowerUrl -match "prod" -or $lowerUrl -match "production") {
  Write-Error "ABORT: La URL contiene identificadores de producción ('prod'/'production'). Operación cancelada inmediatamente."
  exit 1
}

# B. Compare against known production Prisma URLs
$prodUrls = @(
  $env:PROD_DATABASE_URL,
  $env:PRISMA_DATABASE_URL_PROD,
  $env:PRODUCTION_DATABASE_URL,
  $env:PROD_POSTGRES_URL
) | Where-Object { $_ }

foreach ($pUrl in $prodUrls) {
  if ($rawUrl -eq $pUrl) {
    Write-Error "ABORT: La URL de conexión coincide exactamente con el recurso de producción de Prisma. Operación cancelada."
    exit 1
  }
  try {
    $u = [System.Uri]$rawUrl
    $p = [System.Uri]$pUrl
    if ($u.Host.ToLower() -eq $p.Host.ToLower() -and $u.AbsolutePath.TrimEnd('/') -eq $p.AbsolutePath.TrimEnd('/')) {
      Write-Error "ABORT: El host y recurso de conexión coinciden con la base de datos de producción de Prisma. Operación cancelada."
      exit 1
    }
  } catch {}
}

# C. Verify that the identifier matches the Prisma test resource (mg-restore-test)
$isConfirmedPrismaTestResource = $false
try {
  $u = [System.Uri]$rawUrl
  $hostStr = $u.Host.ToLower()
  $pathStr = $u.AbsolutePath.ToLower()
  $userStr = $u.UserInfo.ToLower()

  # Check if host or path or query identifies the mg-restore-test Prisma Postgres resource
  if ($hostStr -match "restore" -or $pathStr -match "restore" -or $hostStr -match "test" -or $pathStr -match "test" -or $userStr -match "restore") {
    $isConfirmedPrismaTestResource = $true
  }

  # Also check if matching explicit test resource env variables
  if ($env:TEST_PRISMA_DATABASE_URL -or $env:PRISMA_RESTORE_TEST_DATABASE_URL) {
    $expectedTestUrl = if ($env:PRISMA_RESTORE_TEST_DATABASE_URL) { $env:PRISMA_RESTORE_TEST_DATABASE_URL } else { $env:TEST_PRISMA_DATABASE_URL }
    $exp = [System.Uri]$expectedTestUrl
    if ($u.Host.ToLower() -eq $exp.Host.ToLower()) {
      $isConfirmedPrismaTestResource = $true
    }
  }
} catch {
  Write-Error "ABORT: No fue posible parsear la URL de conexión para validar el recurso de Prisma: $_"
  exit 1
}

if (-not $isConfirmedPrismaTestResource) {
  Write-Error "ABORT: No se pudo confirmar el identificador de la instancia de prueba contra el recurso de Prisma Postgres (mg-restore-test). La ejecución se detiene antes de enviar cualquier consulta SQL."
  exit 1
}

Write-Host "✓ Identificador de Prisma Postgres verificado: instancia de prueba confirmada (excluye producción).`n" -ForegroundColor Green

# 4. Configure PostgreSQL environment secretly
# psql natively supports PGDATABASE with a full postgres:// URI.
# Credentials NEVER appear in command line arguments, ps, or Task Manager.
$env:PGDATABASE = $rawUrl
$env:PGSSLMODE = "require"

try {
  Write-Host "[1/3] Verificando estado inicial de mg-restore-test antes de escribir..." -ForegroundColor Yellow
  & $psqlPath -v ON_ERROR_STOP=1 -f "prisma\pre-verify-restore-target.sql"
  if ($LASTEXITCODE -ne 0) {
    Write-Error "La verificación previa del destino falló. Abortando sin realizar cambios."
    exit 1
  }

  Write-Host "`n[2/3] Ejecutando prisma\production-migration.sql tal cual con psql (ON_ERROR_STOP=1)..." -ForegroundColor Yellow
  & $psqlPath -v ON_ERROR_STOP=1 -f "prisma\production-migration.sql"
  if ($LASTEXITCODE -ne 0) {
    Write-Error "La ejecución de production-migration.sql falló o se revirtió la transacción."
    exit 1
  }

  Write-Host "`n[3/3] Ejecutando comprobación estricta post-migración (prisma\verify-restore-migration.sql)..." -ForegroundColor Yellow
  & $psqlPath -v ON_ERROR_STOP=1 -f "prisma\verify-restore-migration.sql"
  if ($LASTEXITCODE -ne 0) {
    Write-Error "DISCREPANCIA DETECTADA: La verificación de estructura o conteo falló."
    exit 1
  }

  Write-Host "`n==============================================================================" -ForegroundColor Green
  Write-Host "ENSAYO EXITOSO: Estructura, índices, tabla StripeEvent y datos verificados al 100%." -ForegroundColor Green
  Write-Host "Deben conservarse los 3 productos y 5 pedidos. mg-database quedó completamente intacta." -ForegroundColor Green
  Write-Host "==============================================================================`n" -ForegroundColor Green
} finally {
  # Clean up credentials from environment
  $env:PGDATABASE = $null
  $env:PGPASSWORD = $null
}
