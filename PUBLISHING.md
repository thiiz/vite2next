# Publishing vite2next to npm

This document provides instructions on how to publish your vite2next package to npm.

## Prerequisites

1. Create an npm account at [https://www.npmjs.com/signup](https://www.npmjs.com/signup) if you don't have one already.
2. Make sure Node.js and npm are installed on your system.

## Publishing Steps

1. **Login to npm** in your terminal:

```bash
npm login
```

Enter your npm username, password, and email when prompted.

2. **Verify your package** before publishing:

```bash
npm pack
```

This creates a tarball file that you can inspect to ensure all necessary files are included.

3. **Publish your package** to npm:

```bash
npm publish
```

If this is your first time publishing this package name, the command will create a new package on npm.

4. **Verify your published package** by installing it:

```bash
npm install -g vite2next
```

And then running:

```bash
vite2next --help
```

## Updating Your Package

To update your package in the future:

1. Make your changes to the codebase
2. Update the version in `package.json` following semantic versioning:
   - Increment the patch version for bug fixes (e.g., 1.0.0 -> 1.0.1)
   - Increment the minor version for new features (e.g., 1.0.0 -> 1.1.0)
   - Increment the major version for breaking changes (e.g., 1.0.0 -> 2.0.0)
3. Publish the updated package:

```bash
npm publish
```

## Important Files for npm Publishing

The following files control how your package is published:

- **package.json**: Contains metadata about your package, including the name, version, main entry point, and dependencies.
- **.npmignore** (optional): Specifies files that should not be included in the published package. If not present, npm will use `.gitignore`.

## Making Your Package Globally Executable

The key parts of your package that make it installable with `npm i -g vite2next` are:

1. The shebang line (`#!/usr/bin/env node`) at the top of the main executable file (`index.js`).
2. The `bin` field in your `package.json` that maps the command name to the script file:

```json
"bin": {
  "vite2next": "./index.js"
}
```

When users install your package globally, npm will create a symlink for the `vite2next` command that points to your script file. 