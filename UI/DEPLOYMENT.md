# GitHub Pages Deployment

This UI is automatically deployed to GitHub Pages when you push changes to the `main` or `master` branch.

## Setup Instructions

1. **Enable GitHub Pages in your repository:**
   - Go to your repo on GitHub
   - Settings → Pages
   - Source: Select "GitHub Actions"
   - Save

2. **Update Global.xml with your GitHub Pages URL:**
   - Open `.tts/objects/Global.xml`
   - Replace `YOUR_USERNAME` with your GitHub username
   - The URL format is: `https://YOUR_USERNAME.github.io/toronto-rising-tts/index.html`
   - Or use your custom domain if configured

3. **Push to trigger deployment:**
   - The workflow automatically builds CSS and JS files
   - Deploys the `UI/` folder contents to GitHub Pages
   - Check the Actions tab to see deployment status

## Manual Deployment

You can also trigger the workflow manually:
- Go to Actions tab in GitHub
- Select "Deploy UI to GitHub Pages"
- Click "Run workflow"

## Testing Locally

Before deploying, you can test the UI locally:
1. Build the assets: `npm run build`
2. Serve the UI folder with a local server (e.g., `python -m http.server` in the UI folder)
3. Update Global.xml temporarily to use `http://localhost:8000/index.html`

## Troubleshooting

- **UI not loading:** Check that the URL in Global.xml matches your GitHub Pages URL
- **Build fails:** Ensure all dependencies are in package.json
- **Deployment fails:** Check GitHub Actions logs for errors
