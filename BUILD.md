# Building NoteBloom from Source

NoteBloom is a [Tauri v2](https://tauri.app) desktop app. The frontend is React + TypeScript (Vite), and the backend is Rust. You need both toolchains installed before you can build.

---

## Prerequisites (all platforms)

| Tool | Minimum version | Install |
|------|----------------|---------|
| Node.js | 18 | https://nodejs.org |
| Rust | stable | https://rustup.rs |
| npm | 9 | bundled with Node |

Verify:

```bash
node -v
npm -v
rustc --version
cargo --version
```

---

## Windows

### 1. Install Rust

Download and run the installer from https://rustup.rs. Accept all defaults. Restart your terminal after installation.

### 2. Install the MSVC build tools

Rust on Windows requires the Visual C++ build tools. Install them via the [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) installer — select the **"Desktop development with C++"** workload.

### 3. Install Node.js

Download the LTS installer from https://nodejs.org.

### 4. Clone and run

```bash
git clone https://github.com/ChloeVPin/notebloom.git
cd notebloom
npm install
npm run tauri dev
```

### 5. Build installers

```bash
# x64 (Intel / AMD)
npm run tauri -- build --target x86_64-pc-windows-msvc

# ARM64
npm run tauri -- build --target aarch64-pc-windows-msvc
```

Output: `src-tauri/target/<target>/release/bundle/msi/NoteBloom_<version>_<arch>_en-US.msi`

---

## macOS

### 1. Install Xcode command-line tools

```bash
xcode-select --install
```

### 2. Install Rust

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"
```

### 3. Install Node.js

```bash
# Using Homebrew (recommended)
brew install node

# Or download from https://nodejs.org
```

### 4. Clone and run

```bash
git clone https://github.com/ChloeVPin/notebloom.git
cd notebloom
npm install
npm run tauri dev
```

### 5. Build

```bash
npm run tauri build
```

Output: `src-tauri/target/release/bundle/dmg/NoteBloom_<version>_<arch>.dmg`

> **Apple Silicon vs Intel:** Tauri targets your current machine's architecture by default. To build a universal binary, add `--target universal-apple-darwin` (requires both `x86_64-apple-darwin` and `aarch64-apple-darwin` Rust targets installed via `rustup target add`).

---

## Linux

Tauri on Linux requires WebKit2GTK and a few system libraries. Install the ones matching your distro before running the build.

### Ubuntu / Debian

```bash
sudo apt update
sudo apt install -y \
  libwebkit2gtk-4.1-dev \
  libappindicator3-dev \
  librsvg2-dev \
  patchelf \
  libssl-dev \
  libgtk-3-dev \
  libglib2.0-dev \
  build-essential \
  curl \
  wget \
  file
```

### Fedora / RHEL

```bash
sudo dnf install -y \
  webkit2gtk4.1-devel \
  openssl-devel \
  libappindicator-gtk3-devel \
  librsvg2-devel \
  curl \
  wget \
  file
sudo dnf group install -y "C Development Tools and Libraries"
```

### Arch Linux

```bash
sudo pacman -S --needed \
  webkit2gtk-4.1 \
  base-devel \
  openssl \
  appmenu-gtk-module \
  gtk3 \
  libappindicator-gtk3 \
  librsvg \
  curl \
  wget \
  file
```

### Then (all distros)

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"

# Install Node.js (via nvm or your distro's package manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
nvm install --lts

# Clone and run
git clone https://github.com/ChloeVPin/notebloom.git
cd notebloom
npm install
npm run tauri dev
```

### Build

```bash
npm run tauri build
```

Output: `src-tauri/target/release/bundle/` (AppImage and deb)

---

## Verify the build

```bash
# Check Rust code compiles cleanly
cargo check --manifest-path src-tauri/Cargo.toml

# Check TypeScript
npx tsc --noEmit

# Build the frontend only
npm run build
```

---

## Troubleshooting

**`error: linker 'cc' not found` (Linux)**
Install `build-essential` (Debian/Ubuntu) or `base-devel` (Arch).

**`webkit2gtk not found` (Linux)**
Make sure you installed `libwebkit2gtk-4.1-dev`, not the older `4.0` variant — Tauri v2 requires 4.1.

**`cargo: command not found`**
Run `source "$HOME/.cargo/env"` or open a new terminal after installing Rust.

**`error[E0463]: can't find crate for 'std'` (cross-compilation)**
Install the missing target: `rustup target add <target-triple>`.

**WebView2 missing on Windows**
NoteBloom requires the WebView2 runtime (pre-installed on Windows 10 21H2+ and Windows 11). If missing, download from https://developer.microsoft.com/microsoft-edge/webview2/.
