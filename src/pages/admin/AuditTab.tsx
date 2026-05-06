import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';

type LogRow = {
  id: string;
  action?: string;
  actorEmail?: string;
  actorUid?: string;
  targetCollection?: string | null;
  targetId?: string | null;
  detail?: Record<string, unknown>;
  createdAt?: number;
};

export default function AuditTab() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'admin_audit_logs'), orderBy('createdAt', 'desc'), limit(100));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() } as LogRow)));
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error(err);
        setError('감사 로그를 불러오지 못했습니다.');
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  if (loading) {
    return (
      <div className="admin-content">
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          로딩 중...
        </div>
      </div>
    );
  }

  return (
    <div className="admin-content">
      <h3 className="section-title" style={{ marginBottom: '16px' }}>
        감사 로그 (최근 100건)
      </h3>
      {error && (
        <div
          style={{
            padding: '12px',
            marginBottom: '12px',
            borderRadius: '10px',
            background: 'rgba(255,71,87,0.1)',
            color: '#FF4757',
            fontWeight: 600,
          }}
        >
          {error}
        </div>
      )}
      <div style={{ overflowX: 'auto' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '13px',
          }}
        >
          <thead>
            <tr style={{ background: 'var(--bg-main)', textAlign: 'left' }}>
              <th style={{ padding: '10px', border: '1px solid var(--border-light)' }}>시각</th>
              <th style={{ padding: '10px', border: '1px solid var(--border-light)' }}>작업</th>
              <th style={{ padding: '10px', border: '1px solid var(--border-light)' }}>관리자</th>
              <th style={{ padding: '10px', border: '1px solid var(--border-light)' }}>대상</th>
              <th style={{ padding: '10px', border: '1px solid var(--border-light)' }}>비고</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((row) => (
              <tr key={row.id}>
                <td style={{ padding: '10px', border: '1px solid var(--border-light)', whiteSpace: 'nowrap' }}>
                  {row.createdAt
                    ? new Date(row.createdAt).toLocaleString('ko-KR')
                    : '-'}
                </td>
                <td style={{ padding: '10px', border: '1px solid var(--border-light)' }}>
                  {row.action}
                </td>
                <td style={{ padding: '10px', border: '1px solid var(--border-light)' }}>
                  <div>{row.actorEmail}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{row.actorUid}</div>
                </td>
                <td style={{ padding: '10px', border: '1px solid var(--border-light)' }}>
                  {row.targetCollection || '-'} / {row.targetId || '-'}
                </td>
                <td
                  style={{
                    padding: '10px',
                    border: '1px solid var(--border-light)',
                    maxWidth: '280px',
                    wordBreak: 'break-word',
                  }}
                >
                  {row.detail ? JSON.stringify(row.detail) : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {logs.length === 0 && !error && (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          아직 기록이 없습니다.
        </div>
      )}
    </div>
  );
}
