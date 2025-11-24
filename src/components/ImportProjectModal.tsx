import { useState } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { addProject, getNextAvailablePorts, getRandomColor } from '../store/projectStore';

interface Props {
  onClose: () => void;
  onImported: () => void;
}

export default function ImportProjectModal({ onClose, onImported }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [frontendPath, setFrontendPath] = useState('');
  const [backendPath, setBackendPath] = useState('');
  const [frontendPort, setFrontendPort] = useState('');
  const [backendPort, setBackendPort] = useState('');
  const [frontendCommand, setFrontendCommand] = useState('npm run dev');
  const [backendCommand, setBackendCommand] = useState('');
  const [loading, setLoading] = useState(false);

  const handleBrowseFrontend = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select Frontend Folder',
      });
      if (selected && typeof selected === 'string') {
        setFrontendPath(selected);
        // Auto-set name from folder
        if (!name) {
          const folderName = selected.split(/[/\\]/).pop() || '';
          setName(folderName.replace(/-ui$/, '').replace(/-frontend$/, ''));
        }
      }
    } catch (err) {
      console.error('Browse error:', err);
    }
  };

  const handleBrowseBackend = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select Backend Folder',
      });
      if (selected && typeof selected === 'string') {
        setBackendPath(selected);
      }
    } catch (err) {
      console.error('Browse error:', err);
    }
  };

  const handleImport = () => {
    if (!name.trim() || !frontendPath || !backendPath) return;

    setLoading(true);
    const ports = getNextAvailablePorts();
    const fePort = parseInt(frontendPort) || ports.frontend;
    const bePort = parseInt(backendPort) || ports.backend;

    addProject({
      id: `imported-${Date.now()}`,
      name: name.trim(),
      description: description.trim() || `Imported project`,
      color: getRandomColor(),
      frontend: {
        port: fePort,
        path: frontendPath,
        command: frontendCommand || 'npm run dev',
      },
      backend: {
        port: bePort,
        path: backendPath,
        command: backendCommand || `.venv/Scripts/uvicorn app:app --reload --port ${bePort}`,
        healthEndpoint: '/health',
      },
    });

    setLoading(false);
    onImported();
    handleClose();
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setFrontendPath('');
    setBackendPath('');
    setFrontendPort('');
    setBackendPort('');
    setFrontendCommand('npm run dev');
    setBackendCommand('');
    onClose();
  };

  const ports = getNextAvailablePorts();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-900 rounded-xl p-6 w-full max-w-lg mx-4 border border-slate-700 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-white mb-4">Import Existing Project</h2>

        <div className="space-y-4">
          {/* Project Name */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">Project Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Project"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">Description (optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A brief description"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500"
            />
          </div>

          {/* Frontend Section */}
          <div className="border border-blue-800/50 rounded-lg p-4 bg-blue-900/10">
            <div className="text-blue-400 font-medium mb-3">Frontend</div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Folder</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={frontendPath}
                    readOnly
                    placeholder="Select frontend folder..."
                    className="flex-1 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 text-sm"
                  />
                  <button
                    onClick={handleBrowseFrontend}
                    className="px-3 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded-lg text-sm transition-colors"
                  >
                    Browse
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Port</label>
                  <input
                    type="number"
                    value={frontendPort}
                    onChange={(e) => setFrontendPort(e.target.value)}
                    placeholder={String(ports.frontend)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Command</label>
                  <input
                    type="text"
                    value={frontendCommand}
                    onChange={(e) => setFrontendCommand(e.target.value)}
                    placeholder="npm run dev"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Backend Section */}
          <div className="border border-green-800/50 rounded-lg p-4 bg-green-900/10">
            <div className="text-green-400 font-medium mb-3">Backend</div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Folder</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={backendPath}
                    readOnly
                    placeholder="Select backend folder..."
                    className="flex-1 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 text-sm"
                  />
                  <button
                    onClick={handleBrowseBackend}
                    className="px-3 py-2 bg-green-700 hover:bg-green-600 text-white rounded-lg text-sm transition-colors"
                  >
                    Browse
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Port</label>
                  <input
                    type="number"
                    value={backendPort}
                    onChange={(e) => setBackendPort(e.target.value)}
                    placeholder={String(ports.backend)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Command</label>
                  <input
                    type="text"
                    value={backendCommand}
                    onChange={(e) => setBackendCommand(e.target.value)}
                    placeholder=".venv/Scripts/uvicorn app:app --reload"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={handleClose}
            className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!name.trim() || !frontendPath || !backendPath || loading}
            className="flex-1 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
          >
            {loading ? 'Importing...' : 'Import'}
          </button>
        </div>
      </div>
    </div>
  );
}
