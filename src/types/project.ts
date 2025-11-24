export interface ProjectConfig {
  id: string;
  name: string;
  description: string;
  color: string;
  frontend: {
    port: number;
    path: string;
    command: string;
    env?: Record<string, string>;
  };
  backend: {
    port: number;
    path: string;
    command: string;
    healthEndpoint: string;
    env?: Record<string, string>;
  };
}

export interface ServiceStatus {
  running: boolean;
  healthy: boolean;
  lastCheck: string | null;
}

export interface ProjectStatus {
  frontend: ServiceStatus;
  backend: ServiceStatus;
}

// Empty by default - users create their own projects
export const PROJECTS: ProjectConfig[] = [];
