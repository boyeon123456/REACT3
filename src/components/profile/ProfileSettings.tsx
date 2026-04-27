import { LogOut } from 'lucide-react';
import { useThemeStore } from '../../store/themeStore';
import { defaultSettings as defaultSettingsProfile } from '../../types/profile';

import type { User } from '../../store/authStore';

interface ProfileSettingsProps {
  settings: User['settings'];
  savingSettingKey: 'inApp' | 'email' | null;
  handleToggleNotification: (key: 'inApp' | 'email', currentSettings: User['settings'], defaultSettings: typeof defaultSettingsProfile) => void;
  openEditModal: () => void;
  handleLogout: () => void;
  showToast: (type: 'success' | 'error', message: string) => void;
}

export default function ProfileSettings({
  settings,
  savingSettingKey,
  handleToggleNotification,
  openEditModal,
  handleLogout,
  showToast,
}: ProfileSettingsProps) {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <div className="content-stack">
      <article className="content-card">
        <div className="section-heading">
          <div>
            <p className="section-kicker">SETTINGS</p>
            <h3>계정 및 알림 설정</h3>
          </div>
        </div>

        <div className="settings-group">
          <div className="setting-row">
            <div>
              <strong>프로필 편집</strong>
              <p>닉네임, 학년/반, 사진을 한 번에 수정할 수 있어요.</p>
            </div>
            <button type="button" className="small-action-btn" onClick={openEditModal}>
              편집하기
            </button>
          </div>

          <div className="setting-row">
            <div>
              <strong>테마 전환</strong>
              <p>현재 테마: {theme === 'dark' ? '다크 모드' : '라이트 모드'}</p>
            </div>
            <button type="button" className={`toggle-pill ${theme === 'dark' ? 'on' : ''}`} onClick={toggleTheme}>
              <span />
            </button>
          </div>

          <div className="setting-row">
            <div>
              <strong>앱 알림</strong>
              <p>새 댓글이나 중요한 소식을 앱 안에서 받아봅니다.</p>
            </div>
            <button
              type="button"
              className={`toggle-pill ${settings?.notifications?.inApp ? 'on' : ''}`}
              onClick={() => handleToggleNotification('inApp', settings, defaultSettingsProfile)}
              disabled={savingSettingKey === 'inApp'}
            >
              <span />
            </button>
          </div>

          <div className="setting-row">
            <div>
              <strong>이메일 알림</strong>
              <p>중요한 안내를 이메일로 받아볼 수 있어요.</p>
            </div>
            <button
              type="button"
              className={`toggle-pill ${settings?.notifications?.email ? 'on' : ''}`}
              onClick={() => handleToggleNotification('email', settings, defaultSettingsProfile)}
              disabled={savingSettingKey === 'email'}
            >
              <span />
            </button>
          </div>
        </div>
      </article>

      <article className="content-card danger-zone">
        <div className="section-heading">
          <div>
            <p className="section-kicker">ACCOUNT</p>
            <h3>계정 관리</h3>
          </div>
        </div>

        <div className="settings-group">
          <div className="setting-row">
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
            <div>
              <strong>계정 탈퇴</strong>
              <p>탈퇴 기능은 아직 안전한 데이터 정리 흐름을 붙이기 전 단계예요.</p>
            </div>
            <button
              type="button"
              className="small-action-btn ghost"
              onClick={() => showToast('error', '계정 탈퇴는 아직 준비 중이에요.')}
            >
              준비 중
            </button>
          </div>
        </div>
      </article>
    </div>
  );
}
