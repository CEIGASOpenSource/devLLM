import type { ProjectConfig } from '../types/project';
import { PROJECTS as DEFAULT_PROJECTS } from '../types/project';

const STORAGE_KEY = 'devllm-projects';

const COLORS = ['#8b5cf6', '#ec4899', '#f59e0b', '#06b6d4', '#84cc16', '#f43f5e', '#3b82f6', '#10b981'];

export function getProjects(): ProjectConfig[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      const custom = JSON.parse(stored) as ProjectConfig[];
      return [...DEFAULT_PROJECTS, ...custom];
    } catch {
      return DEFAULT_PROJECTS;
    }
  }
  return DEFAULT_PROJECTS;
}

export function addProject(project: ProjectConfig): void {
  const stored = localStorage.getItem(STORAGE_KEY);
  const custom: ProjectConfig[] = stored ? JSON.parse(stored) : [];
  custom.push(project);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(custom));
}

export function removeProject(projectId: string): void {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    const custom: ProjectConfig[] = JSON.parse(stored);
    const filtered = custom.filter(p => p.id !== projectId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  }
}

export function getNextAvailablePorts(): { frontend: number; backend: number } {
  const projects = getProjects();
  const usedFrontend = projects.map(p => p.frontend.port);
  const usedBackend = projects.map(p => p.backend.port);

  let frontendPort = 5173;
  while (usedFrontend.includes(frontendPort)) frontendPort++;

  let backendPort = 8000;
  while (usedBackend.includes(backendPort)) backendPort++;

  return { frontend: frontendPort, backend: backendPort };
}

export function getRandomColor(): string {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}
