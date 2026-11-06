Add-Type -AssemblyName System.Drawing

$srcPath = 'C:/Users/ayush/.gemini/antigravity/brain/6088c53b-f9a4-40c1-b29c-d75f22938609/.user_uploaded/media_1793929804387_d7780994.jpg'
$src = [System.Drawing.Image]::FromFile($srcPath)

function Resize-Image($img, $w, $h, $destPath) {
    $dir = Split-Path $destPath
    if (!(Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    $bmp = New-Object System.Drawing.Bitmap($w, $h)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.DrawImage($img, 0, 0, $w, $h)
    $g.Dispose()
    $bmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Output "Generated $destPath ($w x $h)"
}

# Android mipmaps
Resize-Image $src 48 48 'App/app/src/main/res/mipmap-mdpi/ic_launcher.png'
Resize-Image $src 48 48 'App/app/src/main/res/mipmap-mdpi/ic_launcher_round.png'

Resize-Image $src 72 72 'App/app/src/main/res/mipmap-hdpi/ic_launcher.png'
Resize-Image $src 72 72 'App/app/src/main/res/mipmap-hdpi/ic_launcher_round.png'

Resize-Image $src 96 96 'App/app/src/main/res/mipmap-xhdpi/ic_launcher.png'
Resize-Image $src 96 96 'App/app/src/main/res/mipmap-xhdpi/ic_launcher_round.png'

Resize-Image $src 144 144 'App/app/src/main/res/mipmap-xxhdpi/ic_launcher.png'
Resize-Image $src 144 144 'App/app/src/main/res/mipmap-xxhdpi/ic_launcher_round.png'

Resize-Image $src 192 192 'App/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png'
Resize-Image $src 192 192 'App/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png'

# Android drawable foreground (for adaptive icons)
Resize-Image $src 432 432 'App/app/src/main/res/drawable/ic_launcher_foreground.png'

# Web and PWA icons
Resize-Image $src 512 512 'public/logo.png'
Resize-Image $src 512 512 'public/icon-512.png'
Resize-Image $src 192 192 'public/icon-192.png'
Resize-Image $src 64 64 'public/favicon.png'

$src.Dispose()
