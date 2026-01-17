import { useState } from 'react';
import styles from '../../styles/components/ResearchPanel.module.css';
import { User, Globe, StickyNote, X, PenTool } from 'lucide-react';

interface ResearchPanelProps {
  activeTab: string;
  onClose: () => void;
}

export default function ResearchPanel({ activeTab, onClose }: ResearchPanelProps) {
  // Internal tab state if user switches within panel
  const [currentTab, setCurrentTab] = useState(activeTab);

  const getTitle = () => {
    switch(currentTab) {
      case 'character': return 'Character Sheet';
      case 'world': return 'World Building';
      case 'plot': return 'Plot Board';
      case 'scrap': return 'Scratchpad';
      default: return 'Research';
    }
  };

  const getIcon = () => {
    switch(currentTab) {
      case 'character': return <User size={16}/>;
      case 'world': return <Globe size={16}/>;
      case 'plot': return <PenTool size={16}/>;
      case 'scrap': return <StickyNote size={16}/>;
      default: return <User size={16}/>;
    }
  };

  return (
    <div className={styles.panelContainer}>
      <div className={styles.header}>
        <div className={styles.title}>
          {getIcon()}
          <span>{getTitle()}</span>
        </div>
        <button className={styles.closeButton} onClick={onClose} title="Close Split View">
          <X size={18} />
        </button>
      </div>

      <div className={styles.tabBar}>
        <div className={`${styles.tab} ${currentTab === 'character' ? styles.active : ''}`} onClick={() => setCurrentTab('character')}>Characters</div>
        <div className={`${styles.tab} ${currentTab === 'world' ? styles.active : ''}`} onClick={() => setCurrentTab('world')}>World</div>
        <div className={`${styles.tab} ${currentTab === 'plot' ? styles.active : ''}`} onClick={() => setCurrentTab('plot')}>Plot</div>
      </div>

      <div className={styles.content}>
        {currentTab === 'character' && <CharacterSheet />}
        {currentTab === 'world' && <div className={styles.formGroup}><label className={styles.label}>World Name</label><input className={styles.input} placeholder="e.g. Middle-earth"/></div>}
        {currentTab === 'plot' && <div style={{color: 'var(--text-tertiary)'}}>Plot Board Placeholder</div>}
      </div>
    </div>
  );
}

function CharacterSheet() {
  return (
    <div className={styles.sheetForm}>
      <div style={{display:'flex', gap: 16}}>
        <div className={styles.formGroup} style={{flex:1}}>
          <label className={styles.label}>Name</label>
          <input className={styles.input} placeholder="Character Name" defaultValue="카이란" />
        </div>
        <div className={styles.formGroup} style={{flex:1}}>
          <label className={styles.label}>Role</label>
          <input className={styles.input} placeholder="Protagonist, Antagonist..." defaultValue="황태자 (Protagonist)" />
        </div>
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>One-Line Description</label>
        <input className={styles.input} defaultValue="냉혈한 황태자, 붉은 눈의 소유자." />
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>Appearance</label>
        <textarea className={`${styles.input} ${styles.textarea}`} defaultValue="키가 크고 마른 체형. 창백한 피부에 대조되는 붉은 눈동자. 항상 검은 제복을 입고 다닌다." />
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>Personality</label>
        <textarea className={`${styles.input} ${styles.textarea}`} defaultValue="감정을 잘 드러내지 않으며, 모든 것을 이성적으로 판단하려 한다. 하지만 엘리제 앞에서는 종종 평정심을 잃는다." />
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>Background / Backstory</label>
        <textarea className={`${styles.input} ${styles.textarea}`} style={{minHeight: 200}} defaultValue={`제국의 제1황자. 어릴 적 저주를 받아 감정을 느끼지 못한다는 소문이 있다. 
붉은 눈은 황족의 상징이지만, 그 농도가 짙어 "피의 황자"라 불린다.

어머니는 그를 낳고 바로 사망했으며, 황제는 그를 불길하게 여겨 별궁에 유폐시켰다.
유모의 손에 자랐으나 유모마저 의문의 사고로 잃은 후, 그는 누구도 믿지 않게 되었다.`} />
      </div>
    </div>
  );
}
