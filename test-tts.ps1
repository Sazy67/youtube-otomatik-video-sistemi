Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer

Write-Host "Available voices:"
$synth.GetInstalledVoices() | ForEach-Object { 
    Write-Host "  - " $_.VoiceInfo.Name "(" $_.VoiceInfo.Culture ")"
}

# Test simple TTS
$testFile = "./temp/test-audio.wav"
$synth.SetOutputToWaveFile($testFile)
$synth.Speak("Merhaba, bu bir test mesajıdır.")
$synth.Dispose()

if (Test-Path $testFile) {
    $fileSize = (Get-Item $testFile).Length
    Write-Host "Test file created: $testFile"
    Write-Host "File size: $fileSize bytes"
} else {
    Write-Host "ERROR: Test file was not created!"
}