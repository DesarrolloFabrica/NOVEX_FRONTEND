#Requires -Version 5.1
<#
.SYNOPSIS
  Construye y despliega omega-frontend a Cloud Run (us-central1).

.NOTES
  - No contiene secretos.
  - Las variables VITE_* se incrustan en build-time (rebuild obligatorio al cambiarlas).
  - Pide confirmación antes de crear/modificar recursos.
  - No modifica el backend.
#>

$ErrorActionPreference = 'Stop'

# ---------- Configuración (completar antes de ejecutar) ----------
$PROJECT_ID = "it-fab-contenido-edu-5"
$REGION = "us-central1"
$SERVICE = "omega-frontend"
$REPOSITORY = "omega"
$IMAGE = "omega-frontend"
$BACKEND_URL = "https://omega-backend-550902908078.us-central1.run.app/api/v1"
$GOOGLE_CLIENT_ID = "550902908078-e7rhueelk83bsfoegnpsoisrnaqog0jd.apps.googleusercontent.com"
# Vacío = usar la SA por defecto de Cloud Run (la dedicada aún no existe / no hay actAs).
$SERVICE_ACCOUNT = ""
$APP_NAME = "NOVEX"
$APP_ENV = "production"
$MEMORY = "512Mi"
$CPU = "1"
$MIN_INSTANCES = 0
$MAX_INSTANCES = 5
$CONCURRENCY = 80
$TIMEOUT = "60s"

$ImageUri = "$REGION-docker.pkg.dev/$PROJECT_ID/$REPOSITORY/${IMAGE}"
$Tag = Get-Date -Format "yyyyMMdd-HHmmss"
$FullImageSha = "${ImageUri}:${Tag}"
$FullImageLatest = "${ImageUri}:latest"

function Assert-CommandExists {
  param([string]$Name)
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "No se encontró el comando '$Name'. Instálalo y vuelve a intentarlo."
  }
}

function Confirm-OrExit {
  param([string]$Message)
  $answer = Read-Host "$Message [s/N]"
  if ($answer -notin @('s', 'S', 'y', 'Y')) {
    Write-Host "Operación cancelada."
    exit 0
  }
}

function Assert-LastExitCode {
  param([string]$Action)
  if ($null -eq $LASTEXITCODE) { return }
  if ($LASTEXITCODE -ne 0) {
    throw "$Action falló con código $LASTEXITCODE. Se detiene el despliegue."
  }
}

Write-Host "=== Deploy frontend Cloud Run ===" -ForegroundColor Cyan
Write-Host "Proyecto: $PROJECT_ID"
Write-Host "Servicio: $SERVICE"
Write-Host "Región:   $REGION"
Write-Host "Imagen:   $FullImageSha"

Assert-CommandExists -Name "gcloud"
Assert-CommandExists -Name "docker"

if ([string]::IsNullOrWhiteSpace($BACKEND_URL)) {
  throw "BACKEND_URL está vacío. Debe ser la URL completa del API (incluye /api/v1)."
}
if ([string]::IsNullOrWhiteSpace($GOOGLE_CLIENT_ID)) {
  throw "GOOGLE_CLIENT_ID está vacío."
}

Write-Host "`nCuenta gcloud activa:"
gcloud auth list --filter=status:ACTIVE --format="value(account)"

Confirm-OrExit "¿Continuar con el proyecto $PROJECT_ID y desplegar $SERVICE?"

gcloud config set project $PROJECT_ID | Out-Host

Write-Host "`nVerificando APIs necesarias..."
$requiredApis = @(
  "run.googleapis.com",
  "artifactregistry.googleapis.com",
  "cloudbuild.googleapis.com"
)
foreach ($api in $requiredApis) {
  $enabled = gcloud services list --enabled --filter="config.name:$api" --format="value(config.name)"
  if (-not $enabled) {
    Confirm-OrExit "La API $api no está habilitada. ¿Habilitarla?"
    gcloud services enable $api --project $PROJECT_ID
  } else {
    Write-Host "  OK $api"
  }
}

Write-Host "`nComprobando Artifact Registry '$REPOSITORY'..."
$repoExists = $null
$prevEap = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
try {
  $describeOut = & gcloud artifacts repositories describe $REPOSITORY `
    --location=$REGION `
    --project=$PROJECT_ID `
    --format="value(name)" 2>&1
  if ($LASTEXITCODE -eq 0 -and $describeOut) {
    $repoExists = "$describeOut".Trim()
  }
} finally {
  $ErrorActionPreference = $prevEap
}

if (-not $repoExists) {
  Confirm-OrExit "El repositorio Artifact Registry '$REPOSITORY' no existe. ¿Crearlo (DOCKER)?"
  gcloud artifacts repositories create $REPOSITORY `
    --repository-format=docker `
    --location=$REGION `
    --project=$PROJECT_ID `
    --description="Imágenes OMEGA"
  Write-Host "  Repositorio '$REPOSITORY' creado."
} else {
  Write-Host "  Repositorio existente."
}

Confirm-OrExit "¿Construir y subir la imagen Docker?"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot

# OneDrive + Docker Desktop en Windows puede fallar con "invalid file request"
# si los archivos están como reparse points. Hidratamos y construimos desde %TEMP%.
Write-Host "`nPreparando contexto Docker (hidratación OneDrive + staging en TEMP)..."
$staging = Join-Path $env:TEMP "omega-frontend-docker-context"
if (Test-Path $staging) {
  Remove-Item -LiteralPath $staging -Recurse -Force
}
New-Item -ItemType Directory -Path $staging | Out-Null

$publicRoot = Join-Path $repoRoot "public"
if (Test-Path $publicRoot) {
  Get-ChildItem -LiteralPath $publicRoot -Recurse -File | ForEach-Object {
    $fs = [System.IO.File]::Open($_.FullName, 'Open', 'Read', 'ReadWrite')
    try {
      $buf = New-Object byte[] ([Math]::Min(65536, [Math]::Max(1, $fs.Length)))
      [void]$fs.Read($buf, 0, $buf.Length)
    } finally {
      $fs.Close()
    }
  }
}

$copyItems = @(
  'package.json',
  'package-lock.json',
  'index.html',
  'vite.config.ts',
  'tsconfig.json',
  'tsconfig.app.json',
  'tsconfig.node.json',
  'Dockerfile',
  'docker',
  '.dockerignore',
  'public',
  'src'
)
foreach ($item in $copyItems) {
  $src = Join-Path $repoRoot $item
  if (-not (Test-Path -LiteralPath $src)) {
    throw "Falta archivo/carpeta requerida para el build: $item"
  }
  Copy-Item -LiteralPath $src -Destination (Join-Path $staging $item) -Recurse -Force
}

Set-Location $staging

Write-Host "`nConstruyendo imagen (VITE_* como build-args)..."
docker build `
  --build-arg "VITE_API_URL=$BACKEND_URL" `
  --build-arg "VITE_GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID" `
  --build-arg "VITE_APP_NAME=$APP_NAME" `
  --build-arg "VITE_APP_ENV=$APP_ENV" `
  -t $FullImageSha `
  -t $FullImageLatest `
  .
Assert-LastExitCode "docker build"
Set-Location $repoRoot

Write-Host "`nAutenticando Docker con Artifact Registry..."
gcloud auth configure-docker "$REGION-docker.pkg.dev" --quiet
Assert-LastExitCode "gcloud auth configure-docker"

Write-Host "Subiendo imagen..."
docker push $FullImageSha
Assert-LastExitCode "docker push ($FullImageSha)"
docker push $FullImageLatest
Assert-LastExitCode "docker push ($FullImageLatest)"

$saArgs = @()
if (-not [string]::IsNullOrWhiteSpace($SERVICE_ACCOUNT)) {
  Write-Host "Usando service account: $SERVICE_ACCOUNT"
  $saArgs += "--service-account=$SERVICE_ACCOUNT"
} else {
  Write-Host "Sin SA dedicada: Cloud Run usará la cuenta por defecto del runtime."
}

Confirm-OrExit "¿Desplegar Cloud Run ($SERVICE) permitiendo acceso no autenticado?"

gcloud run deploy $SERVICE `
  --image=$FullImageSha `
  --region=$REGION `
  --project=$PROJECT_ID `
  --platform=managed `
  --port=8080 `
  --cpu=$CPU `
  --memory=$MEMORY `
  --concurrency=$CONCURRENCY `
  --timeout=$TIMEOUT `
  --min-instances=$MIN_INSTANCES `
  --max-instances=$MAX_INSTANCES `
  --execution-environment=gen2 `
  --ingress=all `
  --allow-unauthenticated `
  --startup-probe="httpGet.path=/health,httpGet.port=8080,periodSeconds=5,timeoutSeconds=2,failureThreshold=12" `
  --liveness-probe="httpGet.path=/health,httpGet.port=8080,periodSeconds=30,timeoutSeconds=3,failureThreshold=3" `
  @saArgs
Assert-LastExitCode "gcloud run deploy"
$serviceUrl = gcloud run services describe $SERVICE `
  --region=$REGION `
  --project=$PROJECT_ID `
  --format="value(status.url)"

Write-Host "`nURL del servicio: $serviceUrl" -ForegroundColor Green

Write-Host "Probando /health ..."
try {
  $health = Invoke-WebRequest -Uri "$serviceUrl/health" -UseBasicParsing -TimeoutSec 30
  Write-Host "Health status: $($health.StatusCode) body=$($health.Content)"
} catch {
  Write-Warning "No se pudo verificar /health: $($_.Exception.Message)"
}

Write-Host "`nPost-despliegue:"
Write-Host "  1) Registrar $serviceUrl como origen JavaScript autorizado en Google OAuth."
Write-Host "  2) Verificar CORS del backend hacia $serviceUrl."
Write-Host "  3) Si cambias VITE_*, reconstruye la imagen (no basta con redeploy)."
