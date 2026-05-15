import type { ReactNode } from 'react';
import { Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import '../../pages/MyPage.css';
import ProfileHero from './ProfileHero';
import ProfileTabs from './ProfileTabs';
import { useProfile } from '../../hooks/useProfile';
import type { TabKey } from '../../types/profile';

interface ProfilePageShellProps {
  currentTab: TabKey;
  profileUserId?: string;
  children: (context: {
    user: NonNullable<ReturnType<typeof useProfile>['user']>;
    myPosts: ReturnType<typeof useProfile>['myPosts'];
    bookmarks: ReturnType<typeof useProfile>['bookmarks'];
    isOwnProfile: boolean;
    openEditModal: () => void;
  }) => ReactNode;
}

export default function ProfilePageShell({ currentTab, profileUserId, children }: ProfilePageShellProps) {
  const navigate = useNavigate();
  const { user, myPosts, bookmarks, isOwnProfile, loadingProfile } = useProfile(profileUserId);

  if (loadingProfile) {
    return <div className="post-state">프로필을 불러오는 중입니다.</div>;
  }

  if (!user) {
    return (
      <div className="mypage-empty-state animate-fade-in">
        <Shield size={52} className="empty-icon" />
        <h2>프로필을 찾을 수 없어요</h2>
        <p>삭제되었거나 접근할 수 없는 사용자입니다.</p>
      </div>
    );
  }

  return (
    <div className="mypage-v6 profile-simple-page animate-fade-in">
      <div className="mypage-shell profile-simple-shell">
        <ProfileHero
          user={user}
          myPosts={myPosts}
          bookmarks={bookmarks}
          isOwnProfile={isOwnProfile}
          onEditProfile={() => navigate('/mypage/edit-profile')}
        />

        <ProfileTabs currentTab={currentTab} isOwnProfile={isOwnProfile} profileUserId={user.id} />

        {children({
          user,
          myPosts,
          bookmarks,
          isOwnProfile,
          openEditModal: () => navigate('/mypage/edit-profile'),
        })}
      </div>
    </div>
  );
}
