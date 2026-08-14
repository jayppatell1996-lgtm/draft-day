# Create images directory if it doesn't exist
$imagesDir = "..\public\images"
if (!(Test-Path $imagesDir)) {
    New-Item -ItemType Directory -Force -Path $imagesDir
}

# Download images
$images = @{
    "cricket-stadium.jpg" = "https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=1600&q=80"
    "cricket-trophy.jpg" = "https://images.unsplash.com/photo-1661956602116-aa6865609028?w=1600&q=80"
    "cricket-bat.jpg" = "https://images.unsplash.com/photo-1595435742656-5272d0b3fa82?w=1600&q=80"
}

foreach ($image in $images.GetEnumerator()) {
    $outFile = Join-Path $imagesDir $image.Key
    Write-Host "Downloading $($image.Key)..."
    Invoke-WebRequest -Uri $image.Value -OutFile $outFile
    Write-Host "Downloaded $($image.Key)"
}

Write-Host "All images downloaded successfully!"
