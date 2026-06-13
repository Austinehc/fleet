# 🚀 Vercel Deployment Checklist

## Pre-Deployment Setup

### 1. ✅ GitHub Repository
- [ ] Code pushed to GitHub
- [ ] Repository is public or Vercel has access
- [ ] All sensitive credentials removed from code

### 2. ✅ Supabase Setup (REQUIRED)
- [ ] Create Supabase project
- [ ] Run the SQL schema from `src/supabase-schema.sql`
- [ ] **CRITICAL**: Set up Row Level Security policies
- [ ] Get your project URL and anon key
- [ ] Test database connection locally

### 3. ✅ Cloudinary Setup (Optional)
- [ ] Create Cloudinary account
- [ ] Create upload preset
- [ ] Get cloud name and preset name

## Vercel Deployment Steps

### Step 1: Create Driver Portal Project

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository
4. Configure:
   - **Project Name**: `fleet-driver-portal`
   - **Framework**: Vite
   - **Build Command**: `npm run build:driver`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

### Step 2: Set Driver Portal Environment Variables

Add these in Vercel project settings → Environment Variables:

```
VITE_APP_ROLE = driver
VITE_SUPABASE_URL = https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY = your_anon_key_here
VITE_CLOUDINARY_CLOUD_NAME = your_cloud_name (optional)
VITE_CLOUDINARY_UPLOAD_PRESET = your_preset (optional)
```

### Step 3: Create Manager Portal Project

1. Create another new project from the same GitHub repo
2. Configure:
   - **Project Name**: `fleet-manager-portal`  
   - **Framework**: Vite
   - **Build Command**: `npm run build:manager`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

### Step 4: Set Manager Portal Environment Variables

Add the same environment variables as driver portal, but change:

```
VITE_APP_ROLE = manager
```

### Step 5: Deploy Both Projects

- [ ] Driver portal deploys successfully
- [ ] Manager portal deploys successfully
- [ ] Both URLs are accessible
- [ ] Test role-specific functionality

## Post-Deployment Testing

### Driver Portal Testing
- [ ] Can access driver login page
- [ ] Driver authentication works (even if insecure)
- [ ] Can view assigned vehicle
- [ ] Can log activities
- [ ] Database writes work

### Manager Portal Testing  
- [ ] Can access manager interface
- [ ] Can view fleet dashboard
- [ ] Can add/edit vehicles
- [ ] Can manage drivers
- [ ] Financial reports load
- [ ] Database reads/writes work

### Cross-Platform Testing
- [ ] Works on desktop browsers
- [ ] Works on mobile devices
- [ ] Responsive design functions properly
- [ ] No console errors in browser

## Security Hardening (URGENT)

**⚠️ BEFORE GOING LIVE:**

### Database Security
- [ ] Implement Supabase RLS policies
- [ ] Remove anonymous access where possible
- [ ] Add proper user authentication
- [ ] Test that users can only access their own data

### Application Security  
- [ ] Add input validation
- [ ] Sanitize all user inputs
- [ ] Implement proper session management
- [ ] Add CSRF protection
- [ ] Set up proper error handling

### Infrastructure Security
- [ ] Set up monitoring/logging
- [ ] Configure proper CORS settings
- [ ] Add rate limiting
- [ ] Set up SSL certificates (Vercel handles this)

## Production URLs

After successful deployment, update these:

- **Driver Portal**: `https://fleet-driver-portal.vercel.app`
- **Manager Portal**: `https://fleet-manager-portal.vercel.app`

## Custom Domains (Optional)

If you have custom domains:
- [ ] Configure DNS settings
- [ ] Add domains in Vercel
- [ ] Test SSL certificates
- [ ] Update any hardcoded URLs

## Monitoring & Maintenance

- [ ] Set up Vercel Analytics
- [ ] Configure error tracking (Sentry recommended)
- [ ] Set up uptime monitoring
- [ ] Create backup procedures
- [ ] Document admin procedures

## Support Contacts

- **Vercel Support**: Vercel dashboard help
- **Supabase Support**: Supabase dashboard support
- **Technical Issues**: Check browser console and Vercel logs

---

## ⚠️ CRITICAL SECURITY WARNING

This application currently has:
- **Open database access** (no RLS policies)
- **Insecure authentication** (plain text PINs)
- **No input validation**

**DO NOT use in production without addressing these security issues first!**

See `DEPLOYMENT.md` for detailed security requirements.