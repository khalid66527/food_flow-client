<div align="center">

# 🍔 Food Flow — Modern Multi-Vendor Food Delivery Platform (Client)

[![Live Demo](https://img.shields.io/badge/Live_Demo-fooddeliveryplatform.vercel.app-FF4B2B?style=for-the-badge&logo=vercel&logoColor=white)](https://fooddeliveryplatform.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js_16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript_5-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socketdotio&logoColor=white)](https://socket.io/)

<p align="center">
  <b>Food Flow</b> is a state-of-the-art, feature-packed full-stack food delivery ecosystem designed for seamless interactions between <b>Customers</b>, <b>Restaurants</b>, <b>Delivery Riders</b>, and <b>Platform Admins</b>. Powered by Next.js 16, real-time WebSocket communication, Stripe payments, and cutting-edge Gemini/DeepSeek AI tools.
</p>

[🌐 Live Application](https://fooddeliveryplatform.vercel.app) • [🖥️ Client Repository](https://github.com/khalid66527/food_flow-client.git) • [⚙️ Server Repository](https://github.com/khalid66527/food_flow-server.git)

---

</div>

## 📌 Table of Contents

- [✨ Key Highlights & Features](#-key-highlights--features)
  - [👤 Customer Experience](#-customer-experience)
  - [🏪 Restaurant Partner Portal](#-restaurant-partner-portal)
  - [🚴 Rider / Courier Dashboard](#-rider--courier-dashboard)
  - [👑 Super Admin Command Center](#-super-admin-command-center)
  - [🤖 AI Studio & Smart Assistant](#-ai-studio--smart-assistant)
- [🛠️ Tech Stack & Libraries](#️-tech-stack--libraries)
- [📂 Project Architecture](#-project-architecture)
- [🚀 Quickstart & Setup Guide](#-quickstart--setup-guide)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Running the Development Server](#running-the-development-server)
- [🧪 Scripts](#-scripts)
- [🌐 Deployment](#-deployment)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)

---

## ✨ Key Highlights & Features

### 👤 Customer Experience
- **Interactive Restaurant & Dish Catalog:** Browse restaurants with real-time open/closed status, cuisine filters, search, rating filters, and price ranges.
- **Customizable Food Ordering:** Select variations, addons, spice levels, and special notes.
- **Persistent Cart & Coupons:** Dynamic cart calculation, real-time discount coupon validations, and tax/delivery fee management.
- **Secure Multi-Method Checkout:** Pay securely via **Stripe Card Checkout** or choose **Cash on Delivery (COD)**.
- **Live GPS Order Tracking:** Real-time visual tracking on interactive maps powered by Leaflet & OpenStreetMap, displaying order phases from kitchen preparation to doorstep delivery.
- **PDF Invoice Download:** Instant invoice generation and receipt download using `jsPDF` and `html2pdf`.
- **User Dashboard:** Order history, favorites list, address book management, review & rating submissions, and profile settings.

### 🏪 Restaurant Partner Portal
- **Vendor Onboarding:** Register restaurant details, delivery radius, preparation time, and operational schedules.
- **Menu & Dish Management:** Create, edit, and organize dishes with pricing, categories, tags, images, and add-on groups.
- **Real-time Order Alerts:** Instant sound and modal notifications for new orders via Socket.io.
- **Order Pipeline Processing:** Move orders through lifecycle states: `Pending` ➔ `Accepted` ➔ `Preparing` ➔ `Ready for Pickup`.
- **Earnings & Analytics:** Real-time revenue insights, popular dishes, and order metrics.

### 🚴 Rider / Courier Dashboard
- **Delivery Request Dispatch:** Instant alerts when nearby restaurant orders are ready for pickup.
- **Real-time Navigation & State Updates:** Accept orders, update transit status (`Picked Up` ➔ `In Transit` ➔ `Delivered`).
- **Earnings & Delivery History:** Track completed trips, tips, daily payouts, and performance stats.

### 👑 Super Admin Command Center
- **System Metrics & Analytics:** High-level platform KPIs including gross merchandise value (GMV), active users, total orders, and platform commission.
- **Vendor & Rider Approvals:** Verify and approve restaurant applications and rider onboarding documents.
- **Content & Platform Management:** Manage food categories, global coupon codes, delivery zones, platform fees, and site settings.
- **User Moderation:** Manage customer/vendor accounts, permissions, role assignments, and ban/unban status.

### 🤖 AI Studio & Smart Assistant
- **AI Food Studio:** Generate and enhance appetizing food imagery with custom prompt controls powered by Google Gemini Image models.
- **Conversational Food Bot:** Interactive AI food assistant powered by DeepSeek (`deepseek-v4-flash` via AgentRouter) & Google Gemini to recommend dishes, help tailor meal plans, and answer platform queries.

---

## 🛠️ Tech Stack & Libraries

| Category | Technologies / Libraries |
| :--- | :--- |
| **Framework** | [Next.js 16 (App Router)](https://nextjs.org/) |
| **Core Library** | [React 19](https://react.dev/) |
| **Language** | [TypeScript 5](https://www.typescriptlang.org/) |
| **Styling & UI** | [Tailwind CSS v4](https://tailwindcss.com/), [Framer Motion](https://www.framer.com/motion/), [AOS (Animate on Scroll)](https://michalsnik.github.io/aos/) |
| **Icons & Media** | [Lucide React](https://lucide.dev/), [React Icons](https://react-icons.github.io/react-icons/), [Lottie React](https://github.com/Gamote/lottie-react) |
| **State & Forms** | [React Hook Form](https://react-hook-form.com/), [Zod](https://zod.dev/) |
| **Realtime WebSockets** | [Socket.io Client](https://socket.io/docs/v4/client-api/) |
| **Authentication** | [Better Auth](https://better-auth.com/), JWT, Google OAuth |
| **Payments** | [Stripe](https://stripe.com/) |
| **Maps & Geolocation** | [Leaflet](https://leafletjs.com/), [React Leaflet](https://react-leaflet.js.org/) (OpenStreetMap) |
| **Document Export** | [jsPDF](https://github.com/parallax/jsPDF), [jsPDF-AutoTable](https://github.com/simonbengtsson/jsPDF-AutoTable), [html2pdf.js](https://github.com/eKoopmans/html2pdf.js) |
| **Notifications** | [React Toastify](https://fkhadra.github.io/react-toastify/) |

---

## 📂 Project Architecture

```
food_flow-client/
├── public/                 # Static assets, logos, placeholder images
├── src/
│   ├── app/                # Next.js App Router
│   │   ├── (auth)/         # Login, Register, Forgot Password
│   │   ├── about/          # About Us & Company details
│   │   ├── ai/             # AI Food Studio & AI Assistant interface
│   │   ├── api/            # Route Handlers & Next Auth endpoints
│   │   ├── checkout/       # Checkout & Stripe payment flow
│   │   ├── contact/        # Contact us form & support
│   │   ├── dashboard/      # Role-based dashboards
│   │   │   ├── admin/      # Super Admin portal
│   │   │   ├── customer/   # Customer orders, profile & addresses
│   │   │   ├── restaurant/ # Restaurant menu, orders & stats
│   │   │   └── rider/      # Rider delivery portal
│   │   ├── dishes/         # All dishes catalog & filter page
│   │   ├── order-success/  # Post-order confirmation & invoice
│   │   ├── order-tracking/ # Real-time GPS map tracking
│   │   ├── restaurants/    # Restaurant exploration & detail pages
│   │   ├── layout.tsx      # Root layout & providers
│   │   ├── page.tsx        # Homepage (Hero, Categories, Promos, Top Dishes)
│   │   └── globals.css     # Global CSS & Tailwind utilities
│   ├── components/         # Reusable UI component ecosystem
│   │   ├── banner/         # Promo sliders & hero sections
│   │   ├── cart/           # Cart sidebar, quantity counters
│   │   ├── categories/     # Category pills & sliders
│   │   ├── common/         # Navbar, Footer, Modal, Buttons
│   │   ├── dashboard/      # Sidebar, KPI cards, table components
│   │   ├── notifications/  # Real-time incoming order sound/modals
│   │   ├── restaurants/    # Restaurant cards & menus
│   │   └── tracking/       # Leaflet live delivery map
│   ├── contexts/           # React Contexts (Auth, Cart, Socket)
│   ├── data/               # Mock data & static configurations
│   ├── lib/                # Utilities, API Axios clients, Better Auth config
│   └── types/              # TypeScript interface & type definitions
├── .env.example            # Environment template
├── next.config.ts          # Next.js configurations
├── tailwind.config.ts      # Tailwind CSS v4 styling rules
├── tsconfig.json           # TypeScript configuration
└── package.json            # Client dependencies & scripts
```

---

## 🚀 Quickstart & Setup Guide

### Prerequisites
- **Node.js** `v18.x` or higher
- **npm**, **yarn**, or **pnpm**
- Running instance of **[Food Flow Backend Server](https://github.com/khalid66527/food_flow-server.git)**

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/khalid66527/food_flow-client.git
   cd food_flow-client
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

### Environment Variables

Create a `.env.local` file in the root directory and configure the required environment variables:

```env
# Server & API Endpoints
NEXT_PUBLIC_SERVER_API_URL=http://localhost:5000

# Better Auth & JWT
BETTER_AUTH_SECRET=your_super_secret_better_auth_key
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3000
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d

# Google OAuth (Optional for Social Login)
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Image Upload (ImgBB)
NEXT_PUBLIC_IMGBB_API_KEY=your_imgbb_api_key

# Stripe Payment
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key

# SMTP / Email Configuration
EMAIL_FROM="Food Flow Support <support@foodflow.app>"
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_gmail_app_password

# AI Integrations (Gemini & AgentRouter)
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-3.1-flash-lite-image
AGENTROUTER_API_KEY=your_agentrouter_api_key
AGENTROUTER_BASE_URL=https://agentrouter.ai/v1
AGENTROUTER_MODEL=deepseek-v4-flash
```

### Running the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

---

## 🧪 Scripts

| Command | Action |
| :--- | :--- |
| `npm run dev` | Starts the development server on `http://localhost:3000` |
| `npm run build` | Builds the optimized production build |
| `npm run start` | Runs the compiled Next.js production build |
| `npm run lint` | Runs ESLint to identify code issues |

---

## 🌐 Deployment

The client application is ready for seamless zero-config deployment on **[Vercel](https://vercel.com/)**:

1. Connect your GitHub repository to Vercel.
2. Set Environment Variables in your Vercel Project Settings.
3. Deploy!

Live URL: **[https://fooddeliveryplatform.vercel.app](https://fooddeliveryplatform.vercel.app)**

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!
Feel free to check the [issues page](https://github.com/khalid66527/food_flow-client/issues).

---

## 📄 License

This project is licensed under the [ISC License](LICENSE).

<div align="center">
  <sub>Built with ❤️ by <b>Khalid</b> & the Food Flow Engineering Team</sub>
</div>
