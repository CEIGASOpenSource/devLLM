import type { ProjectConfig } from '../types/project';
import { PROJECTS as DEFAULT_PROJECTS } from '../types/project';

const STORAGE_KEY = 'devllm-projects';
const REMOVED_DEFAULTS_KEY = 'devllm-removed-defaults';

const COLORS = ['#8b5cf6', '#ec4899', '#f59e0b', '#06b6d4', '#84cc16', '#f43f5e', '#3b82f6', '#10b981'];

function getRemovedDefaults(): string[] {
  const stored = localStorage.getItem(REMOVED_DEFAULTS_KEY);
  if (stored) {
    try {
      return JSON.parse(stored) as string[];
    } catch {
      return [];
    }
  }
  return [];
}

export function getProjects(): ProjectConfig[] {
  const removedDefaults = getRemovedDefaults();
  const visibleDefaults = DEFAULT_PROJECTS.filter(p => !removedDefaults.includes(p.id));

  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      const custom = JSON.parse(stored) as ProjectConfig[];
      return [...visibleDefaults, ...custom];
    } catch {
      return visibleDefaults;
    }
  }
  return visibleDefaults;
}

export function addProject(project: ProjectConfig): void {
  const stored = localStorage.getItem(STORAGE_KEY);
  const custom: ProjectConfig[] = stored ? JSON.parse(stored) : [];
  custom.push(project);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(custom));
}

export function removeProject(projectId: string): void {
  // Check if it's a default project
  const isDefault = DEFAULT_PROJECTS.some(p => p.id === projectId);

  if (isDefault) {
    // Add to removed defaults list
    const removed = getRemovedDefaults();
    if (!removed.includes(projectId)) {
      removed.push(projectId);
      localStorage.setItem(REMOVED_DEFAULTS_KEY, JSON.stringify(removed));
    }
  } else {
    // Remove from custom projects
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const custom: ProjectConfig[] = JSON.parse(stored);
      const filtered = custom.filter(p => p.id !== projectId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    }
  }
}

export function restoreDefaultProject(projectId: string): void {
  const removed = getRemovedDefaults();
  const filtered = removed.filter(id => id !== projectId);
  localStorage.setItem(REMOVED_DEFAULTS_KEY, JSON.stringify(filtered));
}

export function getRemovedDefaultIds(): string[] {
  return getRemovedDefaults();
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
