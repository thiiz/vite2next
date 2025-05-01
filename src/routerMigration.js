import chalk from 'chalk';
import fs from 'fs-extra';
import * as glob from 'glob';
import path from 'path';

export async function migrateReactRouter(targetDir) {
    console.log(chalk.blue('Step 10: Setting up React Router compatibility...'));

    // Check if the project is using React Router
    const packageJsonPath = path.join(targetDir, 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));

    if (!packageJson.dependencies?.['react-router-dom'] && !packageJson.dependencies?.['react-router']) {
        console.log(chalk.yellow('i No React Router dependencies found, skipping migration'));
        return true;
    }

    console.log(chalk.gray('Searching for route definitions...'));

    // Look for common React Router setup files
    const routerFiles = await glob.glob('**/{routes,router,Router,Routes,App}.{jsx,tsx,js,ts}', {
        cwd: targetDir,
        ignore: ['node_modules/**', '.git/**', 'dist/**', '.next/**', 'app/**']
    });

    if (routerFiles.length === 0) {
        console.log(chalk.yellow('! Could not find React Router configuration files'));
        console.log(chalk.gray('  You will need to manually set up route mapping'));
        return true;
    }

    // Create middleware.js in the app directory to handle React Router URL patterns
    console.log(chalk.gray('Creating Next.js middleware for route compatibility...'));
    const appDir = path.join(targetDir, 'app');
    await fs.ensureDir(appDir);

    const usesTypeScript = fs.existsSync(path.join(targetDir, 'tsconfig.json'));
    const extension = usesTypeScript ? 'ts' : 'js';

    const middlewarePath = path.join(targetDir, `middleware.${extension}`);
    const middlewareContent = `import { NextResponse } from 'next/server';
 
export function middleware(request) {
  // This middleware ensures that client-side routing patterns work with Next.js
  // Add custom route handling logic here if needed
  return NextResponse.next();
}
 
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};`;

    await fs.writeFile(middlewarePath, middlewareContent);
    console.log(chalk.green(`√ Created middleware.${extension} for route handling`));

    // Create a helper for React Router compatibility
    const utilsDir = path.join(targetDir, 'app', 'utils');
    await fs.ensureDir(utilsDir);

    const routerCompatPath = path.join(utilsDir, `router-compat.${extension}`);
    const routerCompatContent = `'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { createContext, useContext, useEffect, useMemo } from 'react';

// Create a context to simulate React Router context
const RouterContext = createContext(null);

// Provider component to wrap your app
export function RouterProvider({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Build a location object similar to React Router
  const location = useMemo(() => {
    return {
      pathname,
      search: searchParams.toString() ? \`?\${searchParams.toString()}\` : '',
      hash: typeof window !== 'undefined' ? window.location.hash : '',
      state: {},
      key: Math.random().toString(36).slice(2, 8),
    };
  }, [pathname, searchParams]);
  
  // Create a history-like object
  const history = useMemo(() => {
    return {
      push: (to) => {
        if (typeof to === 'string') {
          router.push(to);
        } else {
          const url = to.pathname + (to.search || '') + (to.hash || '');
          router.push(url, { state: to.state });
        }
      },
      replace: (to) => {
        if (typeof to === 'string') {
          router.replace(to);
        } else {
          const url = to.pathname + (to.search || '') + (to.hash || '');
          router.replace(url, { state: to.state });
        }
      },
      go: (delta) => {
        if (delta === -1) router.back();
        else if (delta === 1) router.forward();
      },
      goBack: () => router.back(),
      goForward: () => router.forward(),
      location,
    };
  }, [router, location]);
  
  const contextValue = useMemo(() => {
    return {
      history,
      location,
      navigate: history.push,
    };
  }, [history, location]);
  
  return (
    <RouterContext.Provider value={contextValue}>
      {children}
    </RouterContext.Provider>
  );
}

// Hook to replace useNavigate
export function useNavigate() {
  const { navigate } = useContext(RouterContext) || {};
  return navigate || ((to) => console.warn('RouterProvider not found'));
}

// Hook to replace useLocation
export function useLocation() {
  const { location } = useContext(RouterContext) || {};
  return location || { pathname: '', search: '', hash: '' };
}

// Hook to replace useHistory
export function useHistory() {
  const { history } = useContext(RouterContext) || {};
  return history;
}

// Hook to replace useParams (basic implementation)
export function useParams() {
  // This is a simplified version, you'll need to extract params from the pathname
  return {};
}`;

    await fs.writeFile(routerCompatPath, routerCompatContent);
    console.log(chalk.green(`√ Created router-compat.${extension} to help with React Router migration`));

    // Create a client file to explain how to use the router compatibility
    const docsDir = path.join(targetDir, 'docs');
    await fs.ensureDir(docsDir);

    const migrationGuidePath = path.join(docsDir, 'react-router-migration.md');
    const migrationGuideContent = `# React Router to Next.js Migration Guide

This project has been migrated from Vite to Next.js, and we've detected React Router usage.
Here's how to gradually migrate from React Router to Next.js routing:

## Option 1: Use the compatibility layer

We've created a \`router-compat.${extension}\` utility that provides a compatibility layer:

\`\`\`jsx
// Import from the compatibility layer instead of react-router-dom
import { useNavigate, useLocation, useParams } from '@/app/utils/router-compat';

function MyComponent() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Use as you would with React Router
  return (
    <button onClick={() => navigate('/some-path')}>
      Go somewhere
    </button>
  );
}
\`\`\`

Wrap your application with the RouterProvider:

\`\`\`jsx
import { RouterProvider } from '@/app/utils/router-compat';

function AppLayout({ children }) {
  return (
    <RouterProvider>
      {children}
    </RouterProvider>
  );
}
\`\`\`

## Option 2: Migrate to Next.js App Router

The better long-term solution is to refactor your code to use Next.js App Router:

1. Create page components in the \`app\` directory following the Next.js file-based routing pattern
2. Replace \`useNavigate()\` with \`router.push()\` from \`next/navigation\`
3. Replace \`useLocation()\` with \`usePathname()\` and \`useSearchParams()\` from \`next/navigation\`
4. Replace \`<Link>\` components with Next.js's \`<Link>\` from \`next/link\`

## Migration steps:

1. Identify all files using React Router hooks and components
2. Replace them one by one with Next.js equivalents or the compatibility layer
3. Convert route definitions to Next.js's file-based routing system

For more detailed information, see the [Next.js migration guide](https://nextjs.org/docs/app/building-your-application/upgrading/from-react-router).
`;

    await fs.writeFile(migrationGuidePath, migrationGuideContent);
    console.log(chalk.green('√ Created react-router-migration.md guide'));

    console.log(chalk.green('✓ Step 10 completed'));
    return true;
} 