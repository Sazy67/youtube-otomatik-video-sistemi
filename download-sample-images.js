const axios = require('axios');
const fs = require('fs');

async function downloadSampleImages() {
    console.log('📸 Downloading sample garden images...');
    
    // Free garden images (no API key needed)
    const imageUrls = [
        'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=1920&h=1080&fit=crop',
        'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=1920&h=1080&fit=crop',
        'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=1920&h=1080&fit=crop'
    ];
    
    for (let i = 0; i < imageUrls.length; i++) {
        try {
            console.log(`📥 Downloading image ${i + 1}...`);
            
            const response = await axios.get(imageUrls[i], {
                responseType: 'arraybuffer',
                timeout: 10000
            });
            
            const imagePath = `./images/sample_${i + 1}.jpg`;
            fs.writeFileSync(imagePath, response.data);
            
            console.log(`✅ Downloaded: ${imagePath}`);
            
        } catch (error) {
            console.log(`❌ Failed to download image ${i + 1}:`, error.message);
        }
    }
    
    console.log('🎉 Sample images ready!');
}

downloadSampleImages();