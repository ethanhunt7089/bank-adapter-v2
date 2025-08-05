# Bank Adapter V2 - Auth Only

Authentication service สำหรับ Bank Adapter V2 ที่มีเฉพาะ Auth Module เท่านั้น

## คุณสมบัติ

- ✅ JWT Authentication
- ✅ Token Management (Create, Validate, Revoke)
- ✅ Client Management
- ✅ Auto Setup with Domain & Prefix
- ✅ PostgreSQL Database with Prisma ORM
- ✅ Docker Support

## การติดตั้ง

### 1. Clone และ Install Dependencies

```bash
cd bank-adapter-v2
npm install
```

### 2. Setup Environment

```bash
cp .env.example .env
# แก้ไข .env ตามความต้องการ
```

### 3. Setup Database

```bash
# สร้าง database migration
npx prisma migrate dev --name init

# Generate Prisma client
npx prisma generate
```

### 4. รัน Application

#### Development Mode
```bash
npm run start:dev
```

#### Docker Mode
```bash
docker-compose up -d
```

## API Endpoints

### Health Check
- `GET /` - Welcome message
- `GET /health` - Health check status

### Authentication
- `POST /auth/setup` - Auto setup client & token
- `POST /auth/client` - Create new client
- `POST /auth/token` - Generate token
- `POST /auth/validate` - Validate token
- `POST /auth/revoke` - Revoke token

## Environment Variables

```env
DATABASE_URL="postgresql://user:password@host:port/database"
JWT_SECRET="your-jwt-secret"
NODE_ENV="development"
PORT=3000
```

## Architecture

```
src/
├── auth/                   # Auth Module
│   ├── auth.controller.ts  # Auth endpoints
│   ├── auth.service.ts     # Auth business logic
│   ├── auth.module.ts      # Auth module config
│   ├── jwt.strategy.ts     # JWT strategy
│   └── jwt-auth.guard.ts   # JWT guard
├── lib/
│   └── prisma.ts          # Prisma client
├── app.controller.ts      # Main controller
├── app.service.ts         # Main service
├── app.module.ts          # Root module
└── main.ts               # Entry point
```

## Database Schema

- **tokens** - JWT tokens และ client credentials
- **api_logs** - API request logs

## License

Private License