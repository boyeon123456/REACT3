import type { CSSProperties } from 'react';
import {
  BadgeCheck,
  Camera,
  Mail,
  PencilLine,
  School,
  ShoppingBag,
  Sparkles,
  Trophy,
  UserRound,
} from 'lucide-react';
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
  completionChecks: { label: string; done: boolean }[];
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
  completionChecks,
  profileBackground,
  profileNameColor,
  avatarFrameColor,
  openEditModal,
}: ProfileHeroProps) {
  const navigate = useNavigate();
  const roleLabel = user.role === 'admin' ? '운영진' : user.isStudent ? '학생' : '일반 유저';
  const equippedBadge = equippedItems.find((item) => item.type === 'badge');
  const heroStyle = {
    '--profile-bg': profileBackground || 'var(--gradient)',
  } as CSSProperties;
  const completionStyle = {
    '--completion': `${completionPercent}%`,
  } as CSSProperties;

  return (
    <section className="profile-hero-card" style={heroStyle}>
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
            <span className="profile-handle">
              <UserRound size={14} />
              @{user.id.slice(0, 6)}
            </span>
          </div>

          <p className="profile-email">
            <Mail size={15} />
            {user.email}
          </p>

          <div className="profile-meta-chips">
            <span className="meta-chip strong">
              <Trophy size={14} />
              Lv.{user.level} {roleLabel}
            </span>
            <span className="meta-chip highlight">
              <Sparkles size={14} />
              {(user.points || 0).toLocaleString()} P
            </span>
            {user.isStudent && user.schoolName && (
              <span className="meta-chip">
                <School size={14} />
                {user.schoolName}
              </span>
            )}
            {user.isStudent && user.grade && user.class && (
              <span className="meta-chip">
                {user.grade}학년 {user.class}반
              </span>
            )}
            {equippedItems
              .filter((item) => item.type !== 'badge')
              .slice(0, 2)
              .map((item) => (
                <span key={item.id} className="meta-chip subtle">
                  {typeLabels[item.type]} 적용 중
                </span>
              ))}
            {equippedBadge && (
              <span className="meta-chip subtle">
                <BadgeCheck size={14} />
                {equippedBadge.name}
              </span>
            )}
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
          <div className="hero-completion-ring" style={completionStyle} aria-label={`프로필 완성도 ${completionPercent}%`}>
            <div className="ring-center">
              <strong>{completionPercent}%</strong>
              <span>{completionCount}/3</span>
            </div>
          </div>
          <ul className="completion-list">
            {completionChecks.map((check) => (
              <li key={check.label} className={check.done ? 'done' : 'missing'}>
                <BadgeCheck size={14} />
                {check.label}
              </li>
            ))}
          </ul>
        </div>
        <div className="hero-actions">
          <button type="button" className="hero-primary-btn" onClick={openEditModal}>
            <PencilLine size={18} />
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
