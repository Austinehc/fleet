# Fleet Management System - Vercel Deployment Guide

## Overview
This project deploys as two separate applications on Vercel:
- **Driver Portal**: For drivers to log activities and view assignments
- **Manager Portal**: For fleet managers to oversee operations

## ⚠️ Security Warning
**CRITICAL**: Before deploying to production, you MUST:
1. Set up proper Supabase Row Level Security policies
2. Configure environment variables in Vercel (not in code)
3. Remove any hardcoded credentials

## Deployment Steps

### 1. Push to GitHub
Make sure your code is pushed to a GitHub repository.

### 2. Create Vercel Projects

#### For Driver Portal:
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository
4. Configure project:
   - **Project Name**: `fleet-driver-portal`
   - **Framework Preset**: Vite
   - **Root Directory**: `./` (keep default)
   - **Build Command**: `npm run build:driver`
   - **Output Directory**: `dist`

#### For Manager Portal:
1. Create another new project from the same repository
2. Configure project:
   - **Project Name**: `fleet-manager-portal`
   - **Framework Preset**: Vite
   - **Root Directory**: `./` (keep default)
   - **Build Command**: `npm run build:manager`
   - **Output Directory**: `dist`

### 3. Environment Variables Setup

For **BOTH** projects, add these environment variables in Vercel:

```env
# Required for role separation
VITE_APP_ROLE=driver    # Use "driver" for driver portal, "manager" for manager portal

# Supabase Configuration (DO NOT use the example values)
VITE_SUPABASE_URL=https://your-actual-supabase-url.supabase.co
VITE_SUPABASE_ANON_KEY=your-actual-supabase-anon-key

# Cloudinary Configuration (optional, for image uploads)
VITE_CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
VITE_CLOUDINARY_UPLOAD_PRESET=your-upload-preset

# Optional: Gemini AI (if using AI features)
GEMINI_API_KEY=your-gemini-api-key
```

### 4. Deploy

Both projects will auto-deploy when you:
1. Push changes to your main branch
2. Manually trigger deployment in Vercel dashboard

## Project URLs Structure

After deployment, you'll have:
- **Driver Portal**: `https://fleet-driver-portal.vercel.app`
- **Manager Portal**: `https://fleet-manager-portal.vercel.app`

## Custom Domains (Optional)

You can configure custom domains in Vercel:
- Driver Portal: `drivers.yourcompany.com`
- Manager Portal: `fleet.yourcompany.com`

## Configuration Files

- `vercel-driver.json`: Configuration for driver portal
- `vercel-manager.json`: Configuration for manager portal

## Build Commands

- `npm run build:driver`: Builds driver-only version
- `npm run build:manager`: Builds manager-only version
- `npm run build`: Builds default version (both roles available)

## Environment-Specific Builds

The build process uses `VITE_APP_ROLE` to:
1. Lock the UI to specific role
2. Hide unnecessary navigation
3. Optimize bundle size for each deployment

## Security Checklist

Before going live:

- [ ] Remove hardcoded credentials from `.env.example`
- [ ] Set up Supabase RLS policies
- [ ] Configure proper authentication
- [ ] Add input validation
- [ ] Set up monitoring and logging
- [ ] Test both deployments thoroughly

## Monitoring

Both deployments include:
- Automatic HTTPS
- Edge caching
- Performance monitoring via Vercel Analytics

## Troubleshooting

### Build Failures
- Check environment variables are set correctly
- Verify `VITE_APP_ROLE` is set to `driver` or `manager`
- Check build logs in Vercel dashboard

### Runtime Issues
- Verify Supabase configuration
- Check browser console for errors
- Ensure all environment variables are available at build time

## Support

For deployment issues:
1. Check Vercel build logs
2. Verify environment variable configuration
3. Test builds locally with `npm run build:driver` and `npm run build:manager`