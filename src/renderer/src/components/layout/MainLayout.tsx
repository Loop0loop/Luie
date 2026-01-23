import type { ReactNode} from 'react';
import { useState } from 'react';
import WindowBar from './WindowBar';
import styles from '../../styles/layout/MainLayout.module.css';
import { PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from 'lucide-react';
import {
  ICON_SIZE_XL,
  TOOLTIP_SIDEBAR_COLLAPSE,
  TOOLTIP_SIDEBAR_EXPAND,
  TOOLTIP_CONTEXT_PANEL_COLLAPSE,
  TOOLTIP_CONTEXT_PANEL_EXPAND,
} from '../../../shared/constants';

interface MainLayoutProps {
  children: ReactNode;
  sidebar?: ReactNode;
  contextPanel?: ReactNode;
}

export default function MainLayout({ children, sidebar, contextPanel }: MainLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isContextOpen, setIsContextOpen] = useState(false); // Default to closed for max space

  return (
    <div className={styles.layoutContainer}>
      <WindowBar />
      
      {/* Toggles - Positioned absolute or relative to content? 
          Let's put them in the main area top corners for visibility 
          or integrated into the panels. 
          For "Monkey Proof", let's put them on the main content edges.
      */}
      
      <div className={styles.mainArea}>
        {/* Sidebar */}
        <div 
          className={styles.sidebarWrapper} 
          data-open={isSidebarOpen}
        >
          {sidebar}
        </div>

        {/* Main Content */}
        <main className={styles.content}>
          <div className={styles.topControls}>
             <button 
               className={styles.toggleButton}
               onClick={() => setIsSidebarOpen(!isSidebarOpen)}
               title={isSidebarOpen ? TOOLTIP_SIDEBAR_COLLAPSE : TOOLTIP_SIDEBAR_EXPAND}
             >
               {isSidebarOpen ? (
                 <PanelLeftClose size={ICON_SIZE_XL} />
               ) : (
                 <PanelLeftOpen size={ICON_SIZE_XL} />
               )}
             </button>
             
             <div className={styles.spacer} />

             <button 
               className={styles.toggleButton}
               onClick={() => setIsContextOpen(!isContextOpen)}
               title={isContextOpen ? TOOLTIP_CONTEXT_PANEL_COLLAPSE : TOOLTIP_CONTEXT_PANEL_EXPAND}
             >
               {isContextOpen ? (
                 <PanelRightClose size={ICON_SIZE_XL} />
               ) : (
                 <PanelRightOpen size={ICON_SIZE_XL} />
               )}
             </button>
          </div>
          
          <div className={styles.editorContainer}>
            {children}
          </div>
        </main>

        {/* Context Panel */}
        <div 
          className={styles.contextWrapper}
          data-open={isContextOpen}
        >
           {contextPanel}
        </div>
      </div>
    </div>
  );
}
