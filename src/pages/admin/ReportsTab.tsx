import { useState, useEffect, useMemo } from 'react';
import { Trash2, CheckCircle, XCircle, Clock, Pin, Link2 } from 'lucide-react';
import {
  doc,
  updateDoc,
  deleteDoc,
  writeBatch,
  getDoc,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { logAdminAction } from '../../lib/adminAudit';
import { useAuthStore } from '../../store/authStore';
import ConfirmModal from '../../components/ui/ConfirmModal';
import type { AdminNotify } from '../../hooks/useAdminToast';

export type ReportRow = {
  id: string;
  contentId?: string;
  status?: string;
  type?: string;
  content?: string;
  reason?: string;
  reporter?: string;
  date?: string;
  isPinned?: boolean;
};

function chunkIds(ids: string[], size: number): string[][] {
  const out: string[][] = [];
  for (let i = 0; i < ids.length; i += size) out.push(ids.slice(i, i + size));
  return out;
}

type Props = {
  reports: ReportRow[];
  loading: boolean;
  syncError: string | null;
  onNotify?: AdminNotify;
};

export default function ReportsTab({ reports, loading, syncError, onNotify }: Props) {
  const { user } = useAuthStore();
  const [filter, setFilter] = useState<'all' | 'pending' | 'resolved'>('all');
  const [pinByPostId, setPinByPostId] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [deleteStep1Report, setDeleteStep1Report] = useState<ReportRow | null>(null);
  const [deleteStep2Report, setDeleteStep2Report] = useState<ReportRow | null>(null);
  const [confirmClearHandled, setConfirmClearHandled] = useState(false);
  const [confirmDeleteRecordId, setConfirmDeleteRecordId] = useState<string | null>(null);
  const [bulkAction, setBulkAction] = useState<'resolve' | 'dismiss' | 'delete' | null>(null);

  const contentIds = useMemo(
    () =>
      [...new Set(reports.map((r) => r.contentId).filter(Boolean) as string[])],
    [reports]
  );

  useEffect(() => {
    if (contentIds.length === 0) {
      setPinByPostId({});
      return;
    }
    let cancelled = false;
    (async () => {
      const entries: [string, boolean][] = [];
      for (const id of contentIds) {
        const snap = await getDoc(doc(db, 'posts', id));
        entries.push([id, snap.exists() ? !!(snap.data() as { isPinned?: boolean }).isPinned : false]);
      }
      if (!cancelled) setPinByPostId(Object.fromEntries(entries));
    })();
    return () => {
      cancelled = true;
    };
  }, [contentIds.join('|')]);

  const filteredReports = reports.filter((r) =>
    filter === 'all'
      ? true
      : filter === 'pending'
        ? r.status === 'pending'
        : r.status === 'resolved' || r.status === 'dismissed'
  );

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllFiltered = () => {
    if (selected.size === filteredReports.length) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(filteredReports.map((r) => r.id)));
  };

  const selectedPendingIds = filteredReports
    .filter((r) => selected.has(r.id) && r.status === 'pending')
    .map((r) => r.id);

  const selectedIdsList = filteredReports.filter((r) => selected.has(r.id)).map((r) => r.id);

  const handleResolve = async (id: string) => {
    try {
      await updateDoc(doc(db, 'reports', id), { status: 'resolved' });
      await logAdminAction(user, 'report.resolve', {
        targetCollection: 'reports',
        targetId: id,
      });
      onNotify?.('처리 완료로 표시했습니다.');
    } catch (e) {
      console.error(e);
      onNotify?.('처리에 실패했습니다.', 'error');
    }
  };

  const runDeleteReport = async (report: ReportRow, deletePostToo: boolean) => {
    const contentId = report.contentId;
    try {
      if (deletePostToo && contentId) {
        try {
          await deleteDoc(doc(db, 'posts', contentId));
        } catch (e) {
          console.error(e);
        }
      }
      await deleteDoc(doc(db, 'reports', report.id));
      await logAdminAction(user, 'report.delete_with_optional_post', {
        targetCollection: 'reports',
        targetId: report.id,
        detail: { contentId: contentId ?? null, deletedPost: !!deletePostToo },
      });
      onNotify?.(deletePostToo ? '신고와 게시글을 삭제했습니다.' : '신고 기록만 삭제했습니다.');
    } catch (e) {
      console.error(e);
      onNotify?.('삭제에 실패했습니다.', 'error');
    }
  };

  const handleDismiss = async (id: string) => {
    try {
      await updateDoc(doc(db, 'reports', id), { status: 'dismissed' });
      await logAdminAction(user, 'report.dismiss', {
        targetCollection: 'reports',
        targetId: id,
      });
      onNotify?.('기각 처리했습니다.');
    } catch (e) {
      console.error(e);
      onNotify?.('처리에 실패했습니다.', 'error');
    }
  };

  const runDeleteSingleRecord = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'reports', id));
      await logAdminAction(user, 'report.delete_record', {
        targetCollection: 'reports',
        targetId: id,
      });
      onNotify?.('기록을 삭제했습니다.');
    } catch (e) {
      console.error(e);
      onNotify?.('삭제에 실패했습니다.', 'error');
    }
  };

  const runClearHandled = async () => {
    const handled = reports.filter((r) => r.status !== 'pending');
    if (handled.length === 0) return;
    try {
      for (const group of chunkIds(
        handled.map((r) => r.id),
        400
      )) {
        const batch = writeBatch(db);
        group.forEach((rid) => batch.delete(doc(db, 'reports', rid)));
        await batch.commit();
      }
      await logAdminAction(user, 'report.clear_handled', {
        detail: { count: handled.length },
      });
      onNotify?.(`${handled.length}건의 기록을 정리했습니다.`);
    } catch (e) {
      console.error(e);
      onNotify?.('정리에 실패했습니다.', 'error');
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
      onNotify?.(currentPinned ? '핀 고정을 해제했습니다.' : '상단에 고정했습니다.');
    } catch (e) {
      console.error(e);
      onNotify?.('핀 작업에 실패했습니다. (삭제된 게시글일 수 있습니다)', 'error');
    }
  };

  const runBulkResolve = async () => {
    if (selectedPendingIds.length === 0) return;
    try {
      for (const group of chunkIds(selectedPendingIds, 400)) {
        const batch = writeBatch(db);
        group.forEach((rid) =>
          batch.update(doc(db, 'reports', rid), { status: 'resolved' })
        );
        await batch.commit();
      }
      await logAdminAction(user, 'report.batch_resolve', {
        detail: { ids: selectedPendingIds },
      });
      setSelected(new Set());
      onNotify?.(`${selectedPendingIds.length}건을 처리 완료했습니다.`);
    } catch (e) {
      console.error(e);
      onNotify?.('일괄 처리에 실패했습니다.', 'error');
    }
  };

  const runBulkDismiss = async () => {
    if (selectedPendingIds.length === 0) return;
    try {
      for (const group of chunkIds(selectedPendingIds, 400)) {
        const batch = writeBatch(db);
        group.forEach((rid) =>
          batch.update(doc(db, 'reports', rid), { status: 'dismissed' })
        );
        await batch.commit();
      }
      await logAdminAction(user, 'report.batch_dismiss', {
        detail: { ids: selectedPendingIds },
      });
      setSelected(new Set());
      onNotify?.(`${selectedPendingIds.length}건을 기각했습니다.`);
    } catch (e) {
      console.error(e);
      onNotify?.('일괄 기각에 실패했습니다.', 'error');
    }
  };

  const runBulkDeleteRecords = async () => {
    if (selectedIdsList.length === 0) return;
    try {
      for (const group of chunkIds(selectedIdsList, 400)) {
        const batch = writeBatch(db);
        group.forEach((rid) => batch.delete(doc(db, 'reports', rid)));
        await batch.commit();
      }
      await logAdminAction(user, 'report.batch_delete_record', {
        detail: { ids: selectedIdsList },
      });
      setSelected(new Set());
      onNotify?.(`${selectedIdsList.length}건의 기록을 삭제했습니다.`);
    } catch (e) {
      console.error(e);
      onNotify?.('일괄 삭제에 실패했습니다.', 'error');
    }
  };

  const showBulkBar = selected.size > 0;

  const bulkCount =
    bulkAction === 'delete' ? selectedIdsList.length : selectedPendingIds.length;

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
        title="신고 기록 삭제"
        message="이 신고 기록을 삭제하시겠습니까? 다음 단계에서 게시글 삭제 여부를 선택합니다."
        confirmText="다음"
        type="danger"
      />

      {deleteStep2Report && (
        <div
          className="admin-step2-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="report-delete-step2-title"
          onClick={() => setDeleteStep2Report(null)}
        >
          <div className="admin-step2-card" onClick={(e) => e.stopPropagation()}>
            <h3 id="report-delete-step2-title">게시글 삭제 여부</h3>
            <p>
              연결된 게시글까지 삭제하면 복구할 수 없습니다. 신고 기록만 삭제할 수도 있습니다.
            </p>
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
              <button
                type="button"
                className="admin-step2-ghost"
                onClick={() => setDeleteStep2Report(null)}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmClearHandled}
        onClose={() => setConfirmClearHandled(false)}
        onConfirm={() => {
          void runClearHandled();
        }}
        title="처리된 신고 일괄 삭제"
        message="완료·기각된 모든 신고 기록을 삭제합니다. 이 작업은 되돌릴 수 없습니다."
        confirmText="삭제"
        type="danger"
      />

      <ConfirmModal
        isOpen={!!confirmDeleteRecordId}
        onClose={() => setConfirmDeleteRecordId(null)}
        onConfirm={() => {
          if (confirmDeleteRecordId) void runDeleteSingleRecord(confirmDeleteRecordId);
        }}
        title="신고 기록 삭제"
        message="이 신고 내역만 삭제합니다. 게시글은 삭제되지 않습니다."
        confirmText="삭제"
        type="danger"
      />

      <ConfirmModal
        isOpen={bulkAction === 'resolve'}
        onClose={() => setBulkAction(null)}
        onConfirm={() => {
          void runBulkResolve();
        }}
        title="일괄 처리 완료"
        message={`선택한 ${bulkCount}건을 처리 완료로 표시합니다.`}
        confirmText="적용"
        type="primary"
      />

      <ConfirmModal
        isOpen={bulkAction === 'dismiss'}
        onClose={() => setBulkAction(null)}
        onConfirm={() => {
          void runBulkDismiss();
        }}
        title="일괄 기각"
        message={`선택한 ${bulkCount}건을 기각합니다.`}
        confirmText="기각"
        type="danger"
      />

      <ConfirmModal
        isOpen={bulkAction === 'delete'}
        onClose={() => setBulkAction(null)}
        onConfirm={() => {
          void runBulkDeleteRecords();
        }}
        title="선택 기록 삭제"
        message={`선택한 ${selectedIdsList.length}건의 신고 기록을 삭제합니다. 게시글은 삭제되지 않습니다.`}
        confirmText="삭제"
        type="danger"
      />

      {syncError && (
        <div
          style={{
            padding: '12px 16px',
            marginBottom: '16px',
            borderRadius: '12px',
            background: 'rgba(255,71,87,0.12)',
            color: '#FF4757',
            fontWeight: 600,
            fontSize: '14px',
          }}
        >
          {syncError}
        </div>
      )}
      <div className="table-header-actions">
        <h3 className="section-title">신고 내역</h3>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {filter === 'resolved' && (
            <button
              type="button"
              onClick={() => setConfirmClearHandled(true)}
              style={{
                padding: '8px 12px',
                background: 'var(--bg-hover)',
                color: '#FF4757',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                border: 'none',
              }}
            >
              기록 전체 삭제
            </button>
          )}
          <button
            type="button"
            onClick={selectAllFiltered}
            style={{
              padding: '8px 12px',
              background: 'var(--bg-hover)',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              color: 'var(--text-main)',
            }}
          >
            {selected.size === filteredReports.length && filteredReports.length > 0
              ? '전체 해제'
              : '전체 선택'}
          </button>
          <div className="admin-filter-tabs">
            <button
              type="button"
              className={`af-tab ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              전체
            </button>
            <button
              type="button"
              className={`af-tab ${filter === 'pending' ? 'active' : ''}`}
              onClick={() => setFilter('pending')}
            >
              미처리
            </button>
            <button
              type="button"
              className={`af-tab ${filter === 'resolved' ? 'active' : ''}`}
              onClick={() => setFilter('resolved')}
            >
              완료/기각
            </button>
          </div>
        </div>
      </div>

      {showBulkBar && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '10px',
            alignItems: 'center',
            padding: '14px 16px',
            marginBottom: '16px',
            borderRadius: '12px',
            border: '1px solid var(--border-light)',
            background: 'var(--bg-main)',
          }}
        >
          <span style={{ fontWeight: 700, fontSize: '14px' }}>{selected.size}건 선택</span>
          <button
            type="button"
            className="admin-btn approve"
            onClick={() => setBulkAction('resolve')}
            disabled={selectedPendingIds.length === 0}
          >
            <CheckCircle size={16} /> 일괄 처리 완료
          </button>
          <button
            type="button"
            className="admin-btn dismiss"
            onClick={() => setBulkAction('dismiss')}
            disabled={selectedPendingIds.length === 0}
          >
            <XCircle size={16} /> 일괄 기각
          </button>
          <button
            type="button"
            className="admin-btn dismiss"
            onClick={() => setBulkAction('delete')}
          >
            <Trash2 size={16} /> 선택 기록 삭제
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          로딩 중...
        </div>
      ) : filteredReports.length === 0 ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
          신고 내역이 없습니다.
        </div>
      ) : (
        <div className="report-cards">
          {filteredReports.map((report) => {
            const pid = report.contentId || '';
            const pinned = pid
              ? pinByPostId[pid] ?? !!report.isPinned
              : !!report.isPinned;
            return (
              <div key={report.id} className={`report-card ${report.status || ''}`}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(report.id)}
                    onChange={() => toggleSelect(report.id)}
                    style={{ marginTop: '4px' }}
                  />
                  <span style={{ flex: 1 }}>
                    <div className="report-top">
                      <span className="report-type-badge">{report.type}</span>
                      <span className={`report-status ${report.status}`}>
                        {report.status === 'pending' ? (
                          <>
                            <Clock size={14} /> 미처리
                          </>
                        ) : report.status === 'dismissed' ? (
                          <>
                            <XCircle size={14} /> 기각
                          </>
                        ) : (
                          <>
                            <CheckCircle size={14} /> 완료
                          </>
                        )}
                      </span>
                    </div>
                    <p className="report-content">&quot;{report.content}&quot;</p>
                    <div className="report-meta">
                      <span>사유: {report.reason}</span>
                      <span>신고자: {report.reporter}</span>
                      <span>{report.date}</span>
                    </div>
                  </span>
                </label>
                <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="admin-btn"
                    onClick={() => pid && handleTogglePin(pid, pinned)}
                    disabled={!pid}
                    style={{
                      color: pinned ? 'var(--primary)' : 'var(--text-muted)',
                      borderColor: pinned ? 'var(--primary)' : 'var(--border-light)',
                      opacity: pid ? 1 : 0.5,
                    }}
                  >
                    <Pin size={16} />
                    {pinned ? '핀 해제' : '상단 고정'}
                  </button>
                  {pid ? (
                    <a
                      href={`/post/${pid}`}
                      target="_blank"
                      rel="noreferrer"
                      className="admin-btn"
                      style={{ textDecoration: 'none' }}
                    >
                      <Link2 size={16} />
                      게시글 보기
                    </a>
                  ) : null}
                </div>
                {report.status === 'pending' ? (
                  <div className="report-actions">
                    <button
                      type="button"
                      className="admin-btn approve"
                      onClick={() => handleResolve(report.id)}
                    >
                      <CheckCircle size={16} /> 처리 완료
                    </button>
                    <button
                      type="button"
                      className="admin-btn delete"
                      onClick={() => setDeleteStep1Report(report)}
                    >
                      <Trash2 size={16} /> 신고 삭제…
                    </button>
                    <button
                      type="button"
                      className="admin-btn dismiss"
                      onClick={() => handleDismiss(report.id)}
                    >
                      <XCircle size={16} /> 기각
                    </button>
                  </div>
                ) : (
                  <div className="report-actions">
                    <button
                      type="button"
                      className="admin-btn dismiss"
                      onClick={() => setConfirmDeleteRecordId(report.id)}
                    >
                      <Trash2 size={16} /> 기록 삭제
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
