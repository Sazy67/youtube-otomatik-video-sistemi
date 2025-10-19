# 🎬 YouTube Otomatik Video Sistemi - Yeşil Hayat Rotası

Yapay zeka destekli otomatik YouTube video oluşturma ve yükleme sistemi. AI ile Türkçe script oluşturur, profesyonel ses ekler, konuyla ilgili görseller toplar ve YouTube kanalınıza otomatik yükler.

## ✨ Özellikler

- 🤖 **Yapay Zeka Script Yazımı** - Google Gemini Pro ile doğal Türkçe içerik
- 🎤 **Profesyonel Türkçe Ses** - ElevenLabs ile insan gibi narrasyon
- 📸 **Otomatik Görsel Toplama** - Unsplash'dan konuyla ilgili HD fotoğraflar
- 🎞️ **Otomatik Video Montajı** - FFmpeg ile profesyonel HD video oluşturma
- 📺 **YouTube Otomatik Yükleme** - OAuth ile güvenli kanal yükleme
- 👀 **Önizleme Sistemi** - Yüklemeden önce video kontrolü
- 🎛️ **Kolay Yönetim Paneli** - Web tabanlı kullanıcı dostu arayüz

## 🚀 Kurulum Rehberi

### 📋 Gereksinimler
- Node.js 18 veya üzeri
- FFmpeg video işleme yazılımı
- API Anahtarları (Google Gemini, ElevenLabs, Unsplash, YouTube)

### 🔧 Kurulum Adımları

1. **Projeyi İndirin:**
```bash
git clone https://github.com/[kullanici-adi]/youtube-otomatik-video-sistemi.git
cd youtube-otomatik-video-sistemi
```

2. **Gerekli Paketleri Yükleyin:**
```bash
npm install
```

3. **FFmpeg'i Kurun:**
```bash
# Windows (Chocolatey ile)
choco install ffmpeg

# Windows (Winget ile)
winget install Gyan.FFmpeg

# Manuel kurulum için: https://ffmpeg.org/download.html
```

4. **Yapılandırma Dosyasını Hazırlayın:**
```bash
# .env.example dosyasını kopyalayın
copy .env.example .env
```

5. **API Anahtarlarınızı Ekleyin:**
`.env` dosyasını açın ve API anahtarlarınızı girin (aşağıda detaylar)

6. **Sistemi Başlatın:**
```bash
npm start
# veya
node simple-server.js
```

7. **Yönetim Panelini Açın:**
Tarayıcınızda: `http://localhost:3001/dashboard`

## 🔑 API Anahtarları Nasıl Alınır

### 🧠 Google Gemini Pro (Ücretsiz)
1. https://makersuite.google.com/app/apikey adresine gidin
2. Google hesabınızla giriş yapın
3. "Create API Key" butonuna tıklayın
4. Oluşan anahtarı `.env` dosyasındaki `GEMINI_API_KEY` yerine yazın

### 🎤 ElevenLabs (Aylık Ücretsiz Kontenjan)
1. https://elevenlabs.io/ adresine gidin ve hesap oluşturun
2. Dashboard'da "Profile" → "API Keys" bölümüne gidin
3. Yeni API anahtarı oluşturun
4. Anahtarı `.env` dosyasındaki `ELEVENLABS_API_KEY` yerine yazın

### 📸 Unsplash (Ücretsiz)
1. https://unsplash.com/developers adresine gidin
2. Hesap oluşturun ve "New Application" tıklayın
3. Uygulama bilgilerini doldurun
4. "Access Key"i kopyalayın
5. `.env` dosyasındaki `UNSPLASH_ACCESS_KEY` yerine yazın

### 📺 YouTube API (Ücretsiz)
1. https://console.cloud.google.com/ adresine gidin
2. Yeni proje oluşturun veya mevcut projeyi seçin
3. "APIs & Services" → "Library" → "YouTube Data API v3" etkinleştirin
4. "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. Application type: "Web application"
6. Authorized redirect URIs: `http://localhost:3001/auth/youtube/callback`
7. Client ID ve Client Secret'ı `.env` dosyasına ekleyin

## 🎯 Nasıl Kullanılır

### 1️⃣ İlk Kurulum
1. **Yönetim panelini açın:** `http://localhost:3001/dashboard`
2. **YouTube OAuth'u tamamlayın:** "YouTube OAuth" butonuna tıklayın
3. **Google hesabınızla giriş yapın** ve izinleri onaylayın

### 2️⃣ Video Oluşturma
1. **Konu girin:** Örnek: "Gül Bakımı", "Domates Yetiştirme", "Balkon Bahçeciliği"
2. **Video süresini ayarlayın:** 60-1800 saniye arası
3. **Video stilini seçin:** Eğitici, Eğlenceli, Haber
4. **"GERÇEK VİDEO OLUŞTUR" butonuna tıklayın**

### 3️⃣ Önizleme ve Yükleme
1. **Video oluşmasını bekleyin** (8-15 dakika)
2. **Önizleme bölümünde videoyu inceleyin**
3. **Beğenirseniz "ONAYLA VE YÜKLE" butonuna tıklayın**
4. **Video otomatik olarak YouTube kanalınıza yüklenecek**

## 📁 Proje Dosya Yapısı

```
youtube-otomatik-video-sistemi/
├── 📄 simple-server.js              # Ana sunucu dosyası
├── 🎬 real-video-creator-fixed.js   # Video oluşturma motoru
├── 📺 youtube-uploader.js           # YouTube yükleme sistemi
├── 🔐 oauth-token-manager.js        # OAuth token yönetimi
├── 🔌 dashboard-api.js              # API endpoint'leri
├── 📁 public/                       # Web arayüzü dosyaları
│   ├── 🌐 index.html               # Ana dashboard sayfası
│   └── ⚡ dashboard.js              # Frontend JavaScript
├── 📁 videos/                       # Oluşturulan videolar
├── 📁 images/                       # İndirilen görseller
├── 📁 audio/                        # Oluşturulan ses dosyaları
├── 📁 temp/                         # Geçici dosyalar
├── ⚙️ .env                          # Yapılandırma dosyası
├── 📋 package.json                  # Proje bağımlılıkları
└── 📖 README.md                     # Bu dosya
```

## 🌿 Yeşil Hayat Rotası Kanalı İçin Özel Tasarım

Bu sistem özellikle **bahçıvanlık**, **doğa** ve **sürdürülebilir yaşam** konularında içerik üreten YouTube kanalları için optimize edilmiştir.

### 🎯 Örnek Video Konuları:
- 🌱 **Sebze Yetiştirme:** "Domates Nasıl Yetiştirilir", "Salatalık Bakımı"
- 🌿 **Ev Bitkileri:** "İç Mekan Bitkileri", "Sukulent Bakımı"
- 🥕 **Organik Bahçıvanlık:** "Doğal Gübre Yapımı", "Zararlılardan Korunma"
- 🌹 **Çiçek Bakımı:** "Gül Budama Teknikleri", "Çiçek Sulama İpuçları"
- 🌾 **Balkon Bahçeciliği:** "Küçük Alanlarda Bahçıvanlık"
- 🍃 **Aromatik Bitkiler:** "Fesleğen Yetiştirme", "Nane Bakımı"

## 🛠️ Teknik Altyapı

- **🖥️ Backend:** Node.js + Express.js
- **🧠 Yapay Zeka:** Google Gemini Pro (Türkçe optimized)
- **🎤 Ses Sentezi:** ElevenLabs Multilingual v2
- **📸 Görsel API:** Unsplash (Ücretsiz HD fotoğraflar)
- **🎞️ Video İşleme:** FFmpeg (Açık kaynak)
- **📺 Upload:** YouTube Data API v3
- **🔐 Kimlik Doğrulama:** OAuth 2.0
- **🌐 Arayüz:** Vanilla HTML/CSS/JavaScript

## 🔒 Güvenlik ve Gizlilik

- ✅ **API anahtarları** `.env` dosyasında güvenli şekilde saklanır
- ✅ **OAuth token'ları** yerel olarak şifrelenir
- ✅ **Kişisel veriler** GitHub'a yüklenmez
- ✅ **Video dosyaları** sadece yerel bilgisayarda tutulur
- ✅ **Açık kaynak** - tüm kod incelenebilir

## 📝 Lisans

Bu proje MIT lisansı altında yayınlanmıştır. Detaylar için `LICENSE` dosyasına bakabilirsiniz.

## 🤝 Katkıda Bulunma

Projeye katkıda bulunmak isterseniz:

1. **Fork yapın** (projeyi kendi hesabınıza kopyalayın)
2. **Yeni özellik dalı oluşturun** (`git checkout -b yeni-ozellik`)
3. **Değişikliklerinizi commit edin** (`git commit -m 'Yeni özellik eklendi'`)
4. **Dalınızı push edin** (`git push origin yeni-ozellik`)
5. **Pull Request açın**

## 🐛 Sorun Bildirimi

Bir hata bulduysanız veya öneriniz varsa:
- GitHub Issues bölümünden yeni bir konu açın
- Sorunu detaylı şekilde açıklayın
- Mümkünse ekran görüntüsü ekleyin

## 📞 İletişim ve Destek

- 🐙 **GitHub:** [Proje Sayfası]
- 📺 **YouTube:** Yeşil Hayat Rotası
- 📧 **E-posta:** [İletişim e-postası]

## 🎉 Teşekkürler

Bu projeyi mümkün kılan açık kaynak teknolojilere ve API sağlayıcılarına teşekkürler:
- Google Gemini Pro
- ElevenLabs
- Unsplash
- YouTube API
- FFmpeg
- Node.js topluluğu

---

⭐ **Bu projeyi beğendiyseniz GitHub'da yıldız vermeyi unutmayın!**

🌿 **Doğa dostu içerikler üretin, dünyayı daha yeşil yapın!**