Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer

Write-Host "Available voices:"
$synth.GetInstalledVoices() | ForEach-Object { 
    Write-Host "  - " $_.VoiceInfo.Name "(" $_.VoiceInfo.Culture ")"
}

# Use English voice
$synth.SelectVoice("Microsoft Zira Desktop")

# Test simple TTS with English text
$testFile = "./temp/test-audio-en.wav"
$synth.SetOutputToWaveFile($testFile)
$synth.Speak("Hello, this is a test message in English.")
$synth.Dispose()

if (Test-Path $testFile) {
    $fileSize = (Get-Item $testFile).Length
    Write-Host "Test file created: $testFile"
    Write-Host "File size: $fileSize bytes"
} else {
    Write-Host "ERROR: Test file was not created!"
}