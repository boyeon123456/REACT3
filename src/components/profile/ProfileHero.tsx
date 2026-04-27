import { Camera, Settings, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { typeLabels } from '../../types/profile';
import type { InventoryItem } from '../../types/profile';

import type { User } from '../../store/authStore';

interface ProfileHeroProps {
  user: User;
  levelProgress: {
    currentLevel: number;
    nextLabel: string;
    progress: number;
    remaining: number;
  };
  equippedItems: InventoryItem[];
  completionPercent: number;
  completionCount: number;
  profileBackground?: string;
  profileNameColor?: string;
  avatarFrameColor?: string;
  openEditModal: () => void;
}

export default function ProfileHero({
  user,
  levelProgress,
  equippedItems,
  completionPercent,
  completionCount,
  profileNameColor,
  avatarFrameColor,
  openEditModal,
}: ProfileHeroProps) {
  const navigate = useNavigate();

  return (
    <section className="profile-hero-card">
      <div className="profile-hero-main">
        <div
          className="profile-avatar-shell"
          style={{
            borderColor: avatarFrameColor || 'rgba(255,255,255,0.9)',
            boxShadow: avatarFrameColor ? `0 0 0 6px ${avatarFrameColor}22` : undefined,
          }}
        >
          {user.photoURL ? (
            <img src={user.photoURL} alt={user.name || 'User'} className="profile-avatar-image" />
          ) : (
            <div className="profile-avatar-fallback">{user.name ? user.name[0] : '?'}</div>
          )}
          <button type="button" className="avatar-edit-button" onClick={openEditModal}>
            <Camera size={16} />
          </button>
        </div>

        <div className="profile-hero-copy">
          <div className="profile-heading-row">
            <div>
              <p className="eyebrow">MY PROFILE</p>
              <h1 className="profile-title" style={{ color: profileNameColor || undefined }}>
                {user.name}
              </h1>
            </div>
            <span className="profile-handle">@{user.id.slice(0, 6)}</span>
          </div>

          <p className="profile-email">{user.email}</p>

          <div className="profile-meta-chips">
            <span className="meta-chip strong">
              Lv.{user.level} {user.role === 'admin' ? '운영진' : '학교 멤버'}
            </span>
            <span className="meta-chip highlight">💎 {(user.points || 0).toLocaleString()} P</span>
            <span className="meta-chip">
              {user.grade && user.class ? `${user.grade}학년 ${user.class}반` : '학년/반 미설정'}
            </span>
            {equippedItems.slice(0, 2).map((item) => (
              <span key={item.id} className="meta-chip subtle">
                {typeLabels[item.type]} 적용 중
              </span>
            ))}
          </div>

          <div className="level-progress-card">
            <div className="level-progress-top">
              <strong>레벨 진행도</strong>
              <span>
                {levelProgress.nextLabel === 'MAX LEVEL'
                  ? '최고 레벨 달성'
                  : `${levelProgress.remaining.toLocaleString()}P 남음`}
              </span>
            </div>
            <div className="level-progress-track">
              <div className="level-progress-fill" style={{ width: `${levelProgress.progress}%` }} />
            </div>
            <div className="level-progress-bottom">
              <span>Lv.{levelProgress.currentLevel}</span>
              <span>{levelProgress.nextLabel}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="profile-hero-side">
        <div className="hero-side-card">
          <span className="hero-side-label">프로필 완성도</span>
          <strong>{completionPercent}%</strong>
          <p>{completionCount}/3 항목 완료</p>
        </div>
        <div className="hero-actions">
          <button type="button" className="hero-primary-btn" onClick={openEditModal}>
            <Settings size={18} />
            프로필 편집
          </button>
          <button type="button" className="hero-secondary-btn" onClick={() => navigate('/shop')}>
            <ShoppingBag size={18} />
            꾸미기 아이템 보기
          </button>
        </div>
      </div>
    </section>
  );
}
