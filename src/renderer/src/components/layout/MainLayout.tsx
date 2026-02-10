import type { ReactNode } from 'react';
import WindowBar from './WindowBar';
import { PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { cn } from '../../../../shared/types/utils';
import { useUIStore } from '../../stores/uiStore';
import {
  TOOLTIP_SIDEBAR_COLLAPSE,
  TOOLTIP_SIDEBAR_EXPAND,
  TOOLTIP_CONTEXT_PANEL_COLLAPSE,
  TOOLTIP_CONTEXT_PANEL_EXPAND,
} from '../../../../shared/constants';

interface MainLayoutProps {
  children: ReactNode;
  sidebar?: ReactNode;
  contextPanel?: ReactNode;
}

export default function MainLayout({ children, sidebar, contextPanel }: MainLayoutProps) {
  const { isSidebarOpen, isContextOpen, setSidebarOpen, setContextOpen } = useUIStore();

  return (
    <div className="flex flex-col h-screen bg-app text-fg">
      <WindowBar />
      
      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar */}
        <div 
          className={cn(
            "w-(--sidebar-width) bg-sidebar border-r border-white/5 overflow-hidden flex flex-col transition-[width,opacity] duration-300 ease-in-out z-10",
            !isSidebarOpen && "w-0 border-r-0 opacity-0"
          )}
        >
          {sidebar}
        </div>

        {/* Main Content */}
        <main className="flex-1 flex flex-col bg-app relative min-w-0 z-0">
          <div className="flex items-center px-4 py-2 h-12 shrink-0">
             <button 
               className="bg-transparent border-none text-muted cursor-pointer p-2 rounded-md flex items-center justify-center transition-all hover:bg-active hover:text-fg"
               onClick={() => setSidebarOpen(!isSidebarOpen)}
               title={isSidebarOpen ? TOOLTIP_SIDEBAR_COLLAPSE : TOOLTIP_SIDEBAR_EXPAND}
             >
               {isSidebarOpen ? (
                 <PanelLeftClose className="icon-xl" />
               ) : (
                 <PanelLeftOpen className="icon-xl" />
               )}
             </button>
             
             <div className="flex-1" />

             <button 
               className="bg-transparent border-none text-muted cursor-pointer p-2 rounded-md flex items-center justify-center transition-all hover:bg-active hover:text-fg"
               onClick={() => setContextOpen(!isContextOpen)}
               title={isContextOpen ? TOOLTIP_CONTEXT_PANEL_COLLAPSE : TOOLTIP_CONTEXT_PANEL_EXPAND}
             >
               {isContextOpen ? (
                 <PanelRightClose className="icon-xl" />
               ) : (
                 <PanelRightOpen className="icon-xl" />
               )}
             </button>
          </div>
          
          <div className="flex-1 overflow-y-auto flex flex-col">
            {children}
          </div>
        </main>

        {/* Context Panel */}
        <div 
          className={cn(
            "w-(--panel-width) bg-panel border-l border-white/5 overflow-hidden flex flex-col shrink-0 min-w-0 transition-[width,opacity] duration-300 ease-in-out z-10",
            !isContextOpen && "w-0 border-l-0 opacity-0 pointer-events-none"
          )}
        >
           {contextPanel}
        </div>
      </div>
    </div>
  );
}
