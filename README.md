# M&G Jewelry E-Commerce Platform

A luxurious, high-performance e-commerce web application built for M&G Jewelry. Designed with Next.js 16, Prisma, Tailwind CSS, and Stripe to provide a seamless, premium shopping experience.

## Features

- **Storefront**: Browse products by categories (chains, bracelets, earrings, rings, necklaces) and collections.
- **Internationalization Support (i18n)**: English and Spanish dual language support for products, collections, and site content.
- **Premium UI**: Crafted using Tailwind CSS, Radix UI (Shadcn), and framer animations (`tailwindcss-animate`) offering a smooth modern look.
- **Cart & Checkout Workflow**: Integration with Stripe for secure transaction processing.
- **Authentication**: User accounts with NextAuth, defining roles for `customer` and `admin`.
- **Admin Dashboard functionality**: Manage Products, Collections, Orders, and Site Settings.
- **Concierge Services**: Dedicated forms for custom jewelry requests, wholesale inquiries, and direct order questions.

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Database / ORM**: [Prisma](https://www.prisma.io/) (SQLite out-of-the-box, can be migrated to PostgreSQL/MySQL)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) + PostCSS
- **Components**: [Radix UI](https://www.radix-ui.com/) / Shadcn
- **State Management**: [Zustand](https://zustand-demo.pmnd.rs/) & Immer
- **Forms & Validation**: `react-hook-form` + `zod`
- **Payments**: [Stripe](https://stripe.com/)
- **Authentication**: `next-auth` + `bcryptjs`

## Getting Started

### Prerequisites

You will need [Node.js](https://nodejs.org/en/) (v18+) and your preferred package manager (`npm`, `yarn`, `pnpm`, or `bun`). It is currently styled using a `bun.lock` file, meaning `bun` is the primary package manager.

```bash
# Install Bun (if you don't have it)
npm install -g bun
```

### Installation

1. **Install dependencies:**
   ```bash
   bun install
   ```
   *(Alternatively: `npm install`)*

2. **Configure Environment Variables:**
   Create a `.env` file in the root based on `.env.example` (if present) or provide the following:
   ```env
   DATABASE_URL="file:./dev.db"
   NEXTAUTH_SECRET="your_nextauth_secret"
   STRIPE_SECRET_KEY="your_stripe_secret_key"
   STRIPE_WEBHOOK_SECRET="your_stripe_webhook_secret"
   ```

3. **Initialize Database:**
   Generate the Prisma client and push the schema to SQLite.
   ```bash
   npx prisma generate
   npx prisma db push
   ```
   *Optional: Seed the database with initial products and collections:*
   ```bash
   npm run prisma db seed
   ```

4. **Run the Development Server:**
   ```bash
   bun run dev
   ```
   *(Alternatively: `npm run dev`)*

5. **Open the application:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Database Schema Highlights

The Prisma schema incorporates robust data models:
- **Product & Collection**: Contains pricing (with currencies), physical characteristics (metalType, karat, stoneType), media links, and bi-lingual fields (`nameEs`, `descriptionEs`).
- **Orders & Transactions**: Tracking from the cart to successful Stripe execution.
- **User & Sessions**: Secure NextAuth implementation linking user accounts and external providers.
- **SiteSettings**: Dynamically allows admins to modify global variables such as contact info, tagline, and default languages.

## Scripts Command Reference

- `npm run dev`: Starts the Next.js development server.
- `npm run build`: Builds the application for production deployment.
- `npm run start`: Starts the application in production mode.
- `npm run lint`: Identifies any linting errors using ESLint.

## Deployment

The easiest way to deploy this Next.js application is to use the [Vercel Platform](https://vercel.com/new). Ensure that you set your Production Environment variables (Stripe Keys, NextAuth Secrets, and your Production Database URL) effectively in Vercel. 
