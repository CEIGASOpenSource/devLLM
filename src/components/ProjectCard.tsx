import type { ProjectConfig, ProjectStatus } from '../types/project';

interface Props {
  project: ProjectConfig;
  status?: ProjectStatus;
  onRemove: () => void;
}

export default function ProjectCard({ project, status, onRemove }: Props) {
  const frontendOk = status?.frontend.healthy ?? false;
  const backendOk = status?.backend.healthy ?? false;
  const allHealthy = frontendOk && backendOk;

  const openInBrowser = () => {
    window.open(`http://127.0.0.1:${project.frontend.port}`, '_blank');
  };

  return (
    <div
      className="rounded-xl p-6 border-2 transition-all"
      style={{
        backgroundColor: `${project.color}15`,
        borderColor: `${project.color}40`
      }}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-2xl font-bold text-white">{project.name}</h2>
          <p className="text-slate-400 text-sm mt-1">{project.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`w-3 h-3 rounded-full ${allHealthy ? 'bg-green-500' : 'bg-red-500'}`}
          />
          <button
            onClick={onRemove}
            className="text-slate-500 hover:text-red-400 transition-colors ml-2"
            title="Remove project"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-slate-800/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-slate-400 text-sm font-medium">FRONTEND</span>
            <span className={`w-2 h-2 rounded-full ${frontendOk ? 'bg-green-500' : 'bg-red-500'}`} />
          </div>
          <div className="text-white font-mono">:{project.frontend.port}</div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-slate-400 text-sm font-medium">BACKEND</span>
            <span className={`w-2 h-2 rounded-full ${backendOk ? 'bg-green-500' : 'bg-red-500'}`} />
          </div>
          <div className="text-white font-mono">:{project.backend.port}</div>
        </div>
      </div>

      <button
        onClick={openInBrowser}
        disabled={!frontendOk}
        className={`w-full py-3 rounded-lg font-medium transition-colors ${
          frontendOk
            ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
            : 'bg-slate-700 text-slate-400 cursor-not-allowed'
        }`}
      >
        {frontendOk ? 'Open in Browser' : 'Start Services First'}
      </button>
    </div>
  );
}
