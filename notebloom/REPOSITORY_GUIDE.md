# Notebloom Repository Guide

This document provides information about managing the Notebloom GitHub repository.

## 📍 Repository Information

- **Repository URL**: https://github.com/ChloeVPin/notebloom
- **Visibility**: Private
- **Purpose**: Distribution and organizational hub for Notebloom application

## 📁 Repository Structure

```
notebloom/
├── .github/              # GitHub-specific files
│   └── FUNDING.yml       # Funding/sponsorship configuration
├── build/                # Build configuration and assets
│   ├── windows/          # Windows-specific build files
│   │   └── icon.ico      # Application icon
│   └── appicon.png       # App icon
├── frontend/             # Frontend application
│   ├── dist/             # Build outputs (not tracked in git)
│   ├── node_modules/     # Dependencies (not tracked in git)
│   ├── src/              # Source files
│   │   ├── assets/       # Fonts and images
│   │   ├── main.js       # Main JavaScript
│   │   ├── style.css     # Application styles
│   │   └── app.css       # Additional styles
│   ├── wailsjs/          # Wails runtime bindings
│   ├── index.html        # Main HTML file
│   ├── package.json      # Node.js project configuration
│   └── vite.config.js    # Vite configuration (if used)
├── .gitattributes        # Git line ending configuration
├── .gitignore            # Files to ignore in git
├── app.go                # Go backend application logic
├── CHANGELOG.md          # Version history and changes
├── CONTRIBUTING.md       # Contribution guidelines
├── go.mod                # Go module dependencies
├── go.sum                # Go module checksums
├── LICENSE               # License file
├── main.go               # Go main entry point
├── README.md             # Main repository documentation
├── REPOSITORY_GUIDE.md   # This file
└── wails.json            # Wails project configuration
```

## 🚀 Creating a New Release

When you have a new version ready:

1. **Update version in wails.json**
   ```bash
   # Edit wails.json and update info.productVersion
   ```

2. **Build the installer**
   ```bash
   wails build -nsis
   ```

3. **Update CHANGELOG.md**
   - Add new version section with changes
   - Follow the existing format

4. **Commit changes**
   ```bash
   git add .
   git commit -m "chore: Bump version to X.X.X"
   git push
   ```

5. **Create GitHub release**
   ```bash
   gh release create vX.X.X "build/bin/Notebloom-windows-amd64-installer.exe" \
     --title "Notebloom vX.X.X" \
     --notes "Release notes here"
   ```

## 📝 Common Git Commands

### Check repository status
```bash
git status
```

### Add and commit changes
```bash
git add .
git commit -m "Your commit message"
git push
```

### View commit history
```bash
git log --oneline
```

### Create a new branch
```bash
git checkout -b feature-name
```

### View releases
```bash
gh release list
```

## 🔧 Repository Settings

### Topics
The repository is tagged with: `wails`, `go`, `notepad`, `windows`, `desktop-app`, `text-editor`

### Branch Protection
Consider enabling branch protection rules for the master branch:
- Go to Settings → Branches → Add rule
- Require pull request reviews before merging (optional for private repo)

## 📦 Release Assets

Each release should include:
- **Notebloom-windows-amd64-installer.exe** - The Windows installer
- Release notes describing changes
- Link to CHANGELOG.md for full history

## 🔒 Security

- Repository is private - only you have access
- Personal access token is stored securely in GitHub CLI
- Never commit sensitive data or credentials
- The `.gitignore` file prevents build artifacts and dependencies from being tracked

## 🛠️ Development Workflow

### Running in Development
```bash
wails dev
```

### Building for Production
```bash
# Standard build
wails build

# Build with NSIS installer
wails build -nsis

# Build for specific platform
wails build -platform windows/amd64
```

### Frontend Development
```bash
cd frontend
npm install
npm run dev
```

## 📧 Contact

For questions or issues, contact: chloevalesquez@gmail.com

---

Last updated: February 12, 2026
