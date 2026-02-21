# WhatsApp E-Commerce Monorepo

Production-oriented starter for a WhatsApp-integrated e-commerce system with:

- `backend/` Node.js + Express + PostgreSQL REST API
- `web/` Next.js + Tailwind customer and admin web app
- `mobile/` Flutter mobile client

## 1) Architecture

- Customer browses products on web or mobile
- Cart is stored locally (no forced account)
- Checkout creates an order in backend and returns a WhatsApp Click-to-Chat URL
- Customer is redirected to WhatsApp with pre-filled order details
- Admin dashboard manages products and orders

## 2) Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Flutter 3+

### Start PostgreSQL (optional via Docker)

Run `docker compose up -d`

### Backend

Run from `backend/`:

- `cp .env.example .env`
- `npm install`
- `npm run migrate`
- `npm run seed`
- `npm run dev`

Backend runs on `http://localhost:4000`.

### Web

Run from `web/`:

- `cp .env.local.example .env.local`
- `npm install`
- `npm run dev`

Web runs on `http://localhost:3000`.

### Mobile

Run from `mobile/`:

- `flutter pub get`
- `flutter run`

## 3) Default Admin

- Email: `admin@example.com`
- Password: `admin1234`

Change this in production.
