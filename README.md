# devLLM

AI-Assisted Development Launcher - A desktop app for managing full-stack development projects.

## Features

- Create new projects with React + Vite + Tailwind frontend and FastAPI backend
- Real-time health monitoring for frontend and backend services
- Auto-incrementing ports to avoid conflicts
- Projects saved locally per user

## Download

Download the latest release from the [Releases](../../releases) page.

---

## Quick Start: Build an AI Chat App

This guide walks you through creating a project and connecting it to your local LLM.

### Step 1: Launch devLLM

Run the executable:
```bash
devllm.exe
```

### Step 2: Create a New Project

1. Click **"+ New Project"** button
2. Enter your project details:
   - **Name**: `my-chat-app` (or your preferred name)
   - **Path**: `C:\Dev` (where the project folder will be created)
3. Click **Create**

devLLM will generate a full-stack project with:
- Frontend at `C:\Dev\my-chat-app\frontend`
- Backend at `C:\Dev\my-chat-app\backend`

### Step 3: Set Up the Backend

Open a terminal and run:

```bash
cd C:\Dev\my-chat-app\backend

# Create virtual environment
python -m venv .venv

# Activate it
.venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Add LLM client library
pip install httpx
```

### Step 4: Add Chat Endpoint

Create `backend/routes/chat.py`:

```python
from fastapi import APIRouter
import httpx

router = APIRouter(prefix="/chat", tags=["chat"])

# Configure for your local LLM (Ollama, LM Studio, etc.)
LLM_URL = "http://localhost:11434/api/generate"  # Ollama default
MODEL = "llama3.2"  # or your installed model

@router.post("/")
async def chat(message: dict):
    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(
            LLM_URL,
            json={
                "model": MODEL,
                "prompt": message["content"],
                "stream": False
            }
        )
        result = response.json()
        return {"response": result.get("response", "")}
```

Register the router in `backend/app.py`:

```python
from routes.chat import router as chat_router

app.include_router(chat_router)
```

### Step 5: Start the Backend

```bash
cd C:\Dev\my-chat-app\backend
.venv\Scripts\activate
uvicorn app:app --reload --port 8000
```

### Step 6: Set Up the Frontend

Open a new terminal:

```bash
cd C:\Dev\my-chat-app\frontend
npm install
```

### Step 7: Create Chat Component

Create `frontend/src/components/Chat.tsx`:

```tsx
import { useState } from 'react';

export default function Chat() {
  const [messages, setMessages] = useState<{role: string, content: string}[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('http://localhost:8000/chat/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: input })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error connecting to LLM' }]);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-screen max-w-3xl mx-auto p-4">
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.map((msg, i) => (
          <div key={i} className={`p-3 rounded-lg ${
            msg.role === 'user'
              ? 'bg-blue-600 text-white ml-auto max-w-[80%]'
              : 'bg-slate-700 text-white max-w-[80%]'
          }`}>
            {msg.content}
          </div>
        ))}
        {loading && <div className="text-slate-400">Thinking...</div>}
      </div>

      <div className="flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          placeholder="Type a message..."
          className="flex-1 p-3 rounded-lg bg-slate-800 text-white border border-slate-600"
        />
        <button
          onClick={sendMessage}
          disabled={loading}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}
```

Update `frontend/src/App.tsx`:

```tsx
import Chat from './components/Chat';

function App() {
  return (
    <div className="min-h-screen bg-slate-900">
      <Chat />
    </div>
  );
}

export default App;
```

### Step 8: Start the Frontend

```bash
cd C:\Dev\my-chat-app\frontend
npm run dev
```

### Step 9: Start Your Local LLM

Make sure your local LLM is running:

**Ollama:**
```bash
ollama serve
ollama pull llama3.2
```

**LM Studio:**
- Open LM Studio -> Load a model -> Start local server (port 1234)
- Update `LLM_URL` in chat.py to `http://localhost:1234/v1/chat/completions`

### Step 10: Test It

1. Open `http://localhost:5173` in your browser
2. Type a message and press Enter
3. Watch your local LLM respond

### Troubleshooting

| Issue | Solution |
|-------|----------|
| CORS error | Add `allow_origins=["*"]` to FastAPI CORS middleware |
| Connection refused | Check LLM is running on correct port |
| Timeout | Increase `httpx.AsyncClient(timeout=120.0)` |
| Model not found | Run `ollama list` to see available models |

---

## Building from Source

### Prerequisites

You need the following installed on your system:

#### 1. Node.js (v18+)

**Option A: Download installer**
- Download from https://nodejs.org/ (LTS version recommended)

**Option B: Using winget (Windows)**
```powershell
winget install OpenJS.NodeJS.LTS
```

**Option C: Using package manager (macOS/Linux)**
```bash
# macOS
brew install node

# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

#### 2. Rust

**Option A: Download installer**
- Download from https://rustup.rs/

**Option B: Using winget (Windows)**
```powershell
winget install Rustlang.Rustup
```

**Option C: Using curl (macOS/Linux)**
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

#### 3. Restart your terminal

After installing Node.js and Rust, **close and reopen your terminal** for PATH changes to take effect.

#### 4. Verify installations

```bash
node --version   # Should show v18+
npm --version    # Should show 9+
rustc --version  # Should show 1.70+
cargo --version  # Should show 1.70+
```

### Build Steps

```bash
# Clone the repository
git clone https://github.com/CEIGASOpenSource/devLLM.git
cd devLLM

# Install dependencies
npm install

# Build for production
npm run tauri:build
```

The built executable will be at `src-tauri/target/release/devllm.exe` (Windows) or `src-tauri/target/release/devllm` (macOS/Linux).

### Development Mode

To run in development mode with hot-reload:

```bash
npm run tauri:dev
```

### Build Troubleshooting

| Issue | Solution |
|-------|----------|
| `npm` not recognized | Restart terminal after installing Node.js, or reinstall Node.js |
| `cargo` not recognized | Restart terminal after installing Rust, or reinstall Rust |
| Build fails on Windows | Install [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) with "Desktop development with C++" |
| Build fails on Linux | Install build essentials: `sudo apt install build-essential libwebkit2gtk-4.1-dev libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev` |

## License

Apache-2.0 - See [LICENSE](LICENSE) and [NOTICE](NOTICE) for details.

If you use devLLM in your project, please provide attribution by mentioning "Built with devLLM by CEIGASOpenSource" in your README or credits.
