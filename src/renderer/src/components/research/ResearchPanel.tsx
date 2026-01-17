import { useState } from 'react';
import styles from '../../styles/components/ResearchPanel.module.css';
import { User, Globe, StickyNote, X, PenTool, Layout, Image, GitBranch, Plus, ArrowLeft } from 'lucide-react';

interface ResearchPanelProps {
  activeTab: string; // 'character' | 'world' | 'scrap'
  onClose: () => void;
}

type WorldTab = 'synopsis' | 'mindmap' | 'images' | 'plot';

export default function ResearchPanel({ activeTab, onClose }: ResearchPanelProps) {
  
  // Header Title Logic
  const getTitle = () => {
    switch(activeTab) {
      case 'character': return 'Character Management';
      case 'world': return 'World Construction';
      case 'scrap': return 'Material Scrap';
      default: return 'Research';
    }
  };

  const getIcon = () => {
    switch(activeTab) {
      case 'character': return <User size={18}/>;
      case 'world': return <Globe size={18}/>;
      case 'scrap': return <StickyNote size={18}/>;
      default: return <User size={18}/>;
    }
  };

  return (
    <div className={styles.panelContainer}>
      <div className={styles.header}>
        <div className={styles.title}>
          {getIcon()}
          <span>{getTitle()}</span>
        </div>
        <button className={styles.closeButton} onClick={onClose} title="Close Panel">
          <X size={18} />
        </button>
      </div>

      {/* NO Top Level Tabs - Direct Content Based on Sidebar Selection */}
      <div className={styles.content}>
        {activeTab === 'character' && <CharacterManager />}
        {activeTab === 'world' && <WorldSection />}
        {activeTab === 'scrap' && <ScrapSection />}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                            CHARACTER SECTION                               */
/* -------------------------------------------------------------------------- */

function CharacterManager() {
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);

  // Mock List
  const characters = [
    { id: '1', name: '카이란 알렉산더', role: '주인공 (남)', color: '#FF5555' },
    { id: '2', name: '엘리제 드 클로로', role: '주인공 (여)', color: '#55AAFF' },
  ];

  if (selectedCharacterId) {
    return (
      <div>
        <div className={styles.detailHeader}>
          <div className={styles.backButton} onClick={() => setSelectedCharacterId(null)}>
            <ArrowLeft size={16}/>
          </div>
          <span style={{fontWeight: 600}}>
            {characters.find(c => c.id === selectedCharacterId)?.name || 'New Character'}
          </span>
        </div>
        <CharacterProfile />
      </div>
    );
  }

  return (
    <div className={styles.characterListContainer}>
      {characters.map(char => (
        <div key={char.id} className={styles.characterCard} onClick={() => setSelectedCharacterId(char.id)}>
          <div className={styles.characterImagePlaceholder} style={{borderBottom: `4px solid ${char.color}`}}>
            <User size={32} opacity={0.5}/>
          </div>
          <div className={styles.characterInfo}>
            <div className={styles.characterName}>{char.name}</div>
            <div className={styles.characterRole}>{char.role}</div>
          </div>
        </div>
      ))}
      
      {/* ADD BUTTON */}
      <div className={styles.addCharacterCard} onClick={() => setSelectedCharacterId('new')}>
        <Plus size={24} />
        <span>Add Character</span>
      </div>
    </div>
  );
}

function CharacterProfile() {
  return (
    <div>
      <div className={styles.sectionTitle}>기본 프로필 (Basic Profile)</div>
      <div className={styles.tableGrid}>
        {/* Row 1 */}
        <div className={styles.cellLabel}>이름</div>
        <div className={styles.cellValue}><input className={styles.cellValueInput} defaultValue="카이란 알렉산더" /></div>
        <div className={styles.cellLabel}>성별</div>
        <div className={styles.cellValue}><input className={styles.cellValueInput} defaultValue="남성" /></div>
        
        {/* Row 2 */}
        <div className={styles.cellLabel}>나이</div>
        <div className={styles.cellValue}><input className={styles.cellValueInput} defaultValue="24세" /></div>
        <div className={styles.cellLabel}>직업</div>
        <div className={styles.cellValue}><input className={styles.cellValueInput} defaultValue="황태자, 마검사" /></div>

         {/* Row 3 */}
        <div className={styles.cellLabel}>출신</div>
        <div className={styles.cellValue}><input className={styles.cellValueInput} defaultValue="아스테라 제국" /></div>
        <div className={styles.cellLabel}>거주지</div>
        <div className={styles.cellValue}><input className={styles.cellValueInput} defaultValue="황궁 별관" /></div>
      </div>
      
      <div className={styles.sectionTitle}>특징 (Traits)</div>
      <div className={styles.tableGrid} style={{gridTemplateColumns: '100px 1fr'}}>
        <div className={styles.cellLabel}>성격 (장점)</div>
        <div className={styles.cellValue}><input className={styles.cellValueInput} defaultValue="냉철함, 결단력, 뛰어난 지략" /></div>
        <div className={styles.cellLabel}>성격 (단점)</div>
        <div className={styles.cellValue}><input className={styles.cellValueInput} defaultValue="타인에 대한 불신, 감정 표현 서툶" /></div>
        <div className={styles.cellLabel}>좋아하는 것</div>
        <div className={styles.cellValue}><input className={styles.cellValueInput} defaultValue="고요한 밤, 검술 수련, 홍차" /></div>
        <div className={styles.cellLabel}>싫어하는 것</div>
        <div className={styles.cellValue}><input className={styles.cellValueInput} defaultValue="소란스러운 연회, 아첨하는 귀족들" /></div>
      </div>

      <div className={styles.sectionTitle}>서사 (Narrative)</div>
      <div className={styles.tableGrid} style={{gridTemplateColumns: '100px 1fr'}}>
         <div className={styles.cellLabel}>과거 배경</div>
         <div className={styles.cellValue}><textarea className={styles.cellValueInput} style={{minHeight: 60}} defaultValue="어머니를 일찍 여의고 계모 황후의 견제 속에서 자람. 살아남기 위해 검을 잡았다." /></div>
         <div className={styles.cellLabel}>목표 (야심)</div>
         <div className={styles.cellValue}><input className={styles.cellValueInput} defaultValue="황제에게 복수하고 진정한 황제가 되는 것" /></div>
         <div className={styles.cellLabel}>트라우마</div>
         <div className={styles.cellValue}><input className={styles.cellValueInput} defaultValue="어린 시절 갇혀 지냈던 별궁의 어둠" /></div>
      </div>
      
       <div className={styles.sectionTitle}>외형 (Appearance)</div>
       <div className={styles.tableGrid} style={{gridTemplateColumns: '100px 1fr 100px 1fr'}}>
        <div className={styles.cellLabel}>신장</div>
        <div className={styles.cellValue}><input className={styles.cellValueInput} defaultValue="188cm" /></div>
        <div className={styles.cellLabel}>체형</div>
        <div className={styles.cellValue}><input className={styles.cellValueInput} defaultValue="당당하고 근육질" /></div>
        <div className={styles.cellLabel}>헤어</div>
        <div className={styles.cellValue}><input className={styles.cellValueInput} defaultValue="흑발, 약간 헝크러짐" /></div>
        <div className={styles.cellLabel}>눈</div>
        <div className={styles.cellValue}><input className={styles.cellValueInput} defaultValue="적안 (황족의 상징)" /></div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                WORLD TAB                                   */
/* -------------------------------------------------------------------------- */

function WorldSection() {
  const [subTab, setSubTab] = useState<WorldTab>('synopsis');

  return (
    <div>
      <div className={styles.subNavBar}>
        <div className={`${styles.subTab} ${subTab === 'synopsis' ? styles.active : ''}`} onClick={() => setSubTab('synopsis')}>Synopsis</div>
        <div className={`${styles.subTab} ${subTab === 'mindmap' ? styles.active : ''}`} onClick={() => setSubTab('mindmap')}>Mindmap</div>
        <div className={`${styles.subTab} ${subTab === 'images' ? styles.active : ''}`} onClick={() => setSubTab('images')}>Images</div>
        <div className={`${styles.subTab} ${subTab === 'plot' ? styles.active : ''}`} onClick={() => setSubTab('plot')}>Plot Board</div>
      </div>

      {subTab === 'synopsis' && (
        <>
          <div className={styles.sectionTitle}>Logline (로그라인)</div>
           <textarea className={styles.cellValueInput} style={{border: '1px solid var(--border-default)', padding: 12, borderRadius:4, width:'100%', marginBottom:16}} defaultValue="폭군 황태자를 길들이기 위해 3번의 회귀를 거친 엘리제. 이번 생은 다를 수 있을까?" />
          
          <div className={styles.sectionTitle}>Synopsis (줄거리)</div>
          <textarea className={styles.cellValueInput} style={{border: '1px solid var(--border-default)', padding: 12, borderRadius:4, width:'100%', height: 200}} placeholder="기승전결 구조로 작성해보세요." />
        </>
      )}

      {subTab === 'mindmap' && (
        <div className={styles.placeholderArea}>
          <GitBranch size={48} />
          <span>Mindmap Canvas Area</span>
          <span style={{fontSize: 12}}>Drag to connect Characters, Locations, and Events</span>
        </div>
      )}

      {subTab === 'images' && (
        <div className={styles.placeholderArea}>
           <Image size={48} />
           <span>Reference Image Gallery</span>
        </div>
      )}

      {subTab === 'plot' && <PlotBoard />}
    </div>
  );
}

function PlotBoard() {
   const columns = [
    { title: 'Idea (발상)', cards: ['결말 반전 아이디어', '서브 남주 등장 시점?'] },
    { title: 'Structuring (구조화)', cards: ['1막: 회귀와 자각', '2막: 갈등의 시작', '3막: 절정'] },
    { title: 'Plotting (플롯)', cards: ['1화: 프롤로그', '2화: 만남', '3화: 계약'] },
    { title: 'Visualization (시각화)', cards: ['주인공 의상 컨셉', '황궁 지도 스케치'] }
  ];

  return (
    <div className={styles.plotBoard}>
      {columns.map((col, idx) => (
        <div key={idx} className={styles.plotColumn}>
          <div className={styles.columnHeader}>{col.title}</div>
          {col.cards.map((card, cIdx) => (
             <div key={cIdx} className={styles.plotCard}>{card}</div>
          ))}
        </div>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                SCRAP TAB                                   */
/* -------------------------------------------------------------------------- */

function ScrapSection() {
  return (
    <div>
      <div className={styles.sectionTitle}>Material Scrap</div>
      <div style={{display:'flex', gap: 12, marginBottom: 16}}>
        <input className={styles.cellValueInput} style={{border: '1px solid var(--border-default)', borderRadius: 4, flex: 1}} placeholder="Title of your note..." />
        <button style={{padding: '0 16px', backgroundColor: 'var(--text-accent)', color: 'white', borderRadius: 4, border: 'none', cursor:'pointer'}}>Add</button>
      </div>
      <textarea 
        className={styles.cellValueInput} 
        style={{height: 400, border: '1px solid var(--border-default)', padding: 12, borderRadius: 4}} 
        placeholder="Paste links, snippets, research notes, or ideas here..." 
      />
    </div>
  );
}
