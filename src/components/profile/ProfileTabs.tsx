import type { TabKey } from '../../types/profile';

interface ProfileTabsProps {
  activeTab: TabKey;
  setActiveTab: (tab: TabKey) => void;
}

const tabs: { key: TabKey; label: string }[] = [
  { key: 'overview', label: '프로필' },
  { key: 'inventory', label: '인벤토리' },
  { key: 'settings', label: '설정' },
];

export default function ProfileTabs({ activeTab, setActiveTab }: ProfileTabsProps) {
  return (
    <section className="profile-tabs">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          className={`profile-tab-button ${activeTab === tab.key ? 'active' : ''}`}
          onClick={() => setActiveTab(tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </section>
  );
}
