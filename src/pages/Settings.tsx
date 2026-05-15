import { Bell, ChevronLeft, EyeOff, LogOut, Mail, Moon, Palette, Sparkles, Sun } from 'lucide-react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfileActions } from '../hooks/useProfileActions';
import { useAuthStore } from '../store/authStore';
import {
  defaultSettings,
  type AppearanceAccent,
  type AppearanceDensity,
  type AppearanceTheme,
} from '../types/profile';
import './MyPage.css';

const text = {
  loginRequired: '\uB85C\uADF8\uC778\uC774 \uD544\uC694\uD574\uC694.',
  back: '\uB4A4\uB85C \uAC00\uAE30',
  settings: '\uC124\uC815',
  subtitle: '\uC54C\uB9BC, \uD654\uBA74, \uACC4\uC815 \uC635\uC158\uC744 \uAD00\uB9AC\uD574\uC694.',
  notifications: '\uC54C\uB9BC',
  notificationsDesc: '\uD544\uC694\uD55C \uC54C\uB9BC\uB9CC \uCF1C\uB450\uBA74 \uB3FC\uC694.',
  inApp: '\uC571 \uC54C\uB9BC',
  inAppDesc: '\uB313\uAE00, \uC88B\uC544\uC694, \uB2F5\uAE00 \uC54C\uB9BC\uC744 \uC571 \uC548\uC5D0\uC11C \uBC1B\uC544\uC694.',
  email: '\uC774\uBA54\uC77C \uC54C\uB9BC',
  emailDesc: '\uC911\uC694\uD55C \uC5C5\uB370\uC774\uD2B8\uB97C \uC774\uBA54\uC77C\uB85C \uBC1B\uC744 \uC218 \uC788\uC5B4\uC694.',
  display: '\uD654\uBA74',
  displayDesc: '\uC571 \uC804\uCCB4 \uBCF4\uAE30 \uBC29\uC2DD\uC744 \uBC14\uAFFF\uC694.',
  theme: '\uD14C\uB9C8',
  current: '\uD604\uC7AC',
  accent: '\uD3EC\uC778\uD2B8 \uC0C9\uC0C1',
  accentDesc: '\uBC84\uD2BC\uACFC \uAC15\uC870 \uC0C9\uC0C1\uC744 \uBC14\uAFFF\uC694.',
  reduceMotion: '\uC6C0\uC9C1\uC784 \uC904\uC774\uAE30',
  reduceMotionDesc: '\uC804\uD658 \uD6A8\uACFC\uB97C \uCC28\uBD84\uD558\uAC8C \uC904\uC5EC\uC694.',
  density: '\uAC04\uACA9',
  privacy: '개인정보',
  privacyDesc: '프로필과 전체 게시판에서 보이는 정보를 조절해요.',
  hideSchoolName: '학교 이름 감추기',
  hideSchoolNameDesc: '다른 학교 사용자에게 내 학교 이름을 숨겨요. 같은 학교 사용자에게는 그대로 보여요.',
  account: '\uACC4\uC815',
  accountDesc: '\uD504\uB85C\uD544 \uC218\uC815\uC740 \uBCC4\uB3C4 \uD654\uBA74\uC5D0\uC11C \uAD00\uB9AC\uD574\uC694.',
  logout: '\uB85C\uADF8\uC544\uC6C3',
  logoutDesc: '\uD604\uC7AC \uAE30\uAE30\uC5D0\uC11C \uACC4\uC815\uC744 \uB85C\uADF8\uC544\uC6C3\uD574\uC694.',
};

const accentOptions: { value: AppearanceAccent; label: string; color: string }[] = [
  { value: 'blue', label: '\uD30C\uB791', color: '#00aeff' },
  { value: 'coral', label: '\uCF54\uB784', color: '#ff6b57' },
  { value: 'mint', label: '\uBBFC\uD2B8', color: '#10b981' },
  { value: 'violet', label: '\uBCF4\uB77C', color: '#8b5cf6' },
];

const themeLabels: Record<AppearanceTheme, string> = {
  light: '\uB77C\uC774\uD2B8',
  dark: '\uB2E4\uD06C',
};

const densityLabels: Record<AppearanceDensity, string> = {
  comfortable: '\uC5EC\uC720',
  compact: '\uC881\uAC8C',
};

export default function Settings() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const actions = useProfileActions();

  if (!user) {
    return (
      <div className="mypage-v6 app-settings-page animate-fade-in">
        <main className="app-settings-shell">
          <p className="profile-settings-empty">{text.loginRequired}</p>
        </main>
      </div>
    );
  }

  const settings = {
    ...defaultSettings,
    ...user.settings,
    notifications: {
      ...defaultSettings.notifications,
      ...user.settings?.notifications,
    },
    appearance: {
      ...defaultSettings.appearance,
      ...user.settings?.appearance,
    },
    privacy: {
      ...defaultSettings.privacy,
      ...user.settings?.privacy,
    },
  };

  const isSavingAppearance = actions.savingSettingKey === 'appearance';

  return (
    <div className="mypage-v6 app-settings-page animate-fade-in">
      <main className="app-settings-shell">
        <div className="profile-settings-header">
          <button type="button" className="settings-back-btn" onClick={() => navigate(-1)} aria-label={text.back}>
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1>{text.settings}</h1>
            <p>{text.subtitle}</p>
          </div>
        </div>

        <section className="app-settings-section">
          <div className="app-settings-title">
            <h2>{text.notifications}</h2>
            <p>{text.notificationsDesc}</p>
          </div>

          <div className="settings-group">
            <div className="setting-row">
              <span className="setting-icon">
                <Bell size={18} />
              </span>
              <div>
                <strong>{text.inApp}</strong>
                <p>{text.inAppDesc}</p>
              </div>
              <button
                type="button"
                aria-label={text.inApp}
                aria-pressed={settings.notifications.inApp}
                className={`toggle-pill ${settings.notifications.inApp ? 'on' : ''}`}
                onClick={() => actions.handleToggleNotification('inApp', user.settings, defaultSettings)}
                disabled={actions.savingSettingKey === 'inApp'}
              >
                <span />
              </button>
            </div>

            <div className="setting-row">
              <span className="setting-icon">
                <Mail size={18} />
              </span>
              <div>
                <strong>{text.email}</strong>
                <p>{text.emailDesc}</p>
              </div>
              <button
                type="button"
                aria-label={text.email}
                aria-pressed={settings.notifications.email}
                className={`toggle-pill ${settings.notifications.email ? 'on' : ''}`}
                onClick={() => actions.handleToggleNotification('email', user.settings, defaultSettings)}
                disabled={actions.savingSettingKey === 'email'}
              >
                <span />
              </button>
            </div>
          </div>
        </section>

        <section className="app-settings-section">
          <div className="app-settings-title">
            <h2>{text.display}</h2>
            <p>{text.displayDesc}</p>
          </div>

          <div className="settings-group">
            <div className="setting-row preference-row">
              <span className="setting-icon">{settings.appearance.theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}</span>
              <div>
                <strong>{text.theme}</strong>
                <p>
                  {text.current} {themeLabels[settings.appearance.theme]}
                </p>
              </div>
              <div className="segmented-control" aria-label={text.theme}>
                {(['light', 'dark'] as AppearanceTheme[]).map((theme) => (
                  <button
                    key={theme}
                    type="button"
                    className={settings.appearance.theme === theme ? 'active' : ''}
                    onClick={() => actions.handleUpdateAppearance({ theme })}
                    disabled={isSavingAppearance}
                  >
                    {themeLabels[theme]}
                  </button>
                ))}
              </div>
            </div>

            <div className="setting-row preference-row">
              <span className="setting-icon">
                <Palette size={18} />
              </span>
              <div>
                <strong>{text.accent}</strong>
                <p>{text.accentDesc}</p>
              </div>
              <div className="accent-swatch-group" aria-label={text.accent}>
                {accentOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={settings.appearance.accent === option.value ? 'active' : ''}
                    aria-label={option.label}
                    style={{ '--swatch-color': option.color } as CSSProperties}
                    onClick={() => actions.handleUpdateAppearance({ accent: option.value })}
                    disabled={isSavingAppearance}
                  >
                    <span />
                  </button>
                ))}
              </div>
            </div>

            <div className="setting-row preference-row">
              <span className="setting-icon">
                <Sparkles size={18} />
              </span>
              <div>
                <strong>{text.reduceMotion}</strong>
                <p>{text.reduceMotionDesc}</p>
              </div>
              <button
                type="button"
                aria-label={text.reduceMotion}
                aria-pressed={settings.appearance.reducedMotion}
                className={`toggle-pill ${settings.appearance.reducedMotion ? 'on' : ''}`}
                onClick={() => actions.handleUpdateAppearance({ reducedMotion: !settings.appearance.reducedMotion })}
                disabled={isSavingAppearance}
              >
                <span />
              </button>
            </div>

            <div className="setting-row preference-row">
              <span className="setting-icon">
                <Palette size={18} />
              </span>
              <div>
                <strong>{text.density}</strong>
                <p>
                  {text.current} {densityLabels[settings.appearance.density]}
                </p>
              </div>
              <div className="segmented-control" aria-label={text.density}>
                {(['comfortable', 'compact'] as AppearanceDensity[]).map((density) => (
                  <button
                    key={density}
                    type="button"
                    className={settings.appearance.density === density ? 'active' : ''}
                    onClick={() => actions.handleUpdateAppearance({ density })}
                    disabled={isSavingAppearance}
                  >
                    {densityLabels[density]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="app-settings-section">
          <div className="app-settings-title">
            <h2>{text.privacy}</h2>
            <p>{text.privacyDesc}</p>
          </div>

          <div className="settings-group">
            <div className="setting-row">
              <span className="setting-icon">
                <EyeOff size={18} />
              </span>
              <div>
                <strong>{text.hideSchoolName}</strong>
                <p>{text.hideSchoolNameDesc}</p>
              </div>
              <button
                type="button"
                aria-label={text.hideSchoolName}
                aria-pressed={settings.privacy.hideSchoolName}
                className={`toggle-pill ${settings.privacy.hideSchoolName ? 'on' : ''}`}
                onClick={() => actions.handleUpdatePrivacy({ hideSchoolName: !settings.privacy.hideSchoolName })}
                disabled={actions.savingSettingKey === 'privacy'}
              >
                <span />
              </button>
            </div>
          </div>
        </section>

        <section className="app-settings-section danger-zone">
          <div className="app-settings-title">
            <h2>{text.account}</h2>
            <p>{text.accountDesc}</p>
          </div>

          <div className="settings-group">
            <div className="setting-row">
              <span className="setting-icon danger">
                <LogOut size={18} />
              </span>
              <div>
                <strong>{text.logout}</strong>
                <p>{text.logoutDesc}</p>
              </div>
              <button type="button" className="small-action-btn danger" onClick={actions.handleLogout}>
                <LogOut size={14} />
                {text.logout}
              </button>
            </div>
          </div>
        </section>
      </main>

      {actions.toast && <div className={`mypage-toast ${actions.toast.type}`}>{actions.toast.message}</div>}
    </div>
  );
}
