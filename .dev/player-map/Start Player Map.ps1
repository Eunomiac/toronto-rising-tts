$projectPath = 'D:\Projects\.CODING\toronto-rising-tts\.dev\player-map'
$mapUrl = 'http://127.0.0.1:5173'
$chromePath = 'C:\Program Files\Google\Chrome\Application\chrome.exe'

# Replace this with the folder shown by chrome://version.
$chromeProfileDirectory = 'Profile 3'

# Open a dedicated terminal that keeps the development server running.
Start-Process powershell.exe -ArgumentList @(
    '-NoExit'
    '-Command'
    "Set-Location -LiteralPath '$projectPath'; npm run dev -- --host 127.0.0.1 --port 5173"
)

# Wait until Vite is ready before opening Chrome.
$deadline = (Get-Date).AddSeconds(60)

do {
    Start-Sleep -Milliseconds 500

    try {
        $response = Invoke-WebRequest -Uri $mapUrl -UseBasicParsing -TimeoutSec 1
        $ready = $response.StatusCode -eq 200
    }
    catch {
        $ready = $false
    }
} until ($ready -or (Get-Date) -ge $deadline)

if (-not $ready) {
    Add-Type -AssemblyName PresentationFramework
    [System.Windows.MessageBox]::Show(
        'The Player Map server did not become ready within 60 seconds. Check the server window for an error.',
        'Toronto Rising Player Map'
    )
    exit 1
}

Start-Process $chromePath -ArgumentList @(
    "--profile-directory=$chromeProfileDirectory"
    $mapUrl
)