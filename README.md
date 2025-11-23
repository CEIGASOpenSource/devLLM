# devLLM

AI-Assisted Development Launcher - A desktop app for managing full-stack development projects.

## Features

- Create new projects with React + Vite + Tailwind frontend and FastAPI backend
- Real-time health monitoring for frontend and backend services
- Auto-incrementing ports to avoid conflicts
- Projects saved locally per user

## Download

Download the latest release from the [Releases](../../releases) page.

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Rust](https://rustup.rs/)
- [Tauri CLI](https://tauri.app/)

### Setup

```bash
npm install
```

### Run in development mode

```bash
npm run tauri:dev
```

### Build for production

```bash
npm run tauri:build
```

The built executable will be at `src-tauri/target/release/devllm.exe`

## License

MIT
