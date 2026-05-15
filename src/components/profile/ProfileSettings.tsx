import {
  Bell,
  CheckCircle2,
  Gauge,
  LogOut,
  Mail,
  Moon,
  Palette,
  PencilLine,
  School,
  ShieldAlert,
  Sparkles,
  Sun,
} from 'lucide-react';
import type { CSSProperties } from 'react';
import {
  defaultSettings as defaultSettingsProfile,
  type AppearanceAccent,
  type AppearanceDensity,
  type AppearanceSettings,
  type AppearanceTheme,
  type PostItem,
} from '../../types/profile';
import type { User } from '../../store/authStore';

interface ProfileSettingsProps {
  user: User;
  latestPost?: PostItem;
  completionPercent: number;
  isSavingProfile: boolean;
  savingSettingKey: 'inApp' | 'email' | 'appearance' | 'privacy' | null;
  handleToggleNotification: (
    key: 'inApp' | 'email',
    currentSettings: User['settings'],
    defaultSettings: typeof defaultSettingsProfile
  ) => void;
  handleUpdateAppearance: (updates: Partial<AppearanceSettings>) => void;
  handleLogout: () => void;
  onOpenEditProfile: () => void;
}

const accentOptions: { value: AppearanceAccent; label: string; color: string }[] = [
  { value: 'blue', label: '스카이', color: '#00aeff' },
  { value: 'coral', label: '코랄', color: '#ff6b57' },
  { value: 'mint', label: '민트', color: '#10b981' },
  { value: 'violet', label: '바이올렛', color: '#8b5cf6' },
];

const themeLabels: Record<AppearanceTheme, string> = {
  light: '라이트 모드',
  dark: '다크 모드',
};

const densityLabels: Record<AppearanceDensity, string> = {
  comfortable: '편안하게',
  compact: '촘촘하게',
};

export default function ProfileSettings({
  user,
  latestPost,
  completionPercent,
  isSavingProfile,
  savingSettingKey,
  handleToggleNotification,
  handleUpdateAppearance,
  handleLogout,
  onOpenEditProfile,
}: ProfileSettingsProps) {
  const appearance = {
    ...defaultSettingsProfile.appearance,
    ...user.settings?.appearance,
  };
  const activeAccent = accentOptions.find((option) => option.value === appearance.accent) ?? accentOptions[0];
  const isSavingAppearance = savingSettingKey === 'appearance';

  return (
    <div className="content-stack settings-summary-stack">
      <article className="content-card compact">
        <div className="section-heading">
          <div>
            <p className="section-kicker">SETTINGS SNAPSHOT</p>
            <h3>설정 요약</h3>
          </div>
          <button type="button" className="inline-action" onClick={onOpenEditProfile} disabled={isSavingProfile}>
            <PencilLine size={16} />
            빠른 편집
          </button>
        </div>

        <div className="settings-summary-grid">
          <article className="settings-summary-tile">
            <span className="setting-icon">
              <CheckCircle2 size={18} />
            </span>
            <strong>프로필 완성도</strong>
            <p>{completionPercent}% 완료</p>
          </article>

          <article className="settings-summary-tile">
            <span className="setting-icon">
              <School size={18} />
            </span>
            <strong>학교 정보</strong>
            <p>{user.isStudent ? (user.schoolName ? '설정 완료' : '학교 선택 필요') : '일반 프로필'}</p>
          </article>

          <article className="settings-summary-tile">
            <span className="setting-icon">
              <Bell size={18} />
            </span>
            <strong>최근 활동 기준</strong>
            <p>{latestPost ? '최근 글 있음' : '게시글 없음'}</p>
          </article>

          <article className="settings-summary-tile">
            <span className="setting-icon" style={{ color: activeAccent.color }}>
              <Palette size={18} />
            </span>
            <strong>화면 취향</strong>
            <p>
              {themeLabels[appearance.theme]} · {activeAccent.label}
            </p>
          </article>
        </div>
      </article>

      <article className="content-card compact">
        <div className="section-heading">
          <div>
            <p className="section-kicker">APPEARANCE</p>
            <h3>취향 설정</h3>
          </div>
        </div>

        <div className="settings-group">
          <div className="setting-row preference-row">
            <span className="setting-icon">
              {appearance.theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
            </span>
            <div>
              <strong>테마</strong>
              <p>현재 테마: {themeLabels[appearance.theme]}</p>
            </div>
            <div className="segmented-control" aria-label="테마 선택">
              {(['light', 'dark'] as AppearanceTheme[]).map((theme) => (
                <button
                  key={theme}
                  type="button"
                  className={appearance.theme === theme ? 'active' : ''}
                  aria-pressed={appearance.theme === theme}
                  onClick={() => handleUpdateAppearance({ theme })}
                  disabled={isSavingAppearance}
                >
                  {theme === 'light' ? '라이트' : '다크'}
                </button>
              ))}
            </div>
          </div>

          <div className="setting-row preference-row">
            <span className="setting-icon">
              <Palette size={18} />
            </span>
            <div>
              <strong>강조색</strong>
              <p>버튼, 링크, 주요 포인트 색상을 바꿉니다.</p>
            </div>
            <div className="accent-swatch-group" aria-label="강조색 선택">
              {accentOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={appearance.accent === option.value ? 'active' : ''}
                  aria-label={option.label}
                  aria-pressed={appearance.accent === option.value}
                  style={{ '--swatch-color': option.color } as CSSProperties}
                  onClick={() => handleUpdateAppearance({ accent: option.value })}
                  disabled={isSavingAppearance}
                >
                  <span />
                </button>
              ))}
            </div>
          </div>

          <div className="setting-row preference-row">
            <span className="setting-icon">
              <Gauge size={18} />
            </span>
            <div>
              <strong>화면 밀도</strong>
              <p>현재 간격: {densityLabels[appearance.density]}</p>
            </div>
            <div className="segmented-control" aria-label="화면 밀도 선택">
              {(['comfortable', 'compact'] as AppearanceDensity[]).map((density) => (
                <button
                  key={density}
                  type="button"
                  className={appearance.density === density ? 'active' : ''}
                  aria-pressed={appearance.density === density}
                  onClick={() => handleUpdateAppearance({ density })}
                  disabled={isSavingAppearance}
                >
                  {densityLabels[density]}
                </button>
              ))}
            </div>
          </div>

          <div className="setting-row">
            <span className="setting-icon">
              <Sparkles size={18} />
            </span>
            <div>
              <strong>모션 줄이기</strong>
              <p>전환 애니메이션과 움직임을 줄여 차분하게 봅니다.</p>
            </div>
            <button
              type="button"
              aria-label="모션 줄이기"
              aria-pressed={appearance.reducedMotion}
              className={`toggle-pill ${appearance.reducedMotion ? 'on' : ''}`}
              onClick={() => handleUpdateAppearance({ reducedMotion: !appearance.reducedMotion })}
              disabled={isSavingAppearance}
            >
              <span />
            </button>
          </div>
        </div>
      </article>

      <article className="content-card compact">
        <div className="section-heading">
          <div>
            <p className="section-kicker">NOTIFICATIONS</p>
            <h3>알림 설정</h3>
          </div>
        </div>

        <div className="settings-group">
          <div className="setting-row">
            <span className="setting-icon">
              <Bell size={18} />
            </span>
            <div>
              <strong>인앱 알림</strong>
              <p>댓글, 좋아요, 답글 알림을 앱 안에서 받습니다.</p>
            </div>
            <button
              type="button"
              aria-label="인앱 알림"
              aria-pressed={Boolean(user.settings?.notifications?.inApp)}
              className={`toggle-pill ${user.settings?.notifications?.inApp ? 'on' : ''}`}
              onClick={() => handleToggleNotification('inApp', user.settings, defaultSettingsProfile)}
              disabled={savingSettingKey === 'inApp'}
            >
              <span />
            </button>
          </div>

          <div className="setting-row">
            <span className="setting-icon">
              <Mail size={18} />
            </span>
            <div>
              <strong>이메일 알림</strong>
              <p>중요한 업데이트를 이메일로 받아봅니다.</p>
            </div>
            <button
              type="button"
              aria-label="이메일 알림"
              aria-pressed={Boolean(user.settings?.notifications?.email)}
              className={`toggle-pill ${user.settings?.notifications?.email ? 'on' : ''}`}
              onClick={() => handleToggleNotification('email', user.settings, defaultSettingsProfile)}
              disabled={savingSettingKey === 'email'}
            >
              <span />
            </button>
          </div>
        </div>
      </article>

      <article className="content-card compact danger-zone">
        <div className="section-heading">
          <div>
            <p className="section-kicker">ACCOUNT</p>
            <h3>계정 관리</h3>
          </div>
        </div>

        <div className="settings-group">
          <div className="setting-row">
            <span className="setting-icon danger">
              <PencilLine size={18} />
            </span>
            <div>
              <strong>프로필 상세 수정</strong>
              <p>사진, 소개, 학교 정보, 대표 배지를 편집 모달에서 관리합니다.</p>
            </div>
            <button type="button" className="small-action-btn ghost" onClick={onOpenEditProfile}>
              편집 열기
            </button>
          </div>

          <div className="setting-row">
            <span className="setting-icon danger">
              <LogOut size={18} />
            </span>
            <div>
              <strong>로그아웃</strong>
              <p>현재 기기에서 안전하게 로그아웃합니다.</p>
            </div>
            <button type="button" className="small-action-btn danger" onClick={handleLogout}>
              <LogOut size={14} />
              로그아웃
            </button>
          </div>

          <div className="setting-row">
            <span className="setting-icon danger">
              <ShieldAlert size={18} />
            </span>
            <div>
              <strong>계정 보호</strong>
              <p>계정 삭제 기능은 준비 중이며, 추후 별도 흐름으로 제공됩니다.</p>
            </div>
            <button type="button" className="small-action-btn ghost" disabled>
              준비 중
            </button>
          </div>
        </div>
      </article>
    </div>
  );
}
