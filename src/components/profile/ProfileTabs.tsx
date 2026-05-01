import { LayoutDashboard, PackageOpen, Settings, type LucideIcon } from 'lucide-react';
import type { TabKey } from '../../types/profile';

interface ProfileTabsProps {
  activeTab: TabKey;
  setActiveTab: (tab: TabKey) => void;
}

const tabs: { key: TabKey; label: string; icon: LucideIcon }[] = [
  { key: 'overview', label: '프로필', icon: LayoutDashboard },
  { key: 'inventory', label: '인벤토리', icon: PackageOpen },
  { key: 'settings', label: '설정', icon: Settings },
];

export default function ProfileTabs({ activeTab, setActiveTab }: ProfileTabsProps) {
  return (
    <section className="profile-tabs" role="tablist" aria-label="프로필 탭">
      {tabs.map((tab) => {
        const Icon = tab.icon;

        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.key}
            className={`profile-tab-button ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <Icon size={17} />
            {tab.label}
          </button>
        );
      })}
    </section>
  );
}
