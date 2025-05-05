# Migrating from Vite to Next.js

This guide will help you migrate an existing Vite application to Next.js effectively and with minimal disruption.

## Why Switch to Next.js?

### Performance Benefits
- **Faster Initial Loading**: Next.js offers server-side rendering and static site generation, reducing initial load times compared to Vite's client-side only approach
- **Automatic Code Splitting**: Next.js intelligently splits your code without manual configuration
- **Eliminates Network Waterfalls**: Server Components can fetch data on the server, preventing sequential client-server requests

### Enhanced Developer Experience
- **Flexible Data Fetching**: Choose between client-side, server-side, or build-time data fetching based on your needs
- **Streaming and Suspense**: Create intentional loading states and prioritize UI rendering
- **Middleware Support**: Run code on the server before requests complete for authentication, internationalization, and more

### Built-in Optimizations
- **Image Optimization**: Automatic image optimization with the Image component
- **Font Optimization**: Improved loading performance with next/font
- **Script Optimization**: Better third-party script management

## Migration Steps

Our approach is to get a working Next.js application as quickly as possible, then adopt advanced features incrementally. We'll start by creating a client-side SPA without migrating your router.

### Step 1: Install Next.js

```bash
npm install next@latest
```

### Step 2: Create Next.js Configuration

Create `next.config.mjs` at your project root:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // Outputs a Single-Page Application (SPA)
  distDir: './dist', // Changes the build output directory to `./dist/`
}

export default nextConfig
```

### Step 3: Update TypeScript Configuration

If using TypeScript, update your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "preserve",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "allowJs": true,
    "forceConsistentCasingInFileNames": true,
    "incremental": true,
    "plugins": [{ "name": "next" }]
  },
  "include": ["./src", "./dist/types/**/*.ts", "./next-env.d.ts"],
  "exclude": ["./node_modules"]
}
```

Key changes:
- Added Next.js plugin
- Set `jsx: "preserve"` and `esModuleInterop: true`
- Added path patterns to the include array

### Step 4: Create the Root Layout

Create `app/layout.jsx` or `app/layout.tsx`:

```jsx
import { Metadata } from 'next'

export const metadata = {
  title: 'My Application',
  description: 'My application description',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div id="root">{children}</div>
      </body>
    </html>
  )
}
```

This replaces your `index.html` file, with the metadata API handling your document head elements.

### Step 5: Create the Entrypoint Page

First, locate your main App component. This is typically `src/App.jsx` or `src/App.tsx` in a Vite project.

Then create a catch-all route to handle all paths by creating these files:

1. `app/[[...slug]]/page.jsx` or `app/[[...slug]]/page.tsx`:

```jsx
import '../../src/index.css' // Adjust the path to your global CSS file
import { ClientOnly } from './client'

export function generateStaticParams() {
  return [{ slug: [''] }]
}

export default function Page() {
  return <ClientOnly />
}
```

2. `app/[[...slug]]/client.jsx` or `app/[[...slug]]/client.tsx`:

```jsx
'use client'

import React from 'react'
import dynamic from 'next/dynamic'

// Make sure this path points to your actual App component location
const App = dynamic(() => import('../../src/App'), { ssr: false })

export function ClientOnly() {
  return <App />
}
```

Important notes:
- The path to your App component must be correct and relative to the client file
- Check your project structure to ensure the import path is accurate (e.g., `../../src/App` if your App is in the src directory)
- The `ssr: false` option ensures your app remains client-only during the initial migration

If you get a "Can't resolve" error, double-check:
1. The exact location of your App component file
2. The correct casing of the filename (App.jsx vs app.jsx)
3. The file extension is included in the import path

### Step 6: Converting App.css to Tailwind CSS (Optional)

Next.js works well with Tailwind CSS, which is a utility-first CSS framework. If you have an App.css file in your Vite project, you can convert those styles to inline Tailwind CSS classes:

1. Install Tailwind CSS in your Next.js project:

```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

2. Configure your tailwind.config.js:

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

3. Add Tailwind directives to your globals.css:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

4. Run our built-in App.css to Tailwind CSS converter:

```bash
vite2next --tailwind
```

This will:
- Find your App.css file
- Convert CSS rules to equivalent Tailwind CSS classes using the css-to-tailwindcss package
- Update components using these CSS classes with inline Tailwind classes
- Create a backup of your App.css file
- Remove the original App.css file

The conversion uses the [css-to-tailwindcss](https://www.npmjs.com/package/css-to-tailwindcss) package which offers comprehensive conversion capabilities for most CSS properties, respecting your Tailwind configuration.

5. Manually review the converted components to ensure the styling is preserved correctly.

### Step 7: Update Static Image Imports

Next.js handles image imports differently:

```jsx
// Before (Vite)
import logo from './logo.png'
<img src={logo} />

// After (Next.js)
import logo from '../public/logo.png'
<img src={logo.src} />
```

You can later optimize images using Next.js's `<Image>` component.

### Step 8: Migrate Environment Variables

- Change all `VITE_` prefixes to `NEXT_PUBLIC_`
- Update environment references:

```javascript
// Before (Vite)
import.meta.env.MODE
import.meta.env.PROD
import.meta.env.DEV
import.meta.env.SSR

// After (Next.js)
process.env.NODE_ENV
process.env.NODE_ENV === 'production'
process.env.NODE_ENV !== 'production'
typeof window !== 'undefined'
```

For base URL support:
1. Add `NEXT_PUBLIC_BASE_PATH="/your-path"` to `.env`
2. Configure in `next.config.mjs`:

```javascript
const nextConfig = {
  // other options...
  basePath: process.env.NEXT_PUBLIC_BASE_PATH,
}
```

### Step 9: Update Scripts

In `package.json`:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  }
}
```

Add to `.gitignore`:
```
.next
next-env.d.ts
dist
```

### Step 10: Clean Up Vite Files

After your Next.js app is working properly, you should clean up Vite-specific files:

Remove:
- `main.tsx` or `main.jsx` (entry point for Vite)
- `index.html` (main HTML template for Vite)
- `vite-env.d.ts` (Vite's TypeScript declarations)
- `tsconfig.node.json` (Vite's TypeScript config)
- `vite.config.ts` or `vite.config.js` (Vite configuration)

Uninstall Vite dependencies:
```bash
npm uninstall vite @vitejs/plugin-react
```

### Step 11: Complete App Router Migration

Once your app is running successfully with the catch-all route, you can fully migrate to the Next.js App Router structure. Next.js 13+ uses the App Router (app directory) instead of the Pages Router (pages directory).

#### Moving Component Files

1. Move core components from `src/components` to `app/components` or keep them in `src/components` if you prefer

2. Move your styles:
   - Move `src/index.css` to `app/globals.css` and import it in your root layout
   - Move component-specific CSS files along with their components

3. Replace the App component:
   - Instead of keeping `src/App.tsx` or `src/App.jsx`, gradually move its content into App Router components
   - For each route in your application, create a corresponding directory in the app folder

#### Example App Router Structure

```
app/
├── components/         # Shared components
├── lib/                # Utility functions, shared hooks
├── about/              # /about route
│   └── page.tsx        # Page component for /about
├── contact/            # /contact route
│   └── page.tsx        # Page component for /contact
├── blog/               # /blog route
│   ├── [slug]/         # Dynamic route for blog posts
│   │   └── page.tsx    # Page component for /blog/[slug]
│   └── page.tsx        # Page component for /blog
├── globals.css         # Global styles (moved from src/index.css)
└── layout.tsx          # Root layout
```

#### Converting React Router Routes

If you were using React Router, map each route to a directory in the App Router structure:

| React Router Path      | Next.js App Router Equivalent      |
|------------------------|-----------------------------------|
| /                      | app/page.tsx                      |
| /about                 | app/about/page.tsx                |
| /products              | app/products/page.tsx             |
| /products/:id          | app/products/[id]/page.tsx        |
| /blog/:slug/:comment   | app/blog/[slug]/[comment]/page.tsx|

## Next Steps

Now that you have a functioning Next.js application, you can incrementally adopt more features:

1. **Leverage Server Components**
   - Move data fetching to the server
   - Implement streaming for better UX

2. **Optimize Assets**
   - Replace `<img>` with `<Image>` for automatic optimization
   - Use `next/font` for font optimization
   - Implement `<Script>` for third-party script loading

3. **Implement API Routes**
   - Create backend endpoints in the `app/api` directory
   - Use Route Handlers with HTTP methods

4. **Configure ESLint**
   - Install `eslint-config-next` for Next.js-specific rules

5. **Implement Advanced Features**
   - Server Actions for form handling
   - Middleware for authentication and redirects
   - Parallel and Intercepted Routes

By gradually implementing these changes, you'll unlock the full power of Next.js while maintaining a stable application. 