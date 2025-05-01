import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';

export async function migrateStaticAssets(targetDir) {
    console.log(chalk.blue('Step 11: Migrating static assets...'));

    // Create public directory if it doesn't exist
    const publicDir = path.join(targetDir, 'public');
    await fs.ensureDir(publicDir);

    // Look for common asset directories in Vite projects
    const commonAssetDirs = ['assets', 'static', 'images', 'img', 'fonts', 'icons'];
    let foundAssets = false;

    for (const dir of commonAssetDirs) {
        const assetDirPath = path.join(targetDir, dir);
        if (fs.existsSync(assetDirPath) && fs.statSync(assetDirPath).isDirectory()) {
            console.log(chalk.gray(`Found potential asset directory: ${dir}`));

            // Don't automatically move assets, just suggest it
            console.log(chalk.yellow(`! Static assets in '${dir}' directory should be moved to 'public/${dir}'`));
            console.log(chalk.gray(`  You can do this manually with: cp -r ${dir}/* public/${dir}/`));

            foundAssets = true;
        }
    }

    // Look for root level static assets (favicon.ico, robots.txt, etc)
    const commonRootAssets = ['favicon.ico', 'robots.txt', 'site.webmanifest', 'favicon.png', 'logo.svg'];

    for (const asset of commonRootAssets) {
        const assetPath = path.join(targetDir, asset);
        if (fs.existsSync(assetPath) && fs.statSync(assetPath).isFile()) {
            // Copy to public directory
            await fs.copy(assetPath, path.join(publicDir, asset));
            console.log(chalk.green(`√ Copied ${asset} to public directory`));
            foundAssets = true;
        }
    }

    // Create static asset imports helper
    const utilsDir = path.join(targetDir, 'app', 'utils');
    await fs.ensureDir(utilsDir);

    const usesTypeScript = fs.existsSync(path.join(targetDir, 'tsconfig.json'));
    const extension = usesTypeScript ? 'ts' : 'js';

    const staticHelperPath = path.join(utilsDir, `static-assets.${extension}`);
    const staticHelperContent = `/**
 * Helper function to get the correct path for static assets
 * consistent with how Vite handles imports
 * 
 * @param {string} assetPath - The path to the asset
 * @returns {string} The processed asset path
 */
export function getStaticAsset(assetPath) {
  // Handle absolute paths from root
  if (assetPath.startsWith('/')) {
    return assetPath;
  }
  
  // Handle relative paths
  if (assetPath.startsWith('./') || assetPath.startsWith('../')) {
    // For Next.js, assets should be in the public directory
    // This is a simplified version and might need adjustment based on your project
    return assetPath;
  }
  
  return \`/\${assetPath}\`;
}

/**
 * For direct asset imports that were working in Vite
 * Useful for when you have imports like:
 * import logo from 'assets/logo.png'
 */
export function importedAssetPath(importedAsset) {
  if (!importedAsset) return '';
  
  // Handle objects with src property (common in Next.js)
  if (typeof importedAsset === 'object' && importedAsset.src) {
    return importedAsset.src;
  }
  
  // Handle string paths
  if (typeof importedAsset === 'string') {
    return importedAsset;
  }
  
  return '';
}`;

    await fs.writeFile(staticHelperPath, staticHelperContent);
    console.log(chalk.green(`√ Created static-assets.${extension} helper`));

    // Create migration guide for static assets
    const docsDir = path.join(targetDir, 'docs');
    await fs.ensureDir(docsDir);

    const assetGuidePath = path.join(docsDir, 'static-assets-migration.md');
    const assetGuideContent = `# Static Assets Migration Guide

When migrating from Vite to Next.js, static assets handling changes. Here's how to adapt your code:

## Asset location

Move your static assets to the \`public\` directory. In Next.js, any file inside the \`public\` directory is served at the root path.

For example:
- \`src/assets/logo.png\` should be moved to \`public/assets/logo.png\`
- \`public/favicon.ico\` can stay in \`public/favicon.ico\`

## Importing assets

### Before (Vite)

\`\`\`jsx
// Direct imports in Vite
import logo from '/logo.png'
import icon from './assets/icon.svg'

function App() {
  return (
    <div>
      <img src={logo} alt="Logo" />
      <img src={icon} alt="Icon" />
    </div>
  )
}
\`\`\`

### After (Next.js)

\`\`\`jsx
// Next.js asset handling
import { importedAssetPath } from '@/app/utils/static-assets'
import Image from 'next/image'

// For TypeScript projects, you can use these imports 
// but they return an object with a 'src' property instead of a string
import logo from '/public/logo.png'
import icon from '/public/assets/icon.svg'

function App() {
  return (
    <div>
      {/* Option 1: Use the helper function */}
      <img src={importedAssetPath(logo)} alt="Logo" />
      
      {/* Option 2: Access the src property directly */}
      <img src={logo.src} alt="Logo" />
      
      {/* Option 3 (recommended): Use Next.js Image component */}
      <Image src={logo} alt="Logo" width={100} height={100} />
      <Image src={icon} alt="Icon" width={24} height={24} />
    </div>
  )
}
\`\`\`

## URL paths in CSS

If you reference assets in CSS, update the paths to point to the public directory:

### Before (Vite)

\`\`\`css
.logo {
  background-image: url('/assets/logo.png');
}
\`\`\`

### After (Next.js)

\`\`\`css
.logo {
  background-image: url('/assets/logo.png');
}
\`\`\`

The path remains the same because Next.js also serves files from \`public\` at the root URL,
but you need to ensure the file is actually in \`public/assets/logo.png\`.

## Dynamic imports

For dynamic imports (like user-uploaded content or variable paths), use the \`getStaticAsset\` helper:

\`\`\`jsx
import { getStaticAsset } from '@/app/utils/static-assets'

function DynamicImage({ imageName }) {
  const imageUrl = getStaticAsset(\`assets/\${imageName}.png\`);
  
  return <img src={imageUrl} alt={imageName} />
}
\`\`\`
`;

    await fs.writeFile(assetGuidePath, assetGuideContent);
    console.log(chalk.green('√ Created static-assets-migration.md guide'));

    if (!foundAssets) {
        console.log(chalk.yellow('i No common static assets were detected'));
    }

    console.log(chalk.green('✓ Step 11 completed'));
    return true;
} 