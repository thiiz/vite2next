import chalk from 'chalk';
import fs from 'fs-extra';
import * as glob from 'glob';
import path from 'path';

export async function createEntrypoint(targetDir, projectSetup) {
    console.log(chalk.blue('Step 6: Creating entrypoint page...'));

    // Create src/app directory if it doesn't exist
    const srcDir = path.join(targetDir, 'src');
    await fs.ensureDir(srcDir);

    // Use custom app directory if specified, otherwise default to src/app
    const appDir = projectSetup.customAppDir
        ? path.join(targetDir, projectSetup.customAppDir)
        : path.join(srcDir, 'app');

    await fs.ensureDir(appDir);

    const usesTypeScript = projectSetup.usesTypeScript;
    const extension = usesTypeScript ? 'tsx' : 'jsx';

    // Default to catchall route approach for SPA style with React Router
    if (projectSetup.usesReactRouter) {
        console.log(chalk.yellow('i React Router detected - using catchall route approach for compatibility'));
        await createCatchAllPage(targetDir, appDir, extension);
    } else {
        // Check if files already exist
        const pageFile = path.join(appDir, `page.${extension}`);
        const layoutFile = path.join(appDir, `layout.${extension}`);

        if (fs.existsSync(pageFile)) {
            console.log(chalk.yellow('i Root page file already exists, skipping creation'));
            return true;
        }

        // Look for main React component file (App.jsx, App.tsx, etc.)
        let appComponentPath = await findAppComponent(targetDir);

        if (appComponentPath) {
            console.log(chalk.gray(`Found App component: ${appComponentPath}`));
            await createDirectPage(targetDir, appDir, extension, appComponentPath);
        } else {
            console.log(chalk.yellow('! Could not find App component, creating fallback page'));
            await createFallbackPage(targetDir, appDir, extension);
        }
    }

    console.log(chalk.green('✓ Step 6 completed'));
    return true;
}

async function findAppComponent(targetDir) {
    const appFilePatterns = ['App.jsx', 'App.tsx', 'App.js', 'App.tsx', 'app.jsx', 'app.tsx', 'app.js', 'app.ts'];

    for (const pattern of appFilePatterns) {
        const files = await glob.glob(`**/${pattern}`, {
            cwd: targetDir,
            ignore: ['node_modules/**', '.git/**', 'dist/**', '.next/**', 'app/**']
        });

        if (files.length > 0) {
            return files[0];
        }
    }

    // Try to check main.js/ts for the app component import
    const mainFilePatterns = ['main.jsx', 'main.tsx', 'main.js', 'main.ts', 'index.jsx', 'index.tsx', 'index.js', 'index.ts'];

    for (const pattern of mainFilePatterns) {
        const files = await glob.glob(`**/${pattern}`, {
            cwd: targetDir,
            ignore: ['node_modules/**', '.git/**', 'dist/**', '.next/**', 'app/**']
        });

        if (files.length > 0) {
            // Read the main file to find App import
            const mainFilePath = path.join(targetDir, files[0]);
            try {
                const content = await fs.readFile(mainFilePath, 'utf8');

                // Look for import of App component
                const importMatch = content.match(/import\s+(\w+)\s+from\s+['"](.+App)['"];?/);
                if (importMatch) {
                    const appPath = importMatch[2];

                    // Convert relative path to absolute
                    let appFullPath = appPath;
                    if (appPath.startsWith('./') || appPath.startsWith('../')) {
                        appFullPath = path.join(path.dirname(mainFilePath), appPath);
                        // Make it relative to targetDir
                        appFullPath = path.relative(targetDir, appFullPath);
                    }

                    return appFullPath;
                }
            } catch (error) {
                console.error(chalk.yellow(`Error reading main file: ${error.message}`));
            }
        }
    }

    return null;
}

async function findGlobalCss(targetDir) {
    let cssFiles = await glob.glob('**/*.css', {
        cwd: targetDir,
        ignore: ['node_modules/**', '.git/**', 'dist/**', '.next/**', 'app/**']
    });

    // Look for common global CSS files
    const globalCssFiles = cssFiles.filter(file => {
        const filename = path.basename(file).toLowerCase();
        return filename === 'index.css' ||
            filename === 'global.css' ||
            filename === 'globals.css' ||
            filename === 'app.css' ||
            filename === 'style.css' ||
            filename === 'styles.css';
    });

    if (globalCssFiles.length > 0) {
        return globalCssFiles[0];
    }

    return null;
}

async function createCatchAllPage(targetDir, appDir, extension) {
    // Create app/[[...slug]] directory for catch-all routes
    const slugDir = path.join(appDir, '[[...slug]]');
    await fs.ensureDir(slugDir);

    // Check if files already exist
    const pageFile = path.join(slugDir, `page.${extension}`);
    const clientFile = path.join(slugDir, `client.${extension}`);

    if (fs.existsSync(pageFile) && fs.existsSync(clientFile)) {
        console.log(chalk.yellow('i Catch-all route files already exist, skipping creation'));
        return;
    }

    // Find the app component
    let appPath = await findAppComponent(targetDir);
    if (!appPath) {
        console.log(chalk.yellow('! Could not find App component file, you may need to adjust the import path manually'));
        appPath = 'App';
    } else {
        // Log the found path before processing
        console.log(chalk.gray(`Original App component path: ${appPath}`));

        // Normalize backslashes to forward slashes
        appPath = appPath.replace(/\\/g, '/');

        // Remove file extension
        const pathWithoutExt = appPath.replace(/\.[jt]sx?$/, '');

        // For paths starting with src/, we need to remove the src/ prefix
        if (pathWithoutExt === 'src/App' || pathWithoutExt === 'src/app' || pathWithoutExt.startsWith('src/App/') || pathWithoutExt.startsWith('src/app/')) {
            // Remove 'src/' prefix and add '../../' to go up from app/[[...slug]]/ to project root
            appPath = '../../' + pathWithoutExt.substring(4);
        } else if (pathWithoutExt.startsWith('src/')) {
            // For other files in src directory
            appPath = '../../' + pathWithoutExt.substring(4);
        } else {
            // For paths not in src directory, still need to go up from app/[[...slug]]/ to project root
            appPath = '../../' + pathWithoutExt;
        }

        // Log the final import path for debugging
        console.log(chalk.gray(`Import path for App component: ${appPath}`));
    }

    // Create client.tsx/jsx
    const clientContent = `'use client'

import React from 'react'
import dynamic from 'next/dynamic'

const App = dynamic(() => import('${appPath}'), { ssr: false })

export function ClientOnly() {
  return <App />
}`;

    await fs.writeFile(clientFile, clientContent);
    console.log(chalk.green(`√ Created src/app/[[...slug]]/client.${extension}`));

    // Check for files in the src/pages directory
    const pagesDir = path.join(targetDir, 'src', 'pages');
    let slugs = [{ slug: [''] }]; // Default slug

    if (fs.existsSync(pagesDir)) {
        try {
            const pageFiles = await fs.readdir(pagesDir);
            const pageRoutes = pageFiles
                .filter(file => /\.(jsx|tsx|js|ts)$/.test(file) && !file.startsWith('_') && file !== 'index.tsx' && file !== 'index.jsx' && file !== 'index.js' && file !== 'index.ts')
                .map(file => {
                    // Remove extension and convert to lowercase
                    const pageName = path.basename(file, path.extname(file)).toLowerCase();
                    return { slug: [pageName] };
                });

            if (pageRoutes.length > 0) {
                // Add the default route too
                slugs = [...pageRoutes, { slug: [''] }];
                console.log(chalk.gray(`Found page routes: ${JSON.stringify(pageRoutes)}`));
            }
        } catch (error) {
            console.error(chalk.yellow(`Error reading pages directory: ${error.message}`));
        }
    }

    // Create page.tsx/jsx with dynamic slugs from pages directory
    const pageContent = `import { ClientOnly } from './client'

export function generateStaticParams() {
  return ${JSON.stringify(slugs, null, 2)}
}

export default function Page() {
  return <ClientOnly />
}`;

    await fs.writeFile(pageFile, pageContent);
    console.log(chalk.green(`√ Created src/app/[[...slug]]/page.${extension}`));
}

async function createDirectPage(targetDir, appDir, extension, appComponentPath) {
    // Create a direct page.tsx/jsx for simpler apps
    const pageFile = path.join(appDir, `page.${extension}`);

    // Log the component path before processing
    console.log(chalk.gray(`Original App component path: ${appComponentPath}`));

    // Normalize backslashes to forward slashes
    appComponentPath = appComponentPath.replace(/\\/g, '/');

    // Convert to import path relative to app directory
    let appImportPath;
    const pathWithoutExt = appComponentPath.replace(/\.[jt]sx?$/, '');

    // For paths starting with src/, we need to remove the src/ prefix
    if (pathWithoutExt === 'src/App' || pathWithoutExt === 'src/app' || pathWithoutExt.startsWith('src/App/') || pathWithoutExt.startsWith('src/app/')) {
        // Remove 'src/' prefix and add '../' to go up from app/ to project root
        appImportPath = '../' + pathWithoutExt.substring(4);
    } else if (pathWithoutExt.startsWith('src/')) {
        // For other files in src directory
        appImportPath = '../' + pathWithoutExt.substring(4);
    } else {
        // For paths not in src directory, still need to go up from app/ to project root
        appImportPath = '../' + pathWithoutExt;
    }

    // Log the final import path for debugging
    console.log(chalk.gray(`Import path for App component: ${appImportPath}`));

    // Create page content
    const pageContent = `'use client'

import dynamic from 'next/dynamic'

const App = dynamic(() => import('${appImportPath}'), { ssr: false })

export default function Home() {
  return <App />
}`;

    await fs.writeFile(pageFile, pageContent);
    console.log(chalk.green(`√ Created src/app/page.${extension}`));
}

async function createFallbackPage(targetDir, appDir, extension) {
    // Create a fallback page when no App component is found
    const pageFile = path.join(appDir, `page.${extension}`);

    // Create a simple fallback page
    const pageContent = `'use client'

export default function Home() {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      textAlign: 'center',
      padding: '0 1rem'
    }}>
      <h1>Vite to Next.js Migration Complete</h1>
      <p>
        This is a fallback page. Your app components were not automatically detected.
      </p>
      <p>
        To continue, create your pages in the <code>app</code> directory following the
        <a href="https://nextjs.org/docs/app/building-your-application/routing" 
           style={{ marginLeft: '0.5rem' }}>
          Next.js App Router documentation
        </a>.
      </p>
    </div>
  )
}`;

    await fs.writeFile(pageFile, pageContent);
    console.log(chalk.green(`√ Created fallback src/app/page.${extension}`));
}