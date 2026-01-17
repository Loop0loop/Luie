
import { useState } from 'react';
import styles from '../../styles/components/ContextPanel.module.css';
import { Search } from 'lucide-react';

// Enhanced Mock Data
const mockCharacters = [
  { id: '1', name: '카이란', desc: '냉혈한 황태자, 붉은 눈의 소유자.', tags: ['Main', 'Royal'] },
  { id: '2', name: '엘리제', desc: '회귀한 악녀, 약초학의 천재.', tags: ['Main', 'Protagonist'] },
];

const mockTerms = [
  { id: '1', name: '마력 폭주', desc: '마법사가 감정을 제어하지 못할 때 발생.', tags: ['Magic', 'Danger'] },
  { id: '2', name: '제국 아카데미', desc: '대륙 최고의 교육 기관.', tags: ['Location'] },
];

type Tab = 'synopsis' | 'characters' | 'terms';

export default function ContextPanel() {
  const [activeTab, setActiveTab] = useState<Tab>('synopsis');
  const [searchText, setSearchText] = useState('');

  return (
    <div className={styles.container}>
      {/* Search is always visible for quick access, except maybe in Synopsis? 
          Let's keep it but disable or change placeholder. 
      */}
      <div className={styles.toolbar}>
        <div className={styles.searchBarWrapper}>
          <Search size={14} className={styles.searchIcon} />
          <input 
            className={styles.searchBar} 
            placeholder="통합 검색 (캐릭터, 설정, 메모...)" 
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.tabs}>
        <div 
          className={activeTab === 'synopsis' ? styles.tabActive : styles.tab}
          onClick={() => setActiveTab('synopsis')}
        >
          시놉시스
        </div>
        <div 
          className={activeTab === 'characters' ? styles.tabActive : styles.tab}
          onClick={() => setActiveTab('characters')}
        >
          캐릭터
        </div>
        <div 
          className={activeTab === 'terms' ? styles.tabActive : styles.tab}
          onClick={() => setActiveTab('terms')}
        >
          고유명사
        </div>
      </div>

      <div className={styles.content}>
        {activeTab === 'synopsis' && (
          <>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitle}>작품 개요 (Synopsis)</div>
              <div className={styles.sectionDesc}>
                이야기의 전체 흐름과 핵심 로그라인을 기록하세요.
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
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitle}>등장인물 (Characters)</div>
              <div className={styles.sectionDesc}>
                인물의 성격, 외모, 목표를 정의합니다.
              </div>
            </div>
            {mockCharacters.map(item => (
              <div key={item.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>{item.name}</div>
                </div>
                <div style={{fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8}}>
                  {item.desc}
                </div>
                <div className={styles.tags}>
                  {item.tags.map(tag => (
                    <span key={tag} className={styles.tag}>{tag}</span>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}

        {activeTab === 'terms' && (
          <>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitle}>세계관 설정 (World)</div>
              <div className={styles.sectionDesc}>
                마법, 지명, 제도 등 고유한 설정을 정리합니다.
              </div>
            </div>
            {mockTerms.map(item => (
              <div key={item.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>{item.name}</div>
                </div>
                <div style={{fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8}}>
                  {item.desc}
                </div>
                <div className={styles.tags}>
                  {item.tags.map(tag => (
                    <span key={tag} className={styles.tag}>{tag}</span>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

