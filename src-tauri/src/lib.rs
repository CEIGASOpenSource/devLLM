use std::collections::HashMap;
use std::fs;
use std::path::Path;
use std::process::{Child, Command};
use std::sync::Mutex;
use tauri::State;

// Store running processes
struct ProcessManager {
    processes: Mutex<HashMap<String, Child>>,
}

#[tauri::command]
fn start_service(
    service_type: String,
    project_path: String,
    command: String,
    state: State<ProcessManager>,
) -> Result<String, String> {
    let key = format!("{}:{}", project_path, service_type);

    {
        let processes = state.processes.lock().map_err(|e| e.to_string())?;
        if processes.contains_key(&key) {
            return Err(format!("{} is already running", service_type));
        }
    }

    let path = Path::new(&project_path);
    if !path.exists() {
        return Err(format!("Path does not exist: {}", project_path));
    }

    let child = if cfg!(windows) {
        use std::os::windows::process::CommandExt;
        const CREATE_NEW_CONSOLE: u32 = 0x00000010;

        Command::new("cmd")
            .args(&["/k", &command])
            .current_dir(path)
            .creation_flags(CREATE_NEW_CONSOLE)
            .spawn()
            .map_err(|e| format!("Failed to start {}: {}", service_type, e))?
    } else {
        Command::new("sh")
            .args(&["-c", &command])
            .current_dir(path)
            .spawn()
            .map_err(|e| format!("Failed to start {}: {}", service_type, e))?
    };

    let pid = child.id();
    let mut processes = state.processes.lock().map_err(|e| e.to_string())?;
    processes.insert(key, child);

    Ok(format!("{} started with PID {}", service_type, pid))
}

#[tauri::command]
fn stop_service(
    service_type: String,
    project_path: String,
    state: State<ProcessManager>,
) -> Result<String, String> {
    let key = format!("{}:{}", project_path, service_type);
    let mut processes = state.processes.lock().map_err(|e| e.to_string())?;

    if let Some(mut child) = processes.remove(&key) {
        if cfg!(windows) {
            let pid = child.id();
            let _ = Command::new("taskkill")
                .args(&["/F", "/T", "/PID", &pid.to_string()])
                .output();
        } else {
            let _ = child.kill();
        }
        Ok(format!("{} stopped", service_type))
    } else {
        Err(format!("{} is not running", service_type))
    }
}

#[derive(serde::Serialize)]
struct DetectedProject {
    has_frontend: bool,
    has_backend: bool,
    frontend_port: Option<u16>,
    backend_port: Option<u16>,
    project_name: String,
}

#[tauri::command]
fn detect_project(project_path: String) -> Result<DetectedProject, String> {
    let path = Path::new(&project_path);
    if !path.exists() {
        return Err("Path does not exist".to_string());
    }

    let frontend_path = path.join("frontend");
    let backend_path = path.join("backend");

    let has_frontend = frontend_path.join("package.json").exists();
    let has_backend = backend_path.join("requirements.txt").exists()
        || backend_path.join("main.py").exists();

    let frontend_port = if has_frontend {
        detect_port(&frontend_path, "frontend")
    } else {
        None
    };

    let backend_port = if has_backend {
        detect_port(&backend_path, "backend")
    } else {
        None
    };

    let project_name = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("Unknown")
        .to_string();

    Ok(DetectedProject {
        has_frontend,
        has_backend,
        frontend_port,
        backend_port,
        project_name,
    })
}

fn detect_port(path: &Path, service_type: &str) -> Option<u16> {
    if service_type == "frontend" {
        for ext in &["ts", "js"] {
            let config = path.join(format!("vite.config.{}", ext));
            if let Ok(content) = fs::read_to_string(&config) {
                if let Some(port) = extract_port(&content) {
                    return Some(port);
                }
            }
        }
        return Some(5190);
    }

    let env_path = path.join(".env");
    if let Ok(content) = fs::read_to_string(&env_path) {
        if let Some(port) = extract_port(&content) {
            return Some(port);
        }
    }
    Some(8000)
}

fn extract_port(content: &str) -> Option<u16> {
    for line in content.lines() {
        if line.contains("port") || line.contains("PORT") {
            for word in line.split(|c: char| !c.is_ascii_digit()) {
                if let Ok(port) = word.parse::<u16>() {
                    if port >= 1024 && port <= 65535 {
                        return Some(port);
                    }
                }
            }
        }
    }
    None
}

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

    // ========== FRONTEND ==========
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

    // .env.example
    let env_example = format!("VITE_API_URL=http://127.0.0.1:{}", backend_port);
    fs::write(frontend.join(".env.example"), &env_example).map_err(|e| e.to_string())?;
    fs::write(frontend.join(".env"), &env_example).map_err(|e| e.to_string())?;

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
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
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

    // Create src directories
    let src = frontend.join("src");
    let api_dir = src.join("api");
    let hooks_dir = src.join("hooks");
    let types_dir = src.join("types");
    fs::create_dir_all(&api_dir).map_err(|e| e.to_string())?;
    fs::create_dir_all(&hooks_dir).map_err(|e| e.to_string())?;
    fs::create_dir_all(&types_dir).map_err(|e| e.to_string())?;

    // API Client
    let api_client = r#"const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const error = await response.text();
      return { data: null, error: error || `HTTP ${response.status}` };
    }

    const data = await response.json();
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint),

  post: <T>(endpoint: string, body: unknown) =>
    request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  put: <T>(endpoint: string, body: unknown) =>
    request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  delete: <T>(endpoint: string) =>
    request<T>(endpoint, { method: 'DELETE' }),
};
"#;

    fs::write(api_dir.join("client.ts"), api_client).map_err(|e| e.to_string())?;

    // useApi Hook
    let use_api = r#"import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useApi<T>(endpoint: string) {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  const fetchData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    const { data, error } = await api.get<T>(endpoint);
    setState({ data, loading: false, error });
  }, [endpoint]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { ...state, refetch: fetchData };
}

export function useMutation<T, B = unknown>(endpoint: string, method: 'post' | 'put' | 'delete' = 'post') {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const mutate = useCallback(async (body?: B) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    let result;
    if (method === 'post') {
      result = await api.post<T>(endpoint, body);
    } else if (method === 'put') {
      result = await api.put<T>(endpoint, body);
    } else {
      result = await api.delete<T>(endpoint);
    }

    setState({ data: result.data, loading: false, error: result.error });
    return result;
  }, [endpoint, method]);

  return { ...state, mutate };
}
"#;

    fs::write(hooks_dir.join("useApi.ts"), use_api).map_err(|e| e.to_string())?;

    // Types
    let types = r#"export interface Item {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
}

export interface CreateItem {
  name: string;
  description?: string;
}

export interface HealthResponse {
  status: string;
}
"#;

    fs::write(types_dir.join("index.ts"), types).map_err(|e| e.to_string())?;

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

    let app_tsx = format!(r#"import {{ useState }} from 'react';
import {{ useApi, useMutation }} from './hooks/useApi';
import type {{ Item, CreateItem, HealthResponse }} from './types';

function App() {{
  const {{ data: health }} = useApi<HealthResponse>('/health');
  const {{ data: items, loading, error, refetch }} = useApi<Item[]>('/items');
  const {{ mutate: createItem, loading: creating }} = useMutation<Item, CreateItem>('/items', 'post');

  const [newItem, setNewItem] = useState('');

  const handleCreate = async () => {{
    if (!newItem.trim()) return;
    const result = await createItem({{ name: newItem }});
    if (!result.error) {{
      setNewItem('');
      refetch();
    }}
  }};

  return (
    <div className="min-h-screen bg-slate-900 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">{}</h1>
          <span className={{`px-3 py-1 rounded-full text-sm ${{
            health?.status === 'healthy' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
          }}`}}>
            {{health?.status || 'checking...'}}
          </span>
        </div>

        <div className="bg-slate-800 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Add Item</h2>
          <div className="flex gap-3">
            <input
              type="text"
              value={{newItem}}
              onChange={{(e) => setNewItem(e.target.value)}}
              placeholder="Item name..."
              className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
              onKeyDown={{(e) => e.key === 'Enter' && handleCreate()}}
            />
            <button
              onClick={{handleCreate}}
              disabled={{creating}}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
            >
              {{creating ? 'Adding...' : 'Add'}}
            </button>
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Items</h2>
          {{loading ? (
            <p className="text-slate-400">Loading...</p>
          ) : error ? (
            <p className="text-red-400">{{error}}</p>
          ) : items?.length === 0 ? (
            <p className="text-slate-400">No items yet. Add one above!</p>
          ) : (
            <ul className="space-y-2">
              {{items?.map((item) => (
                <li key={{item.id}} className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg">
                  <span className="text-white">{{item.name}}</span>
                  <span className="text-slate-500 text-sm">{{new Date(item.created_at).toLocaleDateString()}}</span>
                </li>
              ))}}
            </ul>
          )}}
        </div>
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

    // ========== BACKEND ==========
    let routes_dir = backend.join("routes");
    let models_dir = backend.join("models");
    let schemas_dir = backend.join("schemas");
    fs::create_dir_all(&routes_dir).map_err(|e| e.to_string())?;
    fs::create_dir_all(&models_dir).map_err(|e| e.to_string())?;
    fs::create_dir_all(&schemas_dir).map_err(|e| e.to_string())?;

    // .env.example
    let backend_env = format!(r#"DATABASE_URL=sqlite:///./app.db
BACKEND_PORT={}
"#, backend_port);
    fs::write(backend.join(".env.example"), &backend_env).map_err(|e| e.to_string())?;
    fs::write(backend.join(".env"), &backend_env).map_err(|e| e.to_string())?;

    // database.py
    let database_py = r#"from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./app.db")

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
"#;

    fs::write(backend.join("database.py"), database_py).map_err(|e| e.to_string())?;

    // models/__init__.py
    let models_init = r#"from .item import Item
"#;
    fs::write(models_dir.join("__init__.py"), models_init).map_err(|e| e.to_string())?;

    // models/item.py
    let item_model = r#"from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from database import Base

class Item(Base):
    __tablename__ = "items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
"#;

    fs::write(models_dir.join("item.py"), item_model).map_err(|e| e.to_string())?;

    // schemas/__init__.py
    let schemas_init = r#"from .item import ItemCreate, ItemResponse
"#;
    fs::write(schemas_dir.join("__init__.py"), schemas_init).map_err(|e| e.to_string())?;

    // schemas/item.py
    let item_schema = r#"from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class ItemCreate(BaseModel):
    name: str
    description: Optional[str] = None

class ItemResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True
"#;

    fs::write(schemas_dir.join("item.py"), item_schema).map_err(|e| e.to_string())?;

    // routes/__init__.py
    let routes_init = r#"from .items import router as items_router
"#;
    fs::write(routes_dir.join("__init__.py"), routes_init).map_err(|e| e.to_string())?;

    // routes/items.py
    let items_route = r#"from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import Item
from schemas import ItemCreate, ItemResponse

router = APIRouter(prefix="/items", tags=["items"])

@router.get("", response_model=List[ItemResponse])
def get_items(db: Session = Depends(get_db)):
    return db.query(Item).order_by(Item.created_at.desc()).all()

@router.get("/{item_id}", response_model=ItemResponse)
def get_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item

@router.post("", response_model=ItemResponse)
def create_item(item: ItemCreate, db: Session = Depends(get_db)):
    db_item = Item(**item.model_dump())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.delete("/{item_id}")
def delete_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    db.delete(item)
    db.commit()
    return {"message": "Item deleted"}
"#;

    fs::write(routes_dir.join("items.py"), items_route).map_err(|e| e.to_string())?;

    // main.py
    let main_py = format!(r#"from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from database import engine, Base
from routes import items_router

load_dotenv()

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="{}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(items_router)

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
sqlalchemy>=2.0.0
python-dotenv>=1.0.0
"#;

    fs::write(backend.join("requirements.txt"), requirements).map_err(|e| e.to_string())?;

    let readme = format!(r#"# {} Backend

## Setup

```bash
python -m venv .venv
.venv/Scripts/activate  # Windows
# source .venv/bin/activate  # Linux/Mac
pip install -r requirements.txt
```

## Run

```bash
uvicorn main:app --reload --port {}
```

## API Docs

Once running, visit:
- Swagger UI: http://127.0.0.1:{}/docs
- ReDoc: http://127.0.0.1:{}/redoc

## Project Structure

```
backend/
├── main.py          # FastAPI app entry point
├── database.py      # SQLAlchemy setup
├── models/          # Database models
│   └── item.py
├── schemas/         # Pydantic schemas
│   └── item.py
└── routes/          # API routes
    └── items.py
```
"#, project_name, backend_port, backend_port, backend_port);

    fs::write(backend.join("README.md"), readme).map_err(|e| e.to_string())?;

    Ok(format!("Project created at {}", project_path))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(ProcessManager {
            processes: Mutex::new(HashMap::new()),
        })
        .invoke_handler(tauri::generate_handler![
            create_project,
            start_service,
            stop_service,
            detect_project
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
