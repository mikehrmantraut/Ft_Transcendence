# Transcendence Backend - Microservices

Bu proje, Transcendence platformu için Fastify ve Node.js kullanılarak geliştirilmiş microservice mimarisine sahip backend sistemidir.

## 🏗️ Mimari

### Microservice Yapısı

1. **API Gateway** (Port: 3001) - Ana giriş noktası, route yönlendirme, authentication middleware
2. **Auth Service** (Port: 3002) - Kullanıcı authentication, JWT token yönetimi
3. **User Service** (Port: 3003) - Kullanıcı profilleri, arkadaş sistemi, online status
4. **Game Service** (Port: 3004) - Match history, istatistikler, turnuvalar, leaderboard
5. **File Service** (Port: 3005) - Avatar upload, dosya yönetimi
6. **Shared** - Ortak tipler, utility fonksiyonları ve kütüphaneler

### Teknoloji Stack

- **Framework**: Fastify
- **Database**: SQLite (her mikroservis için ayrı)
- **Authentication**: JWT + Refresh Tokens
- **Language**: TypeScript
- **Package Manager**: npm

## 🚀 Hızlı Başlangıç

### Gereksinimler

- Node.js (v18+)
- npm

### Kurulum

1. **Bağımlılıkları yükleyin:**
```bash
npm run install:all
```

2. **Shared modülünü derleyin:**
```bash
cd shared && npm run build
```

3. **Auth Service veritabanını başlatın:**
```bash
cd auth-service && npm run db:migrate
```

4. **Tüm servisleri başlatın:**
```bash
npm run dev
```

### Manuel Servis Başlatma

Her servisi ayrı ayrı başlatmak için:

```bash
# API Gateway
npm run dev:gateway

# Auth Service  
npm run dev:auth

# User Service
npm run dev:user

# Game Service
npm run dev:game

# File Service
npm run dev:file
```

## 📡 API Endpoints

### Auth Service (http://localhost:3002)

- `POST /api/auth/register` - Kullanıcı kaydı
- `POST /api/auth/login` - Kullanıcı girişi  
- `POST /api/auth/logout` - Kullanıcı çıkışı
- `POST /api/auth/refresh` - Token yenileme
- `POST /api/auth/validate` - Token doğrulama (internal)
- `GET /api/auth/user/:userId` - Kullanıcı bilgisi (internal)

### API Gateway (http://localhost:3001)

Tüm endpoint'ler API Gateway üzerinden de erişilebilir:
- `/api/auth/*` → Auth Service
- `/api/users/*` → User Service  
- `/api/games/*` → Game Service
- `/api/files/*` → File Service
- `/api/leaderboard/*` → Game Service

## 🔧 Yapılandırma

### Environment Variables

Her servis için `.env` dosyası oluşturabilirsiniz:

**Auth Service (.env)**
```env
NODE_ENV=development
PORT=3002
DATABASE_PATH=./data/auth.db
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d
```

**API Gateway (.env)**
```env
NODE_ENV=development
PORT=3001
AUTH_SERVICE_URL=http://localhost:3002
USER_SERVICE_URL=http://localhost:3003
GAME_SERVICE_URL=http://localhost:3004
FILE_SERVICE_URL=http://localhost:3005
JWT_SECRET=your-super-secret-jwt-key-change-in-production
```

## 🗄️ Veritabanı

Her mikroservis kendi SQLite veritabanını kullanır:

- **Auth Service**: `auth-service/data/auth.db`
- **User Service**: `user-service/data/users.db` 
- **Game Service**: `game-service/data/games.db`

## 🛡️ Güvenlik

- **CORS**: Frontend domain'leri için yapılandırılmış
- **Helmet**: Güvenlik header'ları
- **Rate Limiting**: API endpoint'leri için istek sınırlaması
- **JWT**: Stateless authentication
- **Refresh Tokens**: HttpOnly cookie'lerde saklanır
- **Password Hashing**: bcrypt ile 12 rounds

## 📊 Frontend Entegrasyonu

Frontend'iniz şu URL'leri kullanmalıdır:

```typescript
// environment.ts
export const BASE_API_URL = 'http://localhost:3001';
```

Örnek kullanım:
```typescript
// Login
POST http://localhost:3001/api/auth/login
{
  "email": "user@example.com",
  "password": "password123"
}

// Response
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "displayName": "john_doe",
    "isActive": true
  },
  "accessToken": "jwt-token-here",
  "expiresIn": 604800
}
```

## 🔄 Geliştirme Durumu

### ✅ Tamamlanan

- [x] Proje yapısı ve mikroservis mimarisi
- [x] Shared modülü (tipler, utility'ler)
- [x] API Gateway (proxy, authentication middleware)
- [x] Auth Service (register, login, JWT)
- [x] SQLite veritabanı yapısı
- [x] TypeScript konfigürasyonu

### 🚧 Devam Eden

- [ ] User Service (profil yönetimi, arkadaş sistemi)
- [ ] Game Service (match history, tournament)
- [ ] File Service (avatar upload)
- [ ] WebSocket entegrasyonu
- [ ] Email verification

### 📋 Sonraki Adımlar

1. **User Service**: Kullanıcı profilleri, arkadaş ekleme/çıkarma
2. **Game Service**: Match history, istatistikler, turnuvalar
3. **File Service**: Avatar upload ve dosya yönetimi
4. **Real-time**: WebSocket ile online status, game events
5. **Testing**: Unit ve integration testleri

## 🤝 Katkıda Bulunma

1. Repository'yi fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Değişikliklerinizi commit edin (`git commit -m 'Add amazing feature'`)
4. Branch'inizi push edin (`git push origin feature/amazing-feature`)
5. Pull Request oluşturun

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

## 🆘 Yardım

Sorun yaşıyorsanız:

1. `npm run install:all` komutu ile tüm bağımlılıkları yeniden yükleyin
2. Log dosyalarını kontrol edin
3. Health check endpoint'lerini test edin:
   - http://localhost:3001/health (API Gateway)
   - http://localhost:3002/health (Auth Service)
