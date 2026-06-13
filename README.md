# Fleet Management System

A modern React-based fleet management application with separate Driver and Manager portals.

## 🚀 Live Deployments

- **Driver Portal**: `[Add your driver portal URL here]`
- **Manager Portal**: `[Add your manager portal URL here]`

## 🏗️ Architecture

This system provides:
- **Driver Portal**: Vehicle assignments, activity logging, earnings tracking
- **Manager Portal**: Fleet oversight, staff management, financial reporting
- **Real-time sync**: With Supabase backend
- **Role-based access**: Separate deployments for security

## 🛠️ Local Development

**Prerequisites:** Node.js 18+

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Environment setup:**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your actual credentials
   ```

3. **Run development server:**
   ```bash
   # Run with both manager and driver access
   npm run dev
   
   # Run driver-only version
   VITE_APP_ROLE=driver npm run dev
   
   # Run manager-only version  
   VITE_APP_ROLE=manager npm run dev
   ```

## 🚢 Deployment

This project deploys as two separate Vercel applications. See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.

### Quick Deploy Steps:

1. **Push to GitHub**
2. **Create two Vercel projects:**
   - Driver Portal: `npm run build:driver`
   - Manager Portal: `npm run build:manager`
3. **Set environment variables in Vercel**
4. **Deploy**

### Build Commands:
```bash
npm run build:driver    # Driver-only build
npm run build:manager   # Manager-only build  
npm run build          # Development build (both roles)
```

## ⚠️ Security Notice

**IMPORTANT**: This system requires proper security configuration before production use:

- Set up Supabase Row Level Security policies
- Configure proper authentication  
- Remove hardcoded credentials
- Add input validation

See the full security checklist in [DEPLOYMENT.md](./DEPLOYMENT.md).

## 🗃️ Database Setup

Run the SQL schema in your Supabase project:

```sql
-- See src/supabase-schema.sql for the complete schema
```

## 🔧 Technology Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Deployment**: Vercel
- **Images**: Cloudinary
- **Charts**: Recharts

## 📁 Project Structure

```
src/
├── driver/          # Driver portal components
├── manager/         # Manager portal components  
├── lib/             # External service integrations
├── components/      # Shared components
└── types.ts         # TypeScript definitions
```

## 🎯 Key Features

- **Vehicle Management**: Add, edit, track vehicle status and assignments
- **Driver Management**: Profile management, access codes, performance tracking  
- **Financial Tracking**: Revenue logging, expense tracking, approval workflows
- **Real-time Updates**: Live data synchronization across all users
- **Photo Management**: Vehicle documentation with Cloudinary integration
- **Role-based UI**: Optimized interfaces for drivers vs managers

## 📱 Mobile Support

Both portals are mobile-responsive and work well on tablets and smartphones.

## 🔗 Links

- **AI Studio**: https://ai.studio/apps/cbd493c7-6dc5-41f9-93e7-177e063364e4
- **Deployment Guide**: [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Security Guide**: See DEPLOYMENT.md security checklist
