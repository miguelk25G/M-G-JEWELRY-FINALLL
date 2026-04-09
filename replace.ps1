$files = Get-ChildItem -Path . -Recurse -Include *.tsx,*.ts,*.json,*.prisma -Exclude *node_modules*,*.git*,*.next*

foreach ($file in $files) {
    if ((Test-Path $file.FullName -PathType Leaf) -eq $true) {
        $content = Get-Content $file.FullName -Raw
        $original = $content

        $content = $content -creplace '/concierge', '/white-glove'
        $content = $content -creplace 'nav\.concierge', 'nav.whiteGlove'
        $content = $content -creplace "'concierge'", "'whiteGlove'"
        $content = $content -creplace '"concierge"', '"whiteGlove"'
        $content = $content -creplace 'concierge\.', 'whiteGlove.'
        $content = $content -creplace 'concierge: \{', 'whiteGlove: {'

        if ($file.Name -match 'es\.json') {
            $content = $content -creplace 'Concierge', 'Servicio White-Glove'
        } else {
            $content = $content -creplace 'Concierge', 'White-Glove'
        }

        $content = $content -creplace 'concierge team', 'White-Glove team'

        if ($content -cne $original) {
            Set-Content -Path $file.FullName -Value $content -Encoding UTF8
            Write-Host "Updated $($file.FullName)"
        }
    }
}
