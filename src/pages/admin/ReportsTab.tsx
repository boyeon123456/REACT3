import { useEffect, useMemo, useState } from 'react';
import { CheckCircle, Clock3, Link2, Pin, Search, Trash2, XCircle } from 'lucide-react';
import { deleteDoc, doc, getDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../../firebase';
import { logAdminAction } from '../../lib/adminAudit';
import { useAuthStore } from '../../store/authStore';
import ConfirmModal from '../../components/ui/ConfirmModal';
import type { AdminNotify } from '../../hooks/useAdminToast';
import type { AdminReportRow } from '../../types/admin';

type Props = {
  reports: AdminReportRow[];
  loading: boolean;
  syncError: string | null;
  onNotify?: AdminNotify;
};

type FilterType = 'all' | 'pending' | 'resolved' | 'dismissed' | 'pinned' | 'post-missing';

function chunkIds(ids: string[], size: number): string[][] {
  const out: string[][] = [];
  for (let index = 0; index < ids.length; index += size) out.push(ids.slice(index, index + size));
  return out;
}

export default function ReportsTab({ reports, loading, syncError, onNotify }: Props) {
  const { user } = useAuthStore();
  const [filter, setFilter] = useState<FilterType>('pending');
  const [search, setSearch] = useState('');
  const [pinByPostId, setPinByPostId] = useState<Record<string, boolean>>({});
  const [missingPostIds, setMissingPostIds] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteStep1Report, setDeleteStep1Report] = useState<AdminReportRow | null>(null);
  const [deleteStep2Report, setDeleteStep2Report] = useState<AdminReportRow | null>(null);
  const [confirmDeleteRecordId, setConfirmDeleteRecordId] = useState<string | null>(null);
  const [confirmClearHandled, setConfirmClearHandled] = useState(false);
  const [bulkAction, setBulkAction] = useState<'resolve' | 'dismiss' | 'delete' | null>(null);

  const contentIds = useMemo(
    () => [...new Set(reports.map((entry) => entry.contentId).filter(Boolean) as string[])],
    [reports]
  );

  useEffect(() => {
    if (contentIds.length === 0) {
      const timeout = window.setTimeout(() => {
        setPinByPostId({});
        setMissingPostIds({});
      }, 0);
      return () => window.clearTimeout(timeout);
    }

    let cancelled = false;
    void (async () => {
      const pinState: Record<string, boolean> = {};
      const missingState: Record<string, boolean> = {};

      await Promise.all(
        contentIds.map(async (id) => {
          const snap = await getDoc(doc(db, 'posts', id));
          pinState[id] = snap.exists() ? !!snap.data().isPinned : false;
          missingState[id] = !snap.exists();
        })
      );

      if (!cancelled) {
        setPinByPostId(pinState);
        setMissingPostIds(missingState);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [contentIds]);

  const filteredReports = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return reports.filter((report) => {
      const postId = report.contentId || '';
      const isPinned = postId ? pinByPostId[postId] ?? false : false;
      const isMissing = postId ? missingPostIds[postId] ?? false : false;

      if (
        (filter === 'pending' && report.status !== 'pending') ||
        (filter === 'resolved' && report.status !== 'resolved') ||
        (filter === 'dismissed' && report.status !== 'dismissed') ||
        (filter === 'pinned' && !isPinned) ||
        (filter === 'post-missing' && !isMissing)
      ) {
        return false;
      }

      if (!keyword) return true;

      return [report.reason, report.reporter, report.content, report.status, report.type]
        .join(' ')
        .toLowerCase()
        .includes(keyword);
    });
  }, [filter, missingPostIds, pinByPostId, reports, search]);

  const selectedIds = filteredReports.filter((entry) => selected.has(entry.id)).map((entry) => entry.id);
  const selectedPendingIds = filteredReports
    .filter((entry) => selected.has(entry.id) && entry.status === 'pending')
    .map((entry) => entry.id);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllFiltered = () => {
    if (selected.size === filteredReports.length && filteredReports.length > 0) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(filteredReports.map((entry) => entry.id)));
  };

  const updateReportStatus = async (id: string, status: 'resolved' | 'dismissed') => {
    try {
      await updateDoc(doc(db, 'reports', id), { status, handledAt: Date.now() });
      await logAdminAction(user, status === 'resolved' ? 'report.resolve' : 'report.dismiss', {
        targetCollection: 'reports',
        targetId: id,
      });
      onNotify?.(status === 'resolved' ? '신고를 처리 완료했습니다.' : '신고를 기각했습니다.');
    } catch (e) {
      console.error(e);
      onNotify?.('신고 처리에 실패했습니다.', 'error');
    }
  };

  const runDeleteReport = async (report: AdminReportRow, deletePostToo: boolean) => {
    try {
      if (deletePostToo && report.contentId) {
        await deleteDoc(doc(db, 'posts', report.contentId));
      }
      await deleteDoc(doc(db, 'reports', report.id));
      await logAdminAction(user, 'report.delete_with_optional_post', {
        targetCollection: 'reports',
        targetId: report.id,
        detail: { contentId: report.contentId ?? null, deletedPost: deletePostToo },
      });
      onNotify?.(deletePostToo ? '신고와 게시글을 함께 삭제했습니다.' : '신고 기록만 삭제했습니다.');
    } catch (e) {
      console.error(e);
      onNotify?.('삭제 처리에 실패했습니다.', 'error');
    }
  };

  const runDeleteSingleRecord = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'reports', id));
      await logAdminAction(user, 'report.delete_record', {
        targetCollection: 'reports',
        targetId: id,
      });
      onNotify?.('신고 기록을 삭제했습니다.');
    } catch (e) {
      console.error(e);
      onNotify?.('신고 기록 삭제에 실패했습니다.', 'error');
    }
  };

  const runClearHandled = async () => {
    const handledIds = reports.filter((entry) => entry.status !== 'pending').map((entry) => entry.id);
    if (handledIds.length === 0) return;

    try {
      for (const group of chunkIds(handledIds, 400)) {
        const batch = writeBatch(db);
        group.forEach((id) => batch.delete(doc(db, 'reports', id)));
        await batch.commit();
      }
      await logAdminAction(user, 'report.clear_handled', { detail: { count: handledIds.length } });
      onNotify?.(`${handledIds.length}건의 처리 완료 신고를 정리했습니다.`);
    } catch (e) {
      console.error(e);
      onNotify?.('처리 완료 신고 정리에 실패했습니다.', 'error');
    }
  };

  const handleTogglePin = async (postId: string, currentPinned: boolean) => {
    try {
      await updateDoc(doc(db, 'posts', postId), { isPinned: !currentPinned });
      setPinByPostId((prev) => ({ ...prev, [postId]: !currentPinned }));
      await logAdminAction(user, 'post.pin_toggle', {
        targetCollection: 'posts',
        targetId: postId,
        detail: { isPinned: !currentPinned },
      });
      onNotify?.(!currentPinned ? '게시글을 상단 고정했습니다.' : '게시글 고정을 해제했습니다.');
    } catch (e) {
      console.error(e);
      onNotify?.('게시글 고정 상태 변경에 실패했습니다.', 'error');
    }
  };

  const runBulkUpdate = async (mode: 'resolve' | 'dismiss' | 'delete') => {
    const targetIds = mode === 'delete' ? selectedIds : selectedPendingIds;
    if (targetIds.length === 0) return;

    try {
      for (const group of chunkIds(targetIds, 400)) {
        const batch = writeBatch(db);
        group.forEach((id) => {
          const ref = doc(db, 'reports', id);
          if (mode === 'delete') batch.delete(ref);
          else batch.update(ref, { status: mode === 'resolve' ? 'resolved' : 'dismissed', handledAt: Date.now() });
        });
        await batch.commit();
      }

      const actionMap = {
        resolve: 'report.batch_resolve',
        dismiss: 'report.batch_dismiss',
        delete: 'report.batch_delete_record',
      } as const;
      await logAdminAction(user, actionMap[mode], { detail: { ids: targetIds } });
      setSelected(new Set());
      onNotify?.(
        mode === 'resolve'
          ? `${targetIds.length}건을 처리 완료했습니다.`
          : mode === 'dismiss'
            ? `${targetIds.length}건을 기각했습니다.`
            : `${targetIds.length}건의 신고 기록을 삭제했습니다.`
      );
    } catch (e) {
      console.error(e);
      onNotify?.('일괄 처리에 실패했습니다.', 'error');
    }
  };

  return (
    <div className="admin-content">
      <ConfirmModal
        isOpen={!!deleteStep1Report}
        onClose={() => setDeleteStep1Report(null)}
        onConfirm={() => {
          if (deleteStep1Report) {
            setDeleteStep2Report(deleteStep1Report);
            setDeleteStep1Report(null);
          }
        }}
        title="신고 삭제"
        message="다음 단계에서 게시글까지 함께 삭제할지 선택할 수 있습니다."
        confirmText="다음"
        type="danger"
      />

      {deleteStep2Report && (
        <div className="admin-step2-overlay" onClick={() => setDeleteStep2Report(null)}>
          <div className="admin-step2-card" onClick={(e) => e.stopPropagation()}>
            <h3>게시글도 함께 삭제할까요?</h3>
            <p>신고 기록만 삭제할 수도 있고, 신고 대상 게시글까지 함께 제거할 수도 있습니다.</p>
            <div className="admin-step2-actions">
              <button
                type="button"
                className="admin-step2-primary"
                onClick={() => {
                  void runDeleteReport(deleteStep2Report, true);
                  setDeleteStep2Report(null);
                }}
              >
                게시글까지 삭제
              </button>
              <button
                type="button"
                className="admin-step2-secondary"
                onClick={() => {
                  void runDeleteReport(deleteStep2Report, false);
                  setDeleteStep2Report(null);
                }}
              >
                신고 기록만 삭제
              </button>
              <button type="button" className="admin-step2-ghost" onClick={() => setDeleteStep2Report(null)}>
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!confirmDeleteRecordId}
        onClose={() => setConfirmDeleteRecordId(null)}
        onConfirm={() => {
          if (confirmDeleteRecordId) void runDeleteSingleRecord(confirmDeleteRecordId);
        }}
        title="신고 기록 삭제"
        message="이 작업은 게시글을 삭제하지 않고 신고 기록만 제거합니다."
        confirmText="삭제"
        type="danger"
      />

      <ConfirmModal
        isOpen={confirmClearHandled}
        onClose={() => setConfirmClearHandled(false)}
        onConfirm={() => void runClearHandled()}
        title="처리 완료 신고 정리"
        message="완료 또는 기각된 신고 기록을 한 번에 삭제합니다."
        confirmText="정리"
        type="danger"
      />

      <ConfirmModal
        isOpen={bulkAction === 'resolve'}
        onClose={() => setBulkAction(null)}
        onConfirm={() => void runBulkUpdate('resolve')}
        title="일괄 처리 완료"
        message={`${selectedPendingIds.length}건의 신고를 처리 완료 상태로 변경합니다.`}
        confirmText="적용"
        type="primary"
      />
      <ConfirmModal
        isOpen={bulkAction === 'dismiss'}
        onClose={() => setBulkAction(null)}
        onConfirm={() => void runBulkUpdate('dismiss')}
        title="일괄 기각"
        message={`${selectedPendingIds.length}건의 신고를 기각합니다.`}
        confirmText="기각"
        type="danger"
      />
      <ConfirmModal
        isOpen={bulkAction === 'delete'}
        onClose={() => setBulkAction(null)}
        onConfirm={() => void runBulkUpdate('delete')}
        title="일괄 삭제"
        message={`${selectedIds.length}건의 신고 기록을 삭제합니다.`}
        confirmText="삭제"
        type="danger"
      />

      <div className="table-header-actions">
        <div>
          <h3 className="section-title">신고 관리</h3>
          <p className="admin-section-description">검색, 상태 필터, 일괄 작업으로 신고 처리 속도를 높일 수 있습니다.</p>
        </div>
      </div>

      <div className="admin-toolbar">
        <label className="admin-search-wrap">
          <Search size={16} />
          <input
            className="admin-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="신고 사유, 신고자, 본문, 상태 검색"
          />
        </label>
        <button type="button" className="admin-btn" onClick={selectAllFiltered}>
          {selected.size === filteredReports.length && filteredReports.length > 0 ? '선택 해제' : '전체 선택'}
        </button>
        <div className="admin-filter-tabs">
          {[
            ['all', '전체'],
            ['pending', '미처리'],
            ['resolved', '처리 완료'],
            ['dismissed', '기각'],
            ['pinned', '고정 글'],
            ['post-missing', '원본 없음'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={`af-tab ${filter === value ? 'active' : ''}`}
              onClick={() => setFilter(value as FilterType)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {syncError && <div className="admin-banner error">{syncError}</div>}

      {selected.size > 0 && (
        <div className="admin-floating-panel sticky">
          <strong>{selected.size}건 선택됨</strong>
          <button type="button" className="admin-btn approve" onClick={() => setBulkAction('resolve')} disabled={selectedPendingIds.length === 0}>
            <CheckCircle size={16} />
            처리 완료
          </button>
          <button type="button" className="admin-btn dismiss" onClick={() => setBulkAction('dismiss')} disabled={selectedPendingIds.length === 0}>
            <XCircle size={16} />
            기각
          </button>
          <button type="button" className="admin-btn delete" onClick={() => setBulkAction('delete')}>
            <Trash2 size={16} />
            기록 삭제
          </button>
          {(filter === 'resolved' || filter === 'dismissed') && (
            <button type="button" className="admin-btn" onClick={() => setConfirmClearHandled(true)}>
              처리 완료 정리
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div className="admin-empty">신고 데이터를 불러오는 중입니다.</div>
      ) : filteredReports.length === 0 ? (
        <div className="admin-empty">조건에 맞는 신고가 없습니다.</div>
      ) : (
        <div className="report-cards">
          {filteredReports.map((report) => {
            const postId = report.contentId || '';
            const isPinned = postId ? pinByPostId[postId] ?? false : false;
            const isMissing = postId ? missingPostIds[postId] ?? false : false;
            return (
              <div key={report.id} className={`report-card ${report.status || ''}`}>
                <div className="report-row-header">
                  <label className="admin-checkbox-row">
                    <input type="checkbox" checked={selected.has(report.id)} onChange={() => toggleSelect(report.id)} />
                    <span />
                  </label>
                  <div className="report-header-copy">
                    <div className="report-top">
                      <span className="report-type-badge">{report.type || '신고'}</span>
                      <span className={`report-status ${report.status || 'pending'}`}>
                        {report.status === 'resolved' ? (
                          <>
                            <CheckCircle size={14} /> 처리 완료
                          </>
                        ) : report.status === 'dismissed' ? (
                          <>
                            <XCircle size={14} /> 기각
                          </>
                        ) : (
                          <>
                            <Clock3 size={14} /> 미처리
                          </>
                        )}
                      </span>
                    </div>
                    <p className="report-content">"{report.content || '본문 정보 없음'}"</p>
                    <div className="report-meta">
                      <span>사유: {report.reason || '-'}</span>
                      <span>신고자: {report.reporter || '-'}</span>
                      <span>접수: {report.createdAt ? new Date(report.createdAt).toLocaleString('ko-KR') : report.date || '-'}</span>
                      <span>처리: {report.handledAt ? new Date(report.handledAt).toLocaleString('ko-KR') : '-'}</span>
                    </div>
                    <div className="admin-badge-row">
                      <span className={`admin-chip ${isMissing ? 'warning' : ''}`}>{isMissing ? '원본 게시글 없음' : '원본 게시글 존재'}</span>
                      <span className={`admin-chip ${isPinned ? 'danger' : ''}`}>{isPinned ? '상단 고정 글' : '일반 글'}</span>
                    </div>
                  </div>
                </div>

                <div className="report-actions">
                  <button
                    type="button"
                    className="admin-btn"
                    onClick={() => postId && handleTogglePin(postId, isPinned)}
                    disabled={!postId || isMissing}
                  >
                    <Pin size={16} />
                    {isPinned ? '고정 해제' : '상단 고정'}
                  </button>
                  {postId && !isMissing && (
                    <a href={`/post/${postId}`} target="_blank" rel="noreferrer" className="admin-btn admin-link-btn">
                      <Link2 size={16} />
                      게시글 보기
                    </a>
                  )}
                  {report.status === 'pending' ? (
                    <>
                      <button type="button" className="admin-btn approve" onClick={() => void updateReportStatus(report.id, 'resolved')}>
                        <CheckCircle size={16} />
                        처리 완료
                      </button>
                      <button type="button" className="admin-btn dismiss" onClick={() => void updateReportStatus(report.id, 'dismissed')}>
                        <XCircle size={16} />
                        기각
                      </button>
                      <button type="button" className="admin-btn delete" onClick={() => setDeleteStep1Report(report)}>
                        <Trash2 size={16} />
                        삭제
                      </button>
                    </>
                  ) : (
                    <button type="button" className="admin-btn delete" onClick={() => setConfirmDeleteRecordId(report.id)}>
                      <Trash2 size={16} />
                      기록 삭제
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
