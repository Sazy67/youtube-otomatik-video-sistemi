// Dashboard JavaScript
const log = document.getElementById('log');
const status = document.getElementById('status');

function addLog(message) {
    const div = document.createElement('div');
    div.innerHTML = new Date().toLocaleTimeString() + ' - ' + message;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
    console.log(message);
}

function clearLog() {
    log.innerHTML = '<div>🗑️ Log cleared</div>';
}

function updateStatus(text) {
    if (status) {
        status.innerHTML = '<strong>System Status:</strong> ' + text;
    }
}

// Test Health Check
async function testHealthCheck() {
    addLog('🔍 Testing Health Check...');
    updateStatus('Checking system health...');
    
    try {
        const response = await fetch('/api/dashboard/status');
        const data = await response.json();
        
        if (data.success) {
            addLog('✅ Health Check SUCCESS');
            addLog('📊 Web Server: ' + data.data.webServer);
            addLog('⏱️ Uptime: ' + Math.floor(data.data.uptime) + ' seconds');
            addLog('💾 Memory: ' + Math.floor(data.data.memory.heapUsed / 1024 / 1024) + ' MB');
            updateStatus('System healthy ✅');
        } else {
            addLog('❌ Health Check FAILED');
            updateStatus('System error ❌');
        }
    } catch (error) {
        addLog('❌ Health Check ERROR: ' + error.message);
        updateStatus('Connection error ❌');
    }
}

// Test Video Creation
async function testVideoCreation() {
    addLog('🎬 Testing Video Creation...');
    updateStatus('Creating Papatya video...');
    
    const videoData = {
        topic: 'Papatya Bakımı Nasıl Olur - Ev Bahçeciliği Rehberi',
        duration: 480,
        style: 'educational'
    };
    
    try {
        const response = await fetch('/api/dashboard/video', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(videoData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            addLog('✅ Video Creation Started: ' + data.data.videoId);
            addLog('🌼 Topic: ' + data.data.topic);
            addLog('⏱️ Duration: ' + data.data.duration + ' seconds');
            
            // Simulate processing steps
            data.data.steps.forEach((step, i) => {
                setTimeout(() => {
                    addLog((i + 1) + '/6 ' + step);
                    if (i === data.data.steps.length - 1) {
                        setTimeout(() => {
                            addLog('🎉 Video Creation COMPLETED!');
                            updateStatus('Video ready for upload ✅');
                        }, 1000);
                    }
                }, i * 1000);
            });
            
        } else {
            addLog('❌ Video Creation FAILED');
            updateStatus('Video creation error ❌');
        }
    } catch (error) {
        addLog('❌ Video Creation ERROR: ' + error.message);
        updateStatus('Video creation error ❌');
    }
}

// Test Upload Simulation
async function testUpload() {
    addLog('📺 Testing Upload Simulation...');
    updateStatus('Uploading to YouTube...');
    
    try {
        const response = await fetch('/api/dashboard/upload', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ videoId: 'papatya-video' })
        });
        
        const data = await response.json();
        
        if (data.success) {
            addLog('🔐 Authenticating with YouTube...');
            
            setTimeout(() => addLog('📤 Uploading video file...'), 1000);
            setTimeout(() => addLog('🖼️ Uploading thumbnail...'), 2000);
            setTimeout(() => addLog('📝 Setting metadata...'), 3000);
            setTimeout(() => {
                addLog('✅ Upload COMPLETED!');
                addLog('🎉 YouTube URL: ' + data.data.url);
                addLog('📺 Video ID: ' + data.data.youtubeId);
                updateStatus('Video uploaded successfully ✅');
            }, 4000);
            
        } else {
            addLog('❌ Upload FAILED');
            updateStatus('Upload error ❌');
        }
    } catch (error) {
        addLog('❌ Upload ERROR: ' + error.message);
        updateStatus('Upload error ❌');
    }
}

// Test View Videos
async function testViewVideos() {
    addLog('📹 Testing View Videos...');
    updateStatus('Loading videos...');
    
    try {
        const response = await fetch('/api/dashboard/videos');
        const data = await response.json();
        
        if (data.success && data.data.length > 0) {
            addLog('✅ Videos Loaded: ' + data.data.length + ' found');
            
            data.data.forEach((video, i) => {
                addLog('🌼 Video ' + (i + 1) + ': ' + video.title);
                addLog('⏱️ Duration: ' + Math.floor(video.duration / 60) + ':' + 
                       (video.duration % 60).toString().padStart(2, '0'));
                addLog('📊 Status: ' + video.status.toUpperCase());
            });
            
            updateStatus(data.data.length + ' videos loaded ✅');
        } else {
            addLog('📹 No videos found');
            updateStatus('No videos found');
        }
    } catch (error) {
        addLog('❌ View Videos ERROR: ' + error.message);
        updateStatus('Load videos error ❌');
    }
}

// YouTube OAuth Test
async function startAuth() {
    addLog('🔐 Starting YouTube OAuth...');
    try {
        const response = await fetch('/auth/youtube?email=suatayaz@gmail.com');
        const data = await response.json();
        addLog('✅ OAuth URL generated');
        if (data.data && data.data.authUrl) {
            addLog('🌐 Opening OAuth URL...');
            window.open(data.data.authUrl, '_blank');
        }
    } catch (error) {
        addLog('❌ OAuth failed: ' + error.message);
    }
}

// Auto-load system status on page load
window.onload = function() {
    addLog('🌐 Dashboard loaded, testing connection...');
    setTimeout(testHealthCheck, 1000);
};

// Make functions globally available
window.testHealthCheck = testHealthCheck;
window.testVideoCreation = testVideoCreation;
window.testUpload = testUpload;
window.testViewVideos = testViewVideos;
window.startAuth = startAuth;
window.clearLog = clearLog;