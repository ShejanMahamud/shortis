# Shortis - URL Shortening Service

<p align="center">
  <img src="https://img.shields.io/badge/version-0.0.1-blue.svg" alt="Version" />
  <img src="https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg" alt="Node Version" />
  <img src="https://img.shields.io/badge/built_with-NestJS-ea2845.svg" alt="Built with NestJS" />
  <img src="https://img.shields.io/badge/database-PostgreSQL-336791.svg" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/cache-Redis-dc382d.svg" alt="Redis" />
</p>

A production-ready URL shortening service built with NestJS, featuring user authentication, analytics, subscription management, and payment processing.

## ✨ Features

### Core URL Shortening
- **Custom Short URLs**: Create short links with optional custom aliases
- **Password Protection**: Secure URLs with password authentication
- **Expiration Control**: Set automatic expiration dates for URLs
- **Click Limits**: Configure maximum click thresholds
- **QR Code Generation**: Automatic QR code creation for each short URL

### Analytics & Tracking
- **Click Analytics**: Comprehensive tracking with geolocation, device, browser, and OS detection
- **Real-time Analytics**: Live statistics with Redis caching
- **Date-based Reports**: Analytics with customizable date ranges
- **Unique Click Tracking**: IP-based unique visitor counting

### Authentication & User Management
- **Google OAuth Integration**: Seamless login with Google accounts
- **JWT Authentication**: Secure token-based authentication with refresh tokens
- **Role-based Access**: User and Admin role management
- **User Administration**: Admin panel for user management

### Subscription & Payment System
- **Subscription Plans**: Flexible subscription tiers with feature limits
- **Multiple Payment Gateways**: 
  - bKash integration for Bangladesh market
- **Usage Tracking**: Monitor feature usage against plan limits
- **Payment History**: Complete transaction records

### Performance & Scalability
- **Redis Caching**: High-performance URL lookup and analytics caching
- **Background Jobs**: Asynchronous processing with BullMQ
- **Connection Pooling**: Optimized database connections
- **Scheduled Tasks**: Automated analytics processing every 30 seconds

## 🏗️ Tech Stack

- **Backend**: NestJS (Node.js)
- **Database**: PostgreSQL with Prisma ORM
- **Cache**: Redis with BullMQ for job queues
- **Authentication**: JWT + Google OAuth2
- **Payments**: bKash (using [bkash-js](https://www.npmjs.com/package/bkash-js))
- **File Storage**: Cloudinary (for QR codes)
- **API Documentation**: Swagger/OpenAPI

## 📦 Open Source Contribution-

### bkash-js Package

During the development of Shortis, i created and published **[bkash-js](https://www.npmjs.com/package/bkash-js)** - a Node.js SDK for bKash payment gateway integration.

**Why we built it:**
- No existing robust Node.js package for bKash integration
- Needed type-safe, modern API wrapper for bKash payment flows
- Wanted to contribute back to the developer community

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL
- Redis
- pnpm (recommended)

### Installation

1. **Clone and install dependencies**
   ```bash
   git clone https://github.com/ShejanMahamud/shortis.git
   cd shortis
   pnpm install
   ```

2. **Environment setup**
   ```bash
   cp .env.example .env
   # Configure your environment variables
   ```

3. **Database setup**
   ```bash
   # Start PostgreSQL and Redis with Docker
   docker-compose up -d
   
   # Run migrations
   pnpm prisma migrate deploy
   pnpm prisma generate
   ```

4. **Start the application**
   ```bash
   # Development
   pnpm start:dev
   
   # Production
   pnpm build
   pnpm start:prod
   ```

The API will be available at `http://localhost:3000/v1/api/`

## 🔧 Configuration

### Required Environment Variables

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/shortis"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# JWT
ACCESS_TOKEN_SECRET=your_access_secret
REFRESH_TOKEN_SECRET=your_refresh_secret
ACCESS_TOKEN_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/v1/api/auth/google/callback

# bKash (for Bangladesh)
BKASH_API_KEY=your_bkash_api_key
BKASH_API_SECRET=your_bkash_secret
BKASH_USERNAME=01612345678
BKASH_PASSWORD=12345678
BKASH_CALLBACK_URL=http://localhost:3000/v1/api/bkash/callback

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Application
PORT=3000
NODE_ENV=development
```

## � API Documentation

Interactive API documentation is available at:
- **Swagger UI**: `http://localhost:3000/v1/api/docs`

### Complete API Endpoints

#### Application
```
GET    /v1/api/                  # API health check and system info
```

#### Authentication
```
GET    /v1/api/auth/google         # Initiate Google OAuth login
GET    /v1/api/auth/google/callback # Google OAuth callback handler
GET    /v1/api/auth/me             # Get current user profile
POST   /v1/api/auth/refresh        # Refresh access token
POST   /v1/api/auth/logout         # Logout and invalidate tokens
PATCH  /v1/api/auth/profile        # Update user profile
```

#### User Management (Admin only)
```
GET    /v1/api/users               # Get all users (paginated, with filters)
GET    /v1/api/users/:id           # Get user by ID
PATCH  /v1/api/users/:id           # Update user by ID
DELETE /v1/api/users/:id           # Delete user by ID
PATCH  /v1/api/users/:id/toggle-status # Toggle user active/inactive status
```

#### URL Shortening
```
POST   /v1/api/shortner            # Create shortened URL
GET    /v1/api/shortner            # Get user's URLs (paginated)
GET    /v1/api/shortner/:id        # Get URL details by ID
GET    /v1/api/shortner/r/:slug    # Redirect to original URL
PATCH  /v1/api/shortner/:id        # Update URL details
PATCH  /v1/api/shortner/:id/toggle-status # Toggle URL active/inactive
DELETE /v1/api/shortner/:id        # Delete URL
```

#### Analytics
```
GET    /v1/api/shortner/:id/analytics # Get comprehensive URL analytics
```

#### Plans Management
```
POST   /v1/api/plan                # Create new plan
GET    /v1/api/plan                # Get all available plans
GET    /v1/api/plan/:id            # Get plan by ID
PATCH  /v1/api/plan/:id            # Update plan
DELETE /v1/api/plan/:id            # Delete plan
```

#### Plan Features
```
POST   /v1/api/plan/features       # Create plan feature
GET    /v1/api/plan/features/:planId # Get features by plan ID
GET    /v1/api/plan/features/:id   # Get feature by ID
PATCH  /v1/api/plan/features/:id   # Update plan feature
DELETE /v1/api/plan/features/:id   # Delete plan feature
```

#### Subscriptions
```
POST   /v1/api/subscription        # Create subscription
PATCH  /v1/api/subscription/:id    # Update subscription
```

#### bKash Payments
```
POST   /v1/api/bkash               # Create bKash payment
GET    /v1/api/bkash/callback      # bKash payment callback
GET    /v1/api/bkash/verify        # Verify payment status
POST   /v1/api/bkash/refund        # Initiate payment refund
GET    /v1/api/bkash/refund/status # Check refund status
```

## 🏗️ Project Structure

```
├── auth/
│   ├── decorators/
│   │   ├── index.ts
│   │   └── roles.decorator.ts
│   ├── dto/
│   │   ├── google-login.dto.ts
│   │   ├── index.ts
│   │   ├── refresh-token.dto.ts
│   │   └── update-user.dto.ts
│   ├── exceptions/
│   │   ├── auth.exceptions.ts
│   │   └── index.ts
│   ├── guards/
│   │   ├── access.guard.ts
│   │   ├── index.ts
│   │   ├── refresh.guard.ts
│   │   └── roles.guard.ts
│   ├── interfaces/
│   │   ├── auth.interface.ts
│   │   └── index.ts
│   ├── services/
│   │   ├── index.ts
│   │   ├── token.service.ts
│   │   └── user.service.ts
│   ├── strategies/
│   │   ├── access.strategy.ts
│   │   ├── google.strategy.ts
│   │   ├── index.ts
│   │   └── refresh.strategy.ts
│   ├── types/
│   │   └── index.ts
│   ├── auth.controller.ts
│   ├── auth.module.ts
│   ├── auth.service.ts
│   ├── index.ts
│   └── user-management.controller.ts
├── bkash/
│   ├── dto/
│   │   ├── create-bkash-payment.dto.ts
│   │   ├── refund-bkash.dto.ts
│   │   └── update-bkash.dto.ts
│   ├── interfaces/
│   │   ├── bkash.interface.ts
│   │   └── index.ts
│   ├── bkash.controller.ts
│   ├── bkash.module.ts
│   └── bkash.service.ts
├── interfaces/
│   ├── global.interface.ts
│   └── index.ts
├── plan/
│   ├── dto/
│   │   ├── create-plan-feature.dto.ts
│   │   ├── create-plan.dto.ts
│   │   ├── update-plan-feature.dto.ts
│   │   └── update-plan.dto.ts
│   ├── exceptions/
│   │   ├── index.ts
│   │   └── plan.exception.ts
│   ├── interfaces/
│   │   ├── index.ts
│   │   └── plan.interface.ts
│   ├── services/
│   │   └── plan-feature.service.ts
│   ├── plan.controller.ts
│   ├── plan.module.ts
│   └── plan.service.ts
├── prisma/
│   ├── prisma.module.ts
│   └── prisma.service.ts
├── queue/
│   ├── interfaces/
│   │   ├── index.ts
│   │   └── processor.interface.ts
│   ├── processors/
│   │   ├── base.processor.ts
│   │   └── processor.factory.ts
│   └── queue.module.ts
├── shortner/
│   ├── dto/
│   │   ├── access-url.dto.ts
│   │   ├── create-shortner.dto.ts
│   │   ├── get-analytics.dto.ts
│   │   ├── index.ts
│   │   └── update-shortner.dto.ts
│   ├── exceptions/
│   │   ├── index.ts
│   │   └── shortner.exceptions.ts
│   ├── interfaces/
│   │   ├── index.ts
│   │   └── shortner.interface.ts
│   ├── services/
│   │   ├── analytics.processor.ts
│   │   ├── analytics.service.ts
│   │   ├── billing.processor.ts
│   │   ├── index.ts
│   │   └── validation.service.ts
│   ├── shortner.controller.ts
│   ├── shortner.module.ts
│   └── shortner.service.ts
├── subscription/
│   ├── dto/
│   │   ├── create-subscription.dto.ts
│   │   └── update-subscription.dto.ts
│   ├── interfaces/
│   │   ├── index.ts
│   │   └── subscription.interface.ts
│   ├── subscription.controller.ts
│   ├── subscription.module.ts
│   └── subscription.service.ts
├── task/
│   ├── task.module.ts
│   └── task.service.ts
├── types/
│   └── express.d.ts
├── upload/
│   ├── exceptions/
│   │   ├── index.ts
│   │   └── upload.exception.ts
│   ├── interfaces/
│   │   ├── index.ts
│   │   └── upload.interface.ts
│   ├── upload.module.ts
│   ├── upload.processor.ts
│   └── upload.service.ts
├── utils/
│   ├── system-info.ts
│   └── util.ts
├── app.controller.ts
├── app.module.ts
└── main.ts
```

## � Performance Benchmarks

The service achieves high performance with Redis caching:
- **17,661 requests/second** average throughput
- **302 redirects** handled efficiently
- **Sub-millisecond** cached URL lookups

## 🚀 Deployment

### Docker Production Setup

```bash
# Build and deploy
docker-compose -f docker-compose.prod.yml up -d

# Run migrations
docker exec shortis_api pnpm prisma migrate deploy
```


## 📄 License

This project is proprietary software. All rights reserved.

---

<p align="center">
  Built with ❤️ using NestJS
</p>