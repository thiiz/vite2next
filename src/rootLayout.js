import chalk from 'chalk';
import fs from 'fs-extra';
import { JSDOM } from 'jsdom';
import path from 'path';

export async function createRootLayout(targetDir) {
  console.log(chalk.blue('Step 5: Creating root layout...'));

  // Create app directory if it doesn't exist
  const appDir = path.join(targetDir, 'app');
  await fs.ensureDir(appDir);

  // Check if layout.tsx already exists
  const layoutPath = path.join(appDir, 'layout.tsx');
  const layoutJsPath = path.join(appDir, 'layout.jsx');
  const layoutJsxPath = path.join(appDir, 'layout.js');

  if (fs.existsSync(layoutPath) || fs.existsSync(layoutJsPath) || fs.existsSync(layoutJsxPath)) {
    console.log(chalk.yellow('i Root layout file already exists, skipping creation'));
    return true;
  }

  // Try to find index.html to use as a template
  const indexHtmlPath = path.join(targetDir, 'index.html');
  let usesTypeScript = fs.existsSync(path.join(targetDir, 'tsconfig.json'));
  let layout = '';

  // Default layout if index.html is not found
  const defaultLayout = `${usesTypeScript ? `import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'My App',
  description: 'My application description',
}

` : ''}export default function RootLayout({
  children,
}${usesTypeScript ? `: {
  children: React.ReactNode
}` : ''}) {
  return (
    <html lang="en">
      <body>
        <div id="root">{children}</div>
      </body>
    </html>
  )
}`;

  if (fs.existsSync(indexHtmlPath)) {
    console.log(chalk.gray('Using index.html as template for root layout'));

    try {
      const indexHtml = await fs.readFile(indexHtmlPath, 'utf8');
      const dom = new JSDOM(indexHtml);
      const document = dom.window.document;

      // Extract title and description for metadata
      const title = document.querySelector('title')?.textContent || 'My App';
      const description = document.querySelector('meta[name="description"]')?.getAttribute('content') || 'My application description';

      // Check for head elements to keep
      const linkElements = document.querySelectorAll('head link');
      const metaElements = document.querySelectorAll('head meta');
      const scriptElements = document.querySelectorAll('head script');

      // Build metadata object
      let metadataContent = [
        `  title: '${title.replace(/'/g, "\\'")}',`,
        `  description: '${description?.replace(/'/g, "\\'")}',`
      ];

      // Process meta tags for metadata
      for (const meta of metaElements) {
        const name = meta.getAttribute('name');
        const property = meta.getAttribute('property');
        const content = meta.getAttribute('content');
        const charsetAttr = meta.getAttribute('charset');

        if (charsetAttr || name === 'viewport' || name === 'description') {
          // Skip these as they are handled by Next.js or already included
          continue;
        }

        if (name && content) {
          // Handle special meta tags according to Next.js Metadata API
          if (name === 'author') {
            metadataContent.push(`  authors: [{ name: '${content.replace(/'/g, "\\'")}' }],`);
          } else {
            metadataContent.push(`  ${name}: '${content.replace(/'/g, "\\'")}',`);
          }
        } else if (property && content) {
          // Handle OpenGraph and other metadata with properties
          if (property.startsWith('og:')) {
            // Find existing openGraph entry or create new one
            const ogEntry = metadataContent.findIndex(line => line.trim().startsWith('openGraph:'));

            // Extract og namespace
            const ogProp = property.substring(3);

            // Handle specific OG properties according to Next.js types
            if (ogProp === 'image') {
              if (ogEntry === -1) {
                metadataContent.push(`  openGraph: {
    images: ['${content.replace(/'/g, "\\'")}']
  },`);
              } else {
                // Update existing openGraph entry
                const currentOg = metadataContent[ogEntry];
                if (!currentOg.includes('images:')) {
                  // Add images array to existing openGraph
                  metadataContent[ogEntry] = currentOg.replace(/(\s+openGraph:\s+\{)/, `$1\n    images: ['${content.replace(/'/g, "\\'")}'],`);
                }
              }
            } else {
              if (ogEntry === -1) {
                metadataContent.push(`  openGraph: {
    ${ogProp}: '${content.replace(/'/g, "\\'")}',
  },`);
              } else {
                // Update existing openGraph entry
                const currentOg = metadataContent[ogEntry];
                metadataContent[ogEntry] = currentOg.replace(/(\s+openGraph:\s+\{)/, `$1\n    ${ogProp}: '${content.replace(/'/g, "\\'")}',`);
              }
            }
          } else {
            metadataContent.push(`  '${property}': '${content.replace(/'/g, "\\'")}',`);
          }
        }
      }

      // Add script elements as custom head tags if needed
      let scripts = [];
      for (const script of scriptElements) {
        const src = script.getAttribute('src');
        if (src) {
          scripts.push(`        <Script src="${src}" />`);
        } else {
          // For inline scripts, capture the content
          const content = script.textContent;
          if (content) {
            scripts.push(`        <Script id="${Math.random().toString(36).substring(2, 9)}">{${JSON.stringify(content)}}</Script>`);
          }
        }
      }

      // If we have scripts, we'll need to import Next.js Script component
      const hasScripts = scripts.length > 0;

      // Create layout file
      layout = `${usesTypeScript ? `import type { Metadata } from 'next'
${hasScripts ? "import Script from 'next/script'" : ""}

export const metadata: Metadata = {
${metadataContent.join('\n')}
}

` : hasScripts ? `import Script from 'next/script'

` : ''}export default function RootLayout({
  children,
}${usesTypeScript ? `: {
  children: React.ReactNode
}` : ''}) {
  return (
    <html lang="en">
      <body>
        <div id="root">{children}</div>
${hasScripts ? scripts.join('\n') : ''}
      </body>
    </html>
  )
}`;
    } catch (error) {
      console.error(chalk.yellow(`Failed to parse index.html: ${error.message}`));
      console.log(chalk.gray('Using default layout instead'));
      layout = defaultLayout;
    }
  } else {
    console.log(chalk.gray('No index.html found, using default layout'));
    layout = defaultLayout;
  }

  // Determine file extension
  const extension = usesTypeScript ? 'tsx' : 'jsx';
  const finalLayoutPath = path.join(appDir, `layout.${extension}`);

  // Write layout file
  await fs.writeFile(finalLayoutPath, layout);
  console.log(chalk.green(`√ Created app/layout.${extension}`));

  console.log(chalk.green('✓ Step 4 completed'));
  return true;
} 