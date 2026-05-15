import type { ReactNode } from 'react';
import { RotateCcw } from 'lucide-react';
import { formatDelta } from './arcadeShared';

type Tone = 'neutral' | 'positive' | 'negative' | 'warning';

export function ArcadeGameShell({
  title,
  subtitle,
  children,
  stats,
  className = '',
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  stats?: { label: string; value: ReactNode; tone?: Tone }[];
  className?: string;
}) {
  return (
    <div className={`game-play-area arcade-modern-game ${className}`}>
      <div className="arcade-modern-shell">
        <div className="arcade-modern-header">
          <div>
            <span className="arcade-modern-kicker">MINI GAME</span>
            <h3>{title}</h3>
            {subtitle && <p>{subtitle}</p>}
          </div>
        </div>

        {stats && stats.length > 0 && <ArcadeStatRow stats={stats} />}

        {children}
      </div>
    </div>
  );
}

export function ArcadeStatRow({
  stats,
}: {
  stats: { label: string; value: ReactNode; tone?: Tone }[];
}) {
  return (
    <div className="arcade-modern-stats">
      {stats.map((stat) => (
        <div key={stat.label} className={`arcade-modern-stat tone-${stat.tone || 'neutral'}`}>
          <span>{stat.label}</span>
          <strong>{stat.value}</strong>
        </div>
      ))}
    </div>
  );
}

export function ArcadePanel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`arcade-modern-panel ${className}`}>{children}</div>;
}

export function ArcadeActionBar({ children }: { children: ReactNode }) {
  return <div className="arcade-modern-actions">{children}</div>;
}

export function ArcadeButton({
  children,
  onClick,
  disabled,
  variant = 'primary',
  type = 'button',
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  type?: 'button' | 'submit';
}) {
  return (
    <button type={type} className={`arcade-modern-btn is-${variant}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

export function ArcadeResetButton({ onClick, label = '다시 하기' }: { onClick: () => void; label?: string }) {
  return (
    <ArcadeButton variant="secondary" onClick={onClick}>
      <RotateCcw size={16} />
      {label}
    </ArcadeButton>
  );
}

export function ArcadeResultCard({
  title,
  message,
  delta,
  children,
}: {
  title: string;
  message?: string;
  delta?: number;
  children?: ReactNode;
}) {
  const tone = delta === undefined || delta === 0 ? 'neutral' : delta > 0 ? 'positive' : 'negative';

  return (
    <div className={`arcade-modern-result tone-${tone}`}>
      <span>{title}</span>
      {delta !== undefined && <strong>{formatDelta(delta)}</strong>}
      {message && <p>{message}</p>}
      {children}
    </div>
  );
}

export function ArcadeChoiceGrid({
  children,
  columns = 'auto',
}: {
  children: ReactNode;
  columns?: 'auto' | 'two' | 'four';
}) {
  return <div className={`arcade-modern-choice-grid columns-${columns}`}>{children}</div>;
}

export function ArcadeChoiceButton({
  children,
  onClick,
  selected,
  disabled,
  tone = 'neutral',
}: {
  children: ReactNode;
  onClick?: () => void;
  selected?: boolean;
  disabled?: boolean;
  tone?: Tone;
}) {
  return (
    <button
      type="button"
      className={`arcade-modern-choice ${selected ? 'is-selected' : ''} tone-${tone}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
