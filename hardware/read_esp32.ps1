param(
    [string]$ApiUrl = "http://127.0.0.1:5000/api/hardware/serial",
    [string]$Port = "",
    [int]$BaudRate = 115200,
    [double]$ReconnectDelaySeconds = 2
)

$ErrorActionPreference = "Stop"
$lastStatus = ""
$apiOnline = $null

function Write-StatusOnce {
    param([string]$Message)

    if ($script:lastStatus -ne $Message) {
        Write-Host $Message
        $script:lastStatus = $Message
    }
}

function Get-SerialPorts {
    return @([System.IO.Ports.SerialPort]::GetPortNames() | Sort-Object {
        if ($_ -match '^COM(\d+)$') { [int]$Matches[1] } else { [int]::MaxValue }
    })
}

function Select-SerialPort {
    $ports = @(Get-SerialPorts)

    if ($Port) {
        if ($ports -contains $Port) { return $Port }
        return $null
    }

    if ($ports.Count -eq 0) { return $null }
    $devices = @(Get-CimInstance -ClassName Win32_PnPEntity -ErrorAction SilentlyContinue | Where-Object { $_.Name -match '(CP210|CH340|CH341|ESP32|USB JTAG)' })
    $recognized = @($devices | ForEach-Object { if ($_.Name -match '\((COM\d+)\)') { $Matches[1] } } | Where-Object { $ports -contains $_ })
    if ($recognized.Count -eq 1) { return $recognized[0] }
    if ($recognized.Count -gt 1) {
        Write-StatusOnce "Multiple likely ESP32 devices. Pass -Port COMx to select the intended board."
    } else {
        Write-StatusOnce "No recognized ESP32 USB device. Pass -Port COMx after identifying the board."
    }
    return $null
}

function Send-HardwareSample {
    param([string]$JsonLine)

    try {
        $response = Invoke-RestMethod `
            -Uri $ApiUrl `
            -Method Post `
            -ContentType "application/json" `
            -Body $JsonLine `
            -TimeoutSec 1

        if ($script:apiOnline -ne $true) {
            Write-Host "Website bridge connected: $ApiUrl"
        }
        $script:apiOnline = $true
        return $response
    }
    catch {
        if ($script:apiOnline -ne $false) {
            Write-Warning "Website API is not ready at $ApiUrl. Serial monitoring will continue."
        }
        $script:apiOnline = $false
        return $null
    }
}

function Send-MotorCommand {
    param(
        [System.IO.Ports.SerialPort]$SerialPort,
        $Command
    )

    if ($null -eq $Command) {
        $SerialPort.WriteLine("CONTROL 0 1 0 0")
        return
    }

    $sequence = [uint32]$Command.sequence
    $emergencyStop = if ([bool]$Command.emergencyStop) { 1 } else { 0 }
    $run = if ([bool]$Command.run) { 1 } else { 0 }
    $speed = [Math]::Min(100, [Math]::Max(0, [int]$Command.speedPercent))
    $SerialPort.WriteLine("CONTROL $sequence $emergencyStop $run $speed")
}

Write-Host "ConveyorGuard ESP32 auto-watch"
Write-Host "Connect or reconnect the board at any time. Press Ctrl+C to stop."

while ($true) {
    $selectedPort = Select-SerialPort
    if (-not $selectedPort) {
        if ($Port) {
            Write-StatusOnce "Waiting for $Port..."
        }
        else {
            Write-StatusOnce "Waiting for an ESP32 serial/COM port..."
        }
        Start-Sleep -Milliseconds ([Math]::Max(250, $ReconnectDelaySeconds * 1000))
        continue
    }

    $serialPort = $null
    try {
        Write-Host "Opening $selectedPort at $BaudRate baud..."
        $serialPort = [System.IO.Ports.SerialPort]::new($selectedPort, $BaudRate)
        $serialPort.NewLine = "`n"
        $serialPort.ReadTimeout = 1000
        $serialPort.DtrEnable = $false
        $serialPort.RtsEnable = $false
        $serialPort.Open()
        $serialPort.WriteLine("CONTROL 0 1 0 0")
        $lastStatus = ""
        Write-Host "ESP32 serial connected on $selectedPort"

        while ($serialPort.IsOpen) {
            try {
                $line = $serialPort.ReadLine().Trim()
            }
            catch [System.TimeoutException] {
                continue
            }

            if (-not $line.StartsWith('{')) { continue }

            try {
                $payload = $line | ConvertFrom-Json
            }
            catch {
                continue
            }

            if ($payload.type -notin @('startup', 'measurement')) { continue }
            $response = Send-HardwareSample -JsonLine $line
            Send-MotorCommand -SerialPort $serialPort -Command $response.motorCommand

            if ($payload.type -eq 'measurement') {
                $rpm = if ($null -eq $payload.encoder_rpm) { "--" } else { "{0:N2}" -f [double]$payload.encoder_rpm }
                $temperature = if ($null -eq $payload.object_temp) { "--" } else { "{0:N2}" -f [double]$payload.object_temp }
                $left = if ($null -eq $payload.left_tof_mm) { "--" } else { [string]$payload.left_tof_mm }
                $right = if ($null -eq $payload.right_tof_mm) { "--" } else { [string]$payload.right_tof_mm }
                $pwm = if ($null -eq $payload.motor_pwm_percent) { "--" } else { [string]$payload.motor_pwm_percent }
                Write-Host "ESP32 LIVE | temp $temperature C | ToF $left/$right mm | RPM $rpm | PWM $pwm%"
            }
        }
    }
    catch {
        Write-Warning "Serial disconnected or unavailable on ${selectedPort}: $($_.Exception.Message)"
    }
    finally {
        if ($null -ne $serialPort) {
            try {
                if ($serialPort.IsOpen) { $serialPort.Close() }
                $serialPort.Dispose()
            }
            catch {}
        }
    }

    Start-Sleep -Milliseconds ([Math]::Max(250, $ReconnectDelaySeconds * 1000))
}
