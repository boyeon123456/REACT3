import { Activity, BadgeCheck, ChevronRight, Sparkles, Wand2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { User } from '../../store/authStore';
import { typeLabels, type InventoryItem, type PostItem } from '../../types/profile';

interface ProfileContext {
  user: User;
  profileNameColor?: string;
  profileBackground?: string;
  avatarFrameColor?: string;
  featuredBadge?: InventoryItem;
}

interface ProfileActivityProps {
  myPosts: PostItem[];
  equippedItems: InventoryItem[];
  featuredBadge?: InventoryItem;
  profileContext: ProfileContext;
}

export default function ProfileActivity({
  myPosts,
  equippedItems,
  featuredBadge,
  profileContext,
}: ProfileActivityProps) {
  const navigate = useNavigate();

  const spotlightCards = [
    {
      title: '상태 메시지',
      description: profileContext.user.statusMessage || '짧은 한 줄이 프로필 첫인상을 만듭니다.',
      icon: Wand2,
    },
    {
      title: '대표 배지',
      description: featuredBadge?.name || '대표 배지를 아직 선택하지 않았습니다.',
      icon: BadgeCheck,
    },
    {
      title: '장착 아이템',
      description: equippedItems.length > 0 ? `${equippedItems.length}개 사용 중` : '아직 장착한 아이템이 없습니다.',
      icon: Sparkles,
    },
  ];

  return (
    <div className="content-stack">
      <article className="content-card insta-feed-card">
        <div className="section-heading">
          <div>
            <p className="section-kicker">RECENT POSTS</p>
            <h3>최근 활동</h3>
          </div>
          <button type="button" className="inline-action" onClick={() => navigate('/write')}>
            글 작성
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="activity-list">
          {myPosts.length === 0 ? (
            <div className="empty-panel large">
              <Sparkles size={18} />
              <span>아직 작성한 게시글이 없어요. 첫 글로 프로필 피드를 채워보세요.</span>
            </div>
          ) : (
            myPosts.slice(0, 6).map((post) => (
              <button key={post.id} type="button" className="activity-row insta-activity-row" onClick={() => navigate(`/post/${post.id}`)}>
                <div className="activity-icon">
                  <Activity size={16} />
                </div>
                <div className="activity-copy">
                  <p>{post.board || '게시판'}에서 남긴 최근 기록</p>
                  <strong>{post.title}</strong>
                </div>
                <span className="activity-date">
                  {post.created_at ? new Date(post.created_at).toLocaleDateString('ko-KR') : ''}
                </span>
              </button>
            ))
          )}
        </div>
      </article>

      <article className="content-card compact profile-snapshot-card">
        <div className="section-heading">
          <div>
            <p className="section-kicker">PROFILE SNAPSHOT</p>
            <h3>프로필 스냅샷</h3>
          </div>
          <button type="button" className="inline-action" onClick={() => navigate('/shop')}>
            상점 보기
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="showcase-grid">
          <div className="showcase-preview insta-preview-card" style={{ background: profileContext.profileBackground || 'var(--gradient)' }}>
            <div
              className="showcase-avatar"
              style={{ borderColor: profileContext.avatarFrameColor || 'rgba(255,255,255,0.82)' }}
            >
              {profileContext.user.photoURL ? (
                <img src={profileContext.user.photoURL} alt={profileContext.user.name} />
              ) : (
                <div className="showcase-fallback">{profileContext.user.name[0]}</div>
              )}
            </div>
            <div className="showcase-copy">
              <strong style={{ color: profileContext.profileNameColor || '#fff' }}>{profileContext.user.name}</strong>
              <span>{profileContext.user.statusMessage || '한 줄 소개로 프로필 분위기를 채워보세요.'}</span>
              {featuredBadge && <em>{featuredBadge.name}</em>}
            </div>
          </div>

          <div className="showcase-side">
            {spotlightCards.map((card) => {
              const Icon = card.icon;

              return (
                <article key={card.title} className="showcase-note spotlight-note">
                  <span className="showcase-note-icon">
                    <Icon size={16} />
                  </span>
                  <div>
                    <strong>{card.title}</strong>
                    <p>{card.description}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </article>

      <article className="content-card compact equipped-items-card">
        <div className="section-heading">
          <div>
            <p className="section-kicker">EQUIPPED ITEMS</p>
            <h3>현재 적용 중인 스타일</h3>
          </div>
        </div>

        {equippedItems.length === 0 ? (
          <div className="empty-panel">
            <Sparkles size={18} />
            <span>장착한 아이템이 없어요. 상점이나 인벤토리에서 스타일을 적용해 보세요.</span>
          </div>
        ) : (
          <div className="equipped-grid">
            {equippedItems.map((item) => (
              <div key={item.id} className="equipped-chip">
                <span>{typeLabels[item.type]}</span>
                <strong>{item.name}</strong>
              </div>
            ))}
          </div>
        )}
      </article>
    </div>
  );
}
