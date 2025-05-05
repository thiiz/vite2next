import chalk from 'chalk';
import fs from 'fs-extra';
import * as glob from 'glob';
import path from 'path';
import { logger } from './logger.js';

export async function migrateReactRouter(targetDir, projectSetup) {
  logger.startStep('Setting up React Router compatibility');

  // Skip if not using React Router
  if (!projectSetup.usesReactRouter) {
    logger.warning('No React Router dependencies found, skipping migration');
    logger.stepComplete();
    return true;
  }

  logger.detail('Searching for route definitions...');

  // Look for common React Router setup files
  const routerFiles = await glob.glob('**/{routes,router,Router,Routes,App}.{jsx,tsx,js,ts}', {
    cwd: targetDir,
    ignore: ['node_modules/**', '.git/**', 'dist/**', '.next/**', 'app/**']
  });

  if (routerFiles.length === 0) {
    logger.warning('Could not find React Router configuration files');
    logger.detail('You will need to manually set up route mapping');
    logger.stepComplete();
    return true;
  }

  // Create middleware.js in the app directory to handle React Router URL patterns
  logger.detail('Creating Next.js middleware for route compatibility...');
  
  const extension = projectSetup.usesTypeScript ? 'ts' : 'js';
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
  logger.success(`Created middleware.${extension} for route handling`);

  // Create a client file to explain how to use the router compatibility
  const docsDir = path.join(targetDir, 'docs');
  await fs.ensureDir(docsDir);

  const migrationGuidePath = path.join(docsDir, 'react-router-migration.md');
  const migrationGuideContent = `# React Router to Next.js Migration Guide

This project has been migrated from Vite to Next.js, and we've detected React Router usage.
Here's how to gradually migrate from React Router to Next.js routing:

## Option: Migrate to Next.js App Router

The recommended approach is to refactor your code to use Next.js App Router:

1. Create page components in the \`app\` directory following the Next.js file-based routing pattern
2. Replace \`useNavigate()\` with \`router.push()\` from \`next/navigation\`
3. Replace \`useLocation()\` with \`usePathname()\` and \`useSearchParams()\` from \`next/navigation\`
4. Replace \`<Link>\` components with Next.js's \`<Link>\` from \`next/link\`

## Migration steps:

1. Identify all files using React Router hooks and components
2. Replace them one by one with Next.js equivalents
3. Convert route definitions to Next.js's file-based routing system

For more detailed information, see the [Next.js migration guide](https://nextjs.org/docs/app/building-your-application/upgrading/from-react-router).
`;

  await fs.writeFile(migrationGuidePath, migrationGuideContent);
  logger.success('Created react-router-migration.md guide');

  logger.stepComplete();
  return true;
} 