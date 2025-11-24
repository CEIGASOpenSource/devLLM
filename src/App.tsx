import { useState, useEffect, useCallback } from 'react';
import type { ProjectConfig, ProjectStatus } from './types/project';
import { PROJECTS as DEFAULT_PROJECTS } from './types/project';
import { getProjects, removeProject, getRemovedDefaultIds, restoreDefaultProject } from './store/projectStore';
import ProjectCard from './components/ProjectCard';
import NewProjectModal from './components/NewProjectModal';
import ImportProjectModal from './components/ImportProjectModal';

function App() {
  const [projects, setProjects] = useState<ProjectConfig[]>([]);
  const [removedDefaults, setRemovedDefaults] = useState<ProjectConfig[]>([]);
  const [statuses, setStatuses] = useState<Record<string, ProjectStatus>>({});
  const [showNewProject, setShowNewProject] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const loadProjects = useCallback(() => {
    setProjects(getProjects());
    const removedIds = getRemovedDefaultIds();
    setRemovedDefaults(DEFAULT_PROJECTS.filter(p => removedIds.includes(p.id)));
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const checkHealth = useCallback(async () => {
    const newStatuses: Record<string, ProjectStatus> = {};

    for (const project of projects) {
      const frontendHealthy = await checkPort(project.frontend.port);
      const backendHealthy = await checkEndpoint(
        `http://localhost:${project.backend.port}${project.backend.healthEndpoint}`
      );

      newStatuses[project.id] = {
        frontend: {
          running: frontendHealthy,
          healthy: frontendHealthy,
          lastCheck: new Date().toISOString(),
        },
        backend: {
          running: backendHealthy,
          healthy: backendHealthy,
          lastCheck: new Date().toISOString(),
        },
      };
    }

    setStatuses(newStatuses);
  }, [projects]);

  useEffect(() => {
    if (projects.length > 0) {
      checkHealth();
      const interval = setInterval(checkHealth, 5000);
      return () => clearInterval(interval);
    }
  }, [projects, checkHealth]);

  const handleRemoveProject = (projectId: string) => {
    removeProject(projectId);
    loadProjects();
  };

  const handleRestoreDefault = (projectId: string) => {
    restoreDefaultProject(projectId);
    loadProjects();
  };

  const handleProjectCreated = () => {
    loadProjects();
    setShowNewProject(false);
  };

  const handleProjectImported = () => {
    loadProjects();
    setShowImport(false);
  };

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">devLLM</h1>
            <p className="text-slate-400 mt-1">AI-Assisted Development Launcher</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowImport(true)}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
            >
              Import
            </button>
            <button
              onClick={() => setShowNewProject(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              + New Project
            </button>
          </div>
        </div>

        {projects.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🚀</div>
            <h2 className="text-xl font-semibold text-white mb-2">No projects yet</h2>
            <p className="text-slate-400 mb-6">Create a new project or import an existing one</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setShowImport(true)}
                className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
              >
                Import Existing
              </button>
              <button
                onClick={() => setShowNewProject(true)}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Create Project
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                status={statuses[project.id]}
                onRemove={() => handleRemoveProject(project.id)}
              />
            ))}
            {/* Restore Removed Defaults */}
            {removedDefaults.map((project) => (
              <div
                key={project.id}
                onClick={() => handleRestoreDefault(project.id)}
                className="rounded-xl p-6 border-2 border-dashed border-yellow-700 hover:border-yellow-500 cursor-pointer transition-all duration-300 hover:bg-yellow-800/10 flex flex-col items-center justify-center min-h-[200px]"
              >
                <div className="text-4xl text-yellow-600 mb-2">↺</div>
                <div className="text-yellow-500 font-medium">Restore {project.name}</div>
                <div className="text-yellow-600/60 text-sm mt-1">Click to re-add</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showNewProject && (
        <NewProjectModal
          onClose={() => setShowNewProject(false)}
          onCreated={handleProjectCreated}
        />
      )}

      {showImport && (
        <ImportProjectModal
          onClose={() => setShowImport(false)}
          onImported={handleProjectImported}
        />
      )}
    </div>
  );
}

async function checkPort(port: number): Promise<boolean> {
  try {
    // Try localhost first (what Vite binds to by default)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    await fetch(`http://localhost:${port}`, {
      method: 'GET',
      mode: 'no-cors',
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return true;
  } catch {
    return false;
  }
}

async function checkEndpoint(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'GET' });
    return response.ok;
  } catch {
    return false;
  }
}

export default App;
