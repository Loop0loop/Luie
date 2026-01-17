import { useState } from 'react';
import styles from '../../styles/components/ContextPanel.module.css';
import { Search, ArrowLeft } from 'lucide-react';

// Enhanced Mock Data
interface InfoItem {
  id: string;
  name: string;
  desc: string;
  tags: string[];
  fullDesc?: string; // For detail view
}

const mockCharacters: InfoItem[] = [
  { 
    id: '1', name: '카이란', desc: '냉혈한 황태자, 붉은 눈의 소유자.', tags: ['Main', 'Royal'],
    fullDesc: '제국의 제1황자. 어릴 적 저주를 받아 감정을 느끼지 못한다는 소문이 있다. 붉은 눈은 황족의 상징이지만, 그 농도가 짙어 "피의 황자"라 불린다.\n\n주인공 엘리제와의 관계:\n처음에는 그녀를 경계하지만, 그녀의 약초학 지식이 자신의 저주를 완화시킬 수 있음을 알고 접근한다.' 
  },
  { 
    id: '2', name: '엘리제', desc: '회귀한 악녀, 약초학의 천재.', tags: ['Main', 'Protagonist'],
    fullDesc: '전생에서 황태자를 독살하려다 처형당한 악녀. 회귀 후에는 악행을 저지르지 않고 조용히 살려 하지만, 뛰어난 약초학 지식 때문에 황궁의 주목을 받게 된다.'
  },
];

const mockTerms: InfoItem[] = [
  { 
    id: '1', name: '마력 폭주', desc: '마법사가 감정을 제어하지 못할 때 발생.', tags: ['Magic', 'Danger'],
    fullDesc: '마법사의 신체 내 마나 회로가 과부하되어 발생하는 현상. 주로 극심한 스트레스나 분노가 원인이 된다. 폭주가 시작되면 주변의 모든 마나가 빨려 들어가며 대폭발을 일으킨다.' 
  },
  { 
    id: '2', name: '제국 아카데미', desc: '대륙 최고의 교육 기관.', tags: ['Location'],
    fullDesc: '수도에 위치한 400년 전통의 교육 기관. 귀족 자제들뿐만 아니라 평민 중에서도 재능 있는 자들을 장학생으로 선발한다.'
  },
];

type Tab = 'synopsis' | 'characters' | 'terms';

export default function ContextPanel() {
  const [activeTab, setActiveTab] = useState<Tab>('synopsis');
  const [searchText, setSearchText] = useState('');
  const [selectedItem, setSelectedItem] = useState<InfoItem | null>(null);

  // Filter based on search (simple)
  const filterList = (list: InfoItem[]) => {
    if (!searchText) return list;
    return list.filter(item => item.name.includes(searchText) || item.desc.includes(searchText));
  };

  const handleItemClick = (item: InfoItem) => {
    setSelectedItem(item);
  };

  const handleBack = () => {
    setSelectedItem(null);
  };

  return (
    <div className={styles.container}>
      {/* DETAIL VIEW OVERLAY */}
      {selectedItem && (
        <div className={styles.detailView}>
          <div className={styles.detailHeader}>
            <button className={styles.backButton} onClick={handleBack}>
              <ArrowLeft size={16} />
            </button>
            <div className={styles.detailTitle}>{selectedItem.name}</div>
          </div>
          <div className={styles.detailContent}>
            <div className={styles.detailSection}>
              <div className={styles.detailLabel}>Summary</div>
              <div className={styles.detailText}>{selectedItem.desc}</div>
            </div>
            
            <div className={styles.detailSection}>
              <div className={styles.detailLabel}>Tags</div>
               <div style={{display: 'flex', gap: 4, flexWrap: 'wrap'}}>
                  {selectedItem.tags.map(tag => (
                    <span key={tag} style={{
                      fontSize: 11, padding: '2px 6px', 
                      backgroundColor: 'var(--bg-sidebar)', borderRadius: 4,
                      color: 'var(--text-secondary)'
                    }}>#{tag}</span>
                  ))}
               </div>
            </div>

            <div className={styles.detailSection}>
              <div className={styles.detailLabel}>Detail Note</div>
              <div className={styles.detailText}>
                {selectedItem.fullDesc || "상세 설명이 없습니다."}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SEARCH TOOLBAR */}
      <div className={styles.toolbar}>
        <div className={styles.searchBarWrapper}>
          <Search size={14} className={styles.searchIcon} />
          <input 
            className={styles.searchBar} 
            placeholder="통합 검색..." 
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
      </div>

      {/* TABS */}
      <div className={styles.tabs}>
        <div 
          className={activeTab === 'synopsis' ? styles.tabActive : styles.tab}
          onClick={() => { setActiveTab('synopsis'); setSelectedItem(null); }}
        >
          시놉시스
        </div>
        <div 
          className={activeTab === 'characters' ? styles.tabActive : styles.tab}
          onClick={() => { setActiveTab('characters'); setSelectedItem(null); }}
        >
          캐릭터
        </div>
        <div 
          className={activeTab === 'terms' ? styles.tabActive : styles.tab}
          onClick={() => { setActiveTab('terms'); setSelectedItem(null); }}
        >
          고유명사
        </div>
      </div>

      <div className={styles.content}>
        {activeTab === 'synopsis' && (
          <>
            <div style={{marginBottom: 16}}>
              <div style={{fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4}}>
                작품 개요 (Synopsis)
              </div>
            </div>
            <textarea 
              className={styles.synopsisArea} 
              placeholder="여기에 시놉시스를 작성하세요..." 
              defaultValue="폭군 황태자를 길들이기 위해 3번의 회귀를 거친 엘리제..."
            />
          </>
        )}

        {activeTab === 'characters' && (
          <>
             {filterList(mockCharacters).map(item => (
              <div key={item.id} className={styles.card} onClick={() => handleItemClick(item)}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>{item.name}</div>
                </div>
                <div style={{fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8}}>
                  {item.desc}
                </div>
                <div style={{display: 'flex', gap: 4}}>
                  {item.tags.map(tag => (
                    <span key={tag} style={{fontSize: 10,  color: 'var(--text-tertiary)'}}>#{tag}</span>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}

        {activeTab === 'terms' && (
          <>
             {filterList(mockTerms).map(item => (
              <div key={item.id} className={styles.card} onClick={() => handleItemClick(item)}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>{item.name}</div>
                </div>
                <div style={{fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8}}>
                  {item.desc}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

