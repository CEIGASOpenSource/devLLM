use std::fs;
use std::path::Path;

#[tauri::command]
fn create_project(
    project_path: String,
    project_name: String,
    frontend_port: u16,
    backend_port: u16,
) -> Result<String, String> {
    let base = Path::new(&project_path);
    let frontend = base.join("frontend");
    let backend = base.join("backend");

    // Create directories
    fs::create_dir_all(&frontend).map_err(|e| e.to_string())?;
    fs::create_dir_all(&backend).map_err(|e| e.to_string())?;

    // Frontend: React + Vite + Tailwind
    let frontend_package = format!(r#"{{
  "name": "{}-frontend",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {{
    "dev": "vite --host 127.0.0.1 --port {}",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  }},
  "dependencies": {{
    "react": "^19.1.0",
    "react-dom": "^19.1.0"
  }},
  "devDependencies": {{
    "@types/react": "^19.1.6",
    "@types/react-dom": "^19.1.5",
    "@vitejs/plugin-react": "^4.5.0",
    "autoprefixer": "^10.4.21",
    "postcss": "^8.5.3",
    "tailwindcss": "^3.4.17",
    "typescript": "~5.8.3",
    "vite": "^7.0.0"
  }}
}}"#, project_name.to_lowercase().replace(" ", "-"), frontend_port);

    fs::write(frontend.join("package.json"), frontend_package).map_err(|e| e.to_string())?;

    let vite_config = format!(r#"import {{ defineConfig }} from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({{
  plugins: [react()],
  server: {{
    host: "127.0.0.1",
    port: {},
    strictPort: true,
  }},
}});"#, frontend_port);

    fs::write(frontend.join("vite.config.ts"), vite_config).map_err(|e| e.to_string())?;

    let index_html = format!(r#"<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>"#, project_name);

    fs::write(frontend.join("index.html"), index_html).map_err(|e| e.to_string())?;

    let tsconfig = r#"{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true
  },
  "include": ["src"]
}"#;

    fs::write(frontend.join("tsconfig.json"), tsconfig).map_err(|e| e.to_string())?;

    let tailwind_config = r#"export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: { extend: {} },
  plugins: [],
}"#;

    fs::write(frontend.join("tailwind.config.js"), tailwind_config).map_err(|e| e.to_string())?;

    let postcss_config = r#"export default {
  plugins: { tailwindcss: {}, autoprefixer: {} },
}"#;

    fs::write(frontend.join("postcss.config.js"), postcss_config).map_err(|e| e.to_string())?;

    // Create src directory
    let src = frontend.join("src");
    fs::create_dir_all(&src).map_err(|e| e.to_string())?;

    let main_tsx = r#"import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);"#;

    fs::write(src.join("main.tsx"), main_tsx).map_err(|e| e.to_string())?;

    let app_tsx = format!(r#"function App() {{
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-4">{}</h1>
        <p className="text-slate-400">Edit src/App.tsx to get started</p>
      </div>
    </div>
  );
}}

export default App;"#, project_name);

    fs::write(src.join("App.tsx"), app_tsx).map_err(|e| e.to_string())?;

    let index_css = r#"@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}"#;

    fs::write(src.join("index.css"), index_css).map_err(|e| e.to_string())?;

    // Backend: FastAPI
    let main_py = format!(r#"from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="{}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health():
    return {{"status": "healthy"}}

@app.get("/")
async def root():
    return {{"message": "Welcome to {}"}}
"#, project_name, project_name);

    fs::write(backend.join("main.py"), main_py).map_err(|e| e.to_string())?;

    let requirements = r#"fastapi>=0.115.0
uvicorn[standard]>=0.34.0
"#;

    fs::write(backend.join("requirements.txt"), requirements).map_err(|e| e.to_string())?;

    let readme = format!(r#"# {} Backend

## Setup

```bash
python -m venv .venv
.venv/Scripts/activate  # Windows
pip install -r requirements.txt
```

## Run

```bash
uvicorn main:app --reload --port {}
```
"#, project_name, backend_port);

    fs::write(backend.join("README.md"), readme).map_err(|e| e.to_string())?;

    Ok(format!("Project created at {}", project_path))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![create_project])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
