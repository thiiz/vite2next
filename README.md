# vite2next

A command-line tool that automatically migrates Vite projects to Next.js following the [official Next.js migration guide](https://nextjs.org/docs/app/building-your-application/upgrading/from-vite).

## Features

- Installs Next.js dependencies
- Creates Next.js configuration file
- Updates TypeScript configuration
- Creates root layout based on your existing index.html
- Sets up entry page to maintain SPA (Single Page Application) pattern
- Converts App.css styles to Tailwind CSS classes (optional)
- Helps with static image imports
- Migrates environment variables from Vite format to Next.js
- Updates scripts in package.json
- Removes Vite-related files
- Configures compatibility with React Router
- Migrates static assets

## Installation

### Global Installation

```bash
npm install -g vite2next
```

### Local Usage (without installation)

```bash
npx vite2next
```

## Usage

Navigate to your Vite project directory and run:

```bash
vite2next
```

The tool will guide you through the migration process with interactive prompts.

### Options

- `-y, --yes`: Skip all confirmations.
- `--skip-install`: Skip dependency installation.
- `--tailwind`: Convert App.css styles to Tailwind CSS classes.
- `[project-directory]`: Specify a target directory (defaults to current directory).

Examples:

```bash
# Migrate current directory
vite2next

# Migrate a specific directory
vite2next ./my-vite-project

# Skip all confirmations
vite2next -y

# Skip dependency installation
vite2next --skip-install

# Convert App.css to Tailwind CSS
vite2next --tailwind
```

## Migration Steps

The tool follows the official Next.js migration guide and performs these steps:

1. **Install Next.js Dependency**: Adds Next.js to the project dependencies.
2. **Create Next.js Configuration**: Creates a `next.config.mjs` file based on Vite settings.
3. **Update TypeScript Configuration**: Adjusts your `tsconfig.json` if you're using TypeScript.
4. **Create Root Layout**: Creates a root layout component based on your `index.html`.
5. **Create Entry Page**: Sets up appropriate pages using the App Router.
6. **Convert App.css to Tailwind** (optional): Converts App.css styles to inline Tailwind CSS classes.
7. **Update Static Image Imports**: Adds support and helpers for image importing.
8. **Migrate Environment Variables**: Updates your environment variables from `VITE_` to `NEXT_PUBLIC_`.
9. **Update Scripts in package.json**: Updates scripts to use Next.js commands.
10. **Cleanup**: Removes Vite-related files and dependencies.
11. **Configure React Router Compatibility**: Facilitates migration from React Router to Next.js App Router.
12. **Migrate Static Assets**: Helps properly configure static assets in Next.js.

## After Migration

After migration is complete, your application will be running on Next.js as a Single Page Application. From there, you can incrementally adopt more Next.js features:

- Migrate from React Router to Next.js App Router
- Optimize images with the `<Image>` component
- Optimize fonts with `next/font`
- Optimize scripts with the `<Script>` component
- Add Server Components and server-side data fetching
- Add API routes
- And much more!

For detailed instructions on how to adapt your code after migration, refer to the documentation files created in the `docs/` folder of your project.

## Tailwind CSS Conversion

When using the `--tailwind` option, the tool will:

1. Find App.css files in your Vite project
2. Convert CSS rules to equivalent Tailwind CSS classes using the [css-to-tailwindcss](https://www.npmjs.com/package/css-to-tailwindcss) package
3. Update components that use these CSS classes to use inline Tailwind classes
4. Create a backup of your App.css file before removal
5. Remove the original App.css file

This allows for a more seamless transition to Next.js with Tailwind CSS, which is a popular styling approach in the Next.js ecosystem. The css-to-tailwindcss package provides comprehensive conversion capabilities for most CSS properties, respecting your Tailwind configuration.

## How to Use in Your Own Projects

To use this tool in your projects, you have several options:

1. **As a global dependency**: Install it with `npm install -g vite2next` and use in any project
   
2. **As a development dependency**: Add to your project with `npm install --save-dev vite2next`

3. **Run directly**: Use `npx vite2next` in any project without prior installation

4. **Integrate into your own CLI**: Import the specific modules you need:

```javascript
import { updatePackageJson } from 'vite2next/api';
import { migrateDependencies } from 'vite2next/api';
import { convertAppCssToTailwind } from 'vite2next/api';

// Use in your own script
await updatePackageJson('./my-project');
await migrateDependencies('./my-project', false);
await convertAppCssToTailwind('./my-project');
```

## License

MIT 