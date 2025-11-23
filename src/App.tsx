import { useState, useEffect, useCallback } from 'react';
import type { ProjectConfig, ProjectStatus } from './types/project';
import { getProjects, removeProject } from './store/projectStore';
import ProjectCard from './components/ProjectCard';
import NewProjectModal from './components/NewProjectModal';

function App() {
  const [projects, setProjects] = useState<ProjectConfig[]>([]);
  const [statuses, setStatuses] = useState<Record<string, ProjectStatus>>({});
  const [showNewProject, setShowNewProject] = useState(false);

  const loadProjects = useCallback(() => {
    setProjects(getProjects());
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const checkHealth = useCallback(async () => {
    const newStatuses: Record<string, ProjectStatus> = {};

    for (const project of projects) {
      const frontendHealthy = await checkPort(project.frontend.port);
      const backendHealthy = await checkEndpoint(
        `http://127.0.0.1:${project.backend.port}${project.backend.healthEndpoint}`
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

  const handleProjectCreated = () => {
    loadProjects();
    setShowNewProject(false);
  };

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">devLLM</h1>
            <p className="text-slate-400 mt-1">AI-Assisted Development Launcher</p>
          </div>
          <button
            onClick={() => setShowNewProject(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            + New Project
          </button>
        </div>

        {projects.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🚀</div>
            <h2 className="text-xl font-semibold text-white mb-2">No projects yet</h2>
            <p className="text-slate-400 mb-6">Create your first project to get started</p>
            <button
              onClick={() => setShowNewProject(true)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Create Project
            </button>
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
          </div>
        )}
      </div>

      {showNewProject && (
        <NewProjectModal
          onClose={() => setShowNewProject(false)}
          onCreated={handleProjectCreated}
        />
      )}
    </div>
  );
}

async function checkPort(port: number): Promise<boolean> {
  try {
    await fetch(`http://127.0.0.1:${port}`, {
      method: 'HEAD',
      mode: 'no-cors'
    });
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
