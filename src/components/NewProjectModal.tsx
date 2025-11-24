import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { ProjectConfig } from '../types/project';
import { addProject, getNextAvailablePorts, getRandomColor } from '../store/projectStore';

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

export default function NewProjectModal({ onClose, onCreated }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [basePath, setBasePath] = useState('C:/Dev');
  const [frontendPort, setFrontendPort] = useState('');
  const [backendPort, setBackendPort] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize ports when component mounts
  useEffect(() => {
    const ports = getNextAvailablePorts();
    setFrontendPort(String(ports.frontend));
    setBackendPort(String(ports.backend));
  }, []);

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Project name is required');
      return;
    }

    setCreating(true);
    setError(null);

    const projectId = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const projectPath = `${basePath}/${projectId}`;
    const fePort = parseInt(frontendPort) || 5173;
    const bePort = parseInt(backendPort) || 8000;

    try {
      // Create project folders via Tauri
      await invoke('create_project', {
        projectPath,
        projectName: name,
        frontendPort: fePort,
        backendPort: bePort,
      });

      const project: ProjectConfig = {
        id: projectId,
        name,
        description: description || `${name} project`,
        color: getRandomColor(),
        frontend: {
          port: fePort,
          path: `${projectPath}/frontend`,
          command: 'npm run dev',
        },
        backend: {
          port: bePort,
          path: `${projectPath}/backend`,
          command: `.venv/Scripts/uvicorn main:app --reload --port ${bePort}`,
          healthEndpoint: '/health',
        },
      };

      addProject(project);
      onCreated();
    } catch (err) {
      setError(String(err));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md mx-4 border border-slate-700">
        <h2 className="text-xl font-bold text-white mb-4">Create New Project</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Project Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
              placeholder="My Project"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
              placeholder="Optional description"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">Base Directory</label>
            <input
              type="text"
              value={basePath}
              onChange={(e) => setBasePath(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Frontend Port</label>
              <input
                type="text"
                inputMode="numeric"
                value={frontendPort}
                onChange={(e) => setFrontendPort(e.target.value.replace(/\D/g, ''))}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-500 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:bg-slate-600 cursor-text"
                placeholder="5173"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Backend Port</label>
              <input
                type="text"
                inputMode="numeric"
                value={backendPort}
                onChange={(e) => setBackendPort(e.target.value.replace(/\D/g, ''))}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-500 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:bg-slate-600 cursor-text"
                placeholder="8000"
              />
            </div>
          </div>

          {error && (
            <div className="text-red-400 text-sm bg-red-900/20 p-3 rounded-lg">
              {error}
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {creating ? 'Creating...' : 'Create Project'}
          </button>
        </div>
      </div>
    </div>
  );
}
