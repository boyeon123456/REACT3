import { ChevronDown, PencilLine } from 'lucide-react';
import type { BookmarkItem, PostItem } from '../../types/profile';
import { useAuthStore, type User } from '../../store/authStore';
import { getVisibleSchoolLabel } from '../../lib/schoolPrivacy';

interface ProfileHeroProps {
  user: User;
  myPosts: PostItem[];
  bookmarks: BookmarkItem[];
  isOwnProfile?: boolean;
  onEditProfile?: () => void;
}

export default function ProfileHero({ user, myPosts, bookmarks, isOwnProfile = true, onEditProfile }: ProfileHeroProps) {
  const viewer = useAuthStore((state) => state.user);
  const handle = user.handle || user.id.slice(0, 8);
  const schoolLabel = user.isStudent ? getVisibleSchoolLabel(user, viewer) : '';
  const intro = user.bio || user.statusMessage || '짧은 소개를 추가해 보세요.';

  return (
    <section className="profile-simple-hero" aria-label="프로필">
      <div className="profile-handle-row">
        <strong>@{handle}</strong>
        <ChevronDown size={16} />
      </div>

      <div className="profile-simple-top">
        <div className="profile-avatar-wrap">
          <div className="profile-simple-avatar" aria-hidden="true">
            {user.photoURL ? <img src={user.photoURL} alt="" /> : <span>{user.name?.[0] || '?'}</span>}
          </div>

          {isOwnProfile && onEditProfile && (
            <button type="button" className="profile-edit-button" onClick={onEditProfile} aria-label="프로필 수정">
              <PencilLine size={15} />
              설정
            </button>
          )}
        </div>

        <div className="profile-info-panel">
          <div className="profile-identity-row">
            <div className="profile-simple-copy">
              <h1>{user.name}</h1>
            </div>
            {schoolLabel && <p className="profile-simple-school">{schoolLabel}</p>}
          </div>

          <div className="profile-simple-stats" aria-label="프로필 통계">
            <div>
              <strong>{myPosts.length.toLocaleString()}</strong>
              <span>게시글</span>
            </div>
            <div>
              <strong>{(isOwnProfile ? bookmarks.length : user.level || 1).toLocaleString()}</strong>
              <span>{isOwnProfile ? '저장' : '레벨'}</span>
            </div>
            <div>
              <strong>{(user.points || 0).toLocaleString()}</strong>
              <span>포인트</span>
            </div>
          </div>
        </div>

        <p className="profile-simple-intro">{intro}</p>
      </div>
    </section>
  );
}
