import { useEffect, useMemo, useState } from 'react';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../../firebase';
import type { AdminActivityRow } from '../../types/admin';

const ACTION_FILTERS = ['전체', '신고', '게시글', '유저', '상점', '시스템', '시간표'] as const;

function formatActionLabel(action?: string) {
  if (!action) return '-';
  const [group, detail] = action.split('.');
  const groupMap: Record<string, string> = {
    report: '신고',
    post: '게시글',
    comment: '댓글',
    user: '유저',
    settings: '시스템',
    timetable: '시간표',
    shop: '상점',
  };
  return `${groupMap[group] ?? group} / ${detail ?? 'action'}`;
}

export default function AuditTab() {
  const [logs, setLogs] = useState<AdminActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState<(typeof ACTION_FILTERS)[number]>('전체');

  useEffect(() => {
    const q = query(collection(db, 'admin_audit_logs'), orderBy('createdAt', 'desc'), limit(100));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setLogs(snap.docs.map((entry) => ({ id: entry.id, ...(entry.data() as Omit<AdminActivityRow, 'id'>) })));
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

  const filteredLogs = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return logs.filter((row) => {
      const actionGroup = row.action?.split('.')[0] ?? '';
      if (
        groupFilter !== '전체' &&
        !(
          (groupFilter === '신고' && actionGroup === 'report') ||
          (groupFilter === '게시글' && ['post', 'comment'].includes(actionGroup)) ||
          (groupFilter === '유저' && actionGroup === 'user') ||
          (groupFilter === '상점' && actionGroup === 'shop') ||
          (groupFilter === '시스템' && actionGroup === 'settings') ||
          (groupFilter === '시간표' && actionGroup === 'timetable')
        )
      ) {
        return false;
      }

      if (!keyword) return true;

      return [
        row.action,
        row.actorEmail,
        row.targetCollection,
        row.targetId,
        row.detail ? JSON.stringify(row.detail) : '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(keyword);
    });
  }, [groupFilter, logs, search]);

  return (
    <div className="admin-content">
      <div className="table-header-actions">
        <div>
          <h3 className="section-title">감사 로그</h3>
          <p className="admin-section-description">최신 100건의 관리자 작업을 확인할 수 있습니다.</p>
        </div>
      </div>

      <div className="admin-toolbar">
        <input
          className="admin-search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="액션, 관리자 이메일, 대상 컬렉션 검색"
        />
        <div className="admin-filter-tabs">
          {ACTION_FILTERS.map((filter) => (
            <button
              key={filter}
              type="button"
              className={`af-tab ${groupFilter === filter ? 'active' : ''}`}
              onClick={() => setGroupFilter(filter)}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="admin-banner error">{error}</div>}

      {loading ? (
        <div className="admin-empty">감사 로그를 불러오는 중입니다.</div>
      ) : filteredLogs.length === 0 ? (
        <div className="admin-empty">조건에 맞는 감사 로그가 없습니다.</div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>시각</th>
                <th>작업</th>
                <th>관리자</th>
                <th>대상</th>
                <th>비고</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((row) => (
                <tr key={row.id}>
                  <td>{row.createdAt ? new Date(row.createdAt).toLocaleString('ko-KR') : '-'}</td>
                  <td>{formatActionLabel(row.action)}</td>
                  <td>
                    <div>{row.actorEmail || '-'}</div>
                    <div className="admin-muted">{row.actorUid || '-'}</div>
                  </td>
                  <td>
                    {(row.targetCollection || '-')} / {(row.targetId || '-')}
                  </td>
                  <td className="admin-detail-cell">{row.detail ? JSON.stringify(row.detail) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
