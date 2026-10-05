<#
.SYNOPSIS
    Abre la aplicación: instala las dependencias la primera vez y arranca el servidor local.
#>

$Host.UI.RawUI.WindowTitle = 'Cuánto me cuesta'
Set-Location -Path $PSScriptRoot

if (-not (Test-Path 'node_modules')) {
    Write-Host 'Instalando lo necesario, solo la primera vez...'
    npm install
}

Write-Host 'Abriendo «Cuánto me cuesta» en el navegador. Para cerrar la app, cierra esta ventana.'
npm run abrir
Read-Host 'Pulsa Intro para cerrar'
