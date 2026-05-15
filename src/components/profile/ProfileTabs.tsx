import { NavLink } from 'react-router-dom';
import type { TabKey } from '../../types/profile';

interface ProfileTabsProps {
  currentTab: TabKey;
  isOwnProfile?: boolean;
  profileUserId?: string;
}

const tabs: { key: TabKey; label: string; ownPath: string; publicPath: (userId: string) => string; isPrivate?: boolean }[] = [
  { key: 'posts', label: '게시글', ownPath: '/mypage', publicPath: (userId) => `/profile/${userId}` },
  { key: 'activity', label: '활동', ownPath: '/mypage/activity', publicPath: (userId) => `/profile/${userId}/activity` },
  { key: 'saved', label: '저장', ownPath: '/mypage/saved', publicPath: () => '/mypage/saved', isPrivate: true },
  { key: 'inventory', label: '인벤토리', ownPath: '/mypage/inventory', publicPath: () => '/mypage/inventory', isPrivate: true },
];

export default function ProfileTabs({ currentTab, isOwnProfile = true, profileUserId = '' }: ProfileTabsProps) {
  const visibleTabs = tabs.filter((tab) => isOwnProfile || !tab.isPrivate);

  return (
    <nav className="profile-simple-tabs" aria-label="프로필 콘텐츠">
      {visibleTabs.map((tab) => (
        <NavLink
          key={tab.key}
          to={isOwnProfile ? tab.ownPath : tab.publicPath(profileUserId)}
          end={tab.key === 'posts'}
          className={`profile-simple-tab ${currentTab === tab.key ? 'active' : ''}`}
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
