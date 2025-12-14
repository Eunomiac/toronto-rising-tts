# GitHub Pages Deployment Guide

## Automatic Deployment

The workflow automatically runs when you push changes to `main` or `master` branch that affect:
- Files in `UI/` folder
- `package.json` or `package-lock.json`
- The workflow file itself (`.github/workflows/deploy-ui.yml`)

## Manual Deployment

If you need to deploy manually:

1. Go to your GitHub repository
2. Click the **Actions** tab
3. Select **"Deploy UI to GitHub Pages"** in the left sidebar
4. Click **"Run workflow"** button (top right)
5. Select your branch (usually `main` or `master`)
6. Click **"Run workflow"**

## Troubleshooting

### Workflow didn't run
- **Check branch**: Make sure you pushed to `main` or `master`
- **Check paths**: Only changes to `UI/**`, `package.json`, or workflow file trigger it
- **Manual trigger**: Use the manual trigger option above

### Build failed
- Check the Actions tab for error messages
- Common issues:
  - Missing dependencies (run `npm install` locally first)
  - TypeScript errors (check `npm run build:js` works locally)
  - SCSS errors (check `npm run build:css` works locally)

### Pages not updating
- Wait 1-2 minutes after deployment completes
- Clear browser cache (Ctrl+F5 or Cmd+Shift+R)
- Check the Pages URL in repository Settings → Pages

## Testing Locally

Before deploying, test the build locally:

```bash
# Install dependencies
npm install

# Build everything
npm run build

# Check that files were created
ls UI/script.js
ls UI/styles.css
```

## Deployment Status

After deployment, check:
- **Actions tab**: See deployment progress
- **Settings → Pages**: See deployment status and URL
- **Your site**: Visit `https://YOUR_USERNAME.github.io/toronto-rising-tts/`
