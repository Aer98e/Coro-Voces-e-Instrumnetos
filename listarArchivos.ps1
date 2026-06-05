param(
    [string]$Carpeta = "./audios",
    [string]$Salida = "lista_archivos"
)

# --- Función para calcular distancia Levenshtein ---
function Get-LevenshteinDistance {
    param(
        [string]$s,
        [string]$t
    )

    $n = $s.Length
    $m = $t.Length

    if ($n -eq 0) { return $m }
    if ($m -eq 0) { return $n }

    $d = New-Object 'int[,]' ($n + 1), ($m + 1)

    for ($i = 0; $i -le $n; $i++) { $d[$i,0] = $i }
    for ($j = 0; $j -le $m; $j++) { $d[0,$j] = $j }

    for ($i = 1; $i -le $n; $i++) {
        for ($j = 1; $j -le $m; $j++) {
            $i_minus = $i - 1
            $j_minus = $j - 1
            
            if ($s[$i_minus] -eq $t[$j_minus]) {
                $cost = 0
            } else {
                $cost = 1
            }

            $delete = $d[$i_minus,$j] + 1
            $insert = $d[$i,$j_minus] + 1
            $substitute = $d[$i_minus,$j_minus] + $cost

            $d[$i,$j] = [Math]::Min([Math]::Min($delete, $insert), $substitute)
        }
    }

    return $d[$n,$m]
}

# --- Umbral de similitud ---
# Mientras más pequeño, más estricta la comparación.
$Umbral = 3

# --- Obtener archivos ---
$archivos = Get-ChildItem -Path $Carpeta -File | Select-Object -ExpandProperty Name

$listaFinal = @()

foreach ($archivo in $archivos) {
    $esSimilar = $false

    foreach ($existente in $listaFinal) {
        $dist = Get-LevenshteinDistance -s $archivo -t $existente

        if ($dist -le $Umbral) {
            $esSimilar = $true
            break
        }
    }

    if (-not $esSimilar) {
        $listaFinal += $archivo
    }
}

# --- Guardar archivo sin extensión ---
$listaFinal | Out-File -FilePath $Salida -Encoding UTF8

Write-Host "Archivo generado: $Salida"
