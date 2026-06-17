import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';

export interface Project {
  id: string;
  code: string;
  name: string;
  status: string;
  start_date?: string;
  end_date?: string;
  target_notes?: string;
}

interface ProjectContextType {
  activeProject: Project | null;
  setActiveProject: (project: Project | null) => void;
  availableProjects: Project[];
  refreshProjects: () => Promise<void>;
  loading: boolean;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeProject, setActiveProjectState] = useState<Project | null>(null);
  const [availableProjects, setAvailableProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, code, name, status, start_date, end_date, target_notes')
        .neq('status', 'Closed')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setAvailableProjects(data || []);

      // Restore active project from local storage
      const savedProjectId = localStorage.getItem('sbs_active_project_id');
      if (savedProjectId && data) {
        const found = data.find(p => p.id === savedProjectId);
        if (found) {
          setActiveProjectState(found);
        } else if (data.length > 0) {
          // Fallback to latest project
          setActiveProjectState(data[0]);
          localStorage.setItem('sbs_active_project_id', data[0].id);
        }
      } else if (data && data.length > 0) {
        // Default to the most recent active project
        setActiveProjectState(data[0]);
        localStorage.setItem('sbs_active_project_id', data[0].id);
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshProjects();
  }, []);

  const setActiveProject = (project: Project | null) => {
    setActiveProjectState(project);
    if (project) {
      localStorage.setItem('sbs_active_project_id', project.id);
    } else {
      localStorage.removeItem('sbs_active_project_id');
    }
  };

  return (
    <ProjectContext.Provider value={{ activeProject, setActiveProject, availableProjects, refreshProjects, loading }}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = (): ProjectContextType => {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};
