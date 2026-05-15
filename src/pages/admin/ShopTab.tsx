import { useEffect, useMemo, useRef, useState } from 'react';
import { Palette, PencilLine, Plus, Ticket, Trash2 } from 'lucide-react';
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, updateDoc, writeBatch } from 'firebase/firestore';
import { useSearchParams } from 'react-router-dom';
import { db } from '../../firebase';
import { DEFAULT_SHOP_ITEMS } from '../../constants/defaultShopItems';
import { logAdminAction } from '../../lib/adminAudit';
import { isAdminUser } from '../../lib/isAdmin';
import { useAuthStore } from '../../store/authStore';
import type { AdminNotify } from '../../hooks/useAdminToast';
import type { AdminShopItem } from '../../types/admin';
import ConfirmModal from '../../components/ui/ConfirmModal';

type Props = {
  onNotify?: AdminNotify;
};

type ShopFormState = {
  name: string;
  description: string;
  price: number;
  type: 'badge' | 'nameColor' | 'profileBg' | 'avatarFrame';
  style: string;
};

const initialForm: ShopFormState = {
  name: '',
  description: '',
  price: 1000,
  type: 'badge',
  style: '',
};

function getPreviewStyle(type: ShopFormState['type'], style: string) {
  if (type === 'profileBg') return { background: style || 'linear-gradient(135deg, #6c5ce7, #4da3ff)' };
  if (type === 'avatarFrame') return { borderColor: style || '#f59e0b' };
  return {};
}

export default function ShopTab({ onNotify }: Props) {
  const { user } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [shopItems, setShopItems] = useState<AdminShopItem[]>([]);
  const [draft, setDraft] = useState<ShopFormState>(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [shopSaving, setShopSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminShopItem | null>(null);
  const seedAttemptedRef = useRef(false);

  useEffect(() => {
    const q = query(collection(db, 'shop_items'), orderBy('price', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setShopItems(
        snap.docs.map((entry) => ({
          id: entry.id,
          ...(entry.data() as Omit<AdminShopItem, 'id'>),
        }))
      );

      if (!snap.empty || seedAttemptedRef.current || !isAdminUser(user)) {
        return;
      }

      seedAttemptedRef.current = true;
      void (async () => {
        try {
          const batch = writeBatch(db);
          const createdAt = Date.now();

          DEFAULT_SHOP_ITEMS.forEach((item) => {
            batch.set(doc(db, 'shop_items', item.id), {
              name: item.name,
              description: item.description,
              price: item.price,
              type: item.type,
              style: item.style,
              createdAt,
            });
          });

          await batch.commit();
          await logAdminAction(user, 'shop.seed_defaults', {
            targetCollection: 'shop_items',
            detail: { itemIds: DEFAULT_SHOP_ITEMS.map((item) => item.id), count: DEFAULT_SHOP_ITEMS.length },
          });
          onNotify?.('기본 상점 아이템이 생성되었습니다.');
        } catch (error) {
          seedAttemptedRef.current = false;
          console.error('Error seeding default shop items:', error);
          onNotify?.('기본 상점 아이템 생성에 실패했습니다.', 'error');
        }
      })();
    });
    return () => unsub();
  }, [onNotify, user]);

  useEffect(() => {
    if (searchParams.get('focus') === 'shop-new') {
      const next = new URLSearchParams(searchParams);
      next.delete('focus');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const previewStyle = useMemo(() => getPreviewStyle(draft.type, draft.style), [draft.style, draft.type]);

  const resetForm = () => {
    setDraft(initialForm);
    setEditingId(null);
  };

  const validateForm = () => {
    if (!draft.name.trim()) return '상품 이름을 입력해 주세요.';
    if (draft.price <= 0) return '가격은 0보다 커야 합니다.';
    if (!draft.description.trim()) return '상품 설명을 입력해 주세요.';
    if ((draft.type === 'nameColor' || draft.type === 'avatarFrame') && !draft.style.trim()) {
      return '선택한 타입에는 스타일 값이 필요합니다.';
    }
    return null;
  };

  const handleSave = async () => {
    const error = validateForm();
    if (error) {
      onNotify?.(error, 'error');
      return;
    }

    setShopSaving(true);
    try {
      const payload = {
        name: draft.name.trim(),
        description: draft.description.trim(),
        price: Number(draft.price),
        type: draft.type,
        style: draft.style.trim(),
        createdAt: Date.now(),
      };

      if (editingId) {
        await updateDoc(doc(db, 'shop_items', editingId), payload);
        await logAdminAction(user, 'shop.item_update', {
          targetCollection: 'shop_items',
          targetId: editingId,
          detail: payload,
        });
        onNotify?.('상품을 수정했습니다.');
      } else {
        const ref = await addDoc(collection(db, 'shop_items'), payload);
        await logAdminAction(user, 'shop.item_create', {
          targetCollection: 'shop_items',
          targetId: ref.id,
          detail: payload,
        });
        onNotify?.('상품을 추가했습니다.');
      }
      resetForm();
    } catch (e) {
      console.error(e);
      onNotify?.('상품 저장에 실패했습니다.', 'error');
    } finally {
      setShopSaving(false);
    }
  };

  return (
    <div className="admin-content">
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          try {
            await deleteDoc(doc(db, 'shop_items', deleteTarget.id));
            await logAdminAction(user, 'shop.item_delete', {
              targetCollection: 'shop_items',
              targetId: deleteTarget.id,
            });
            onNotify?.('상품을 삭제했습니다.');
          } catch (e) {
            console.error(e);
            onNotify?.('상품 삭제에 실패했습니다.', 'error');
          }
        }}
        title="상품 삭제"
        message="선택한 상품을 상점에서 삭제합니다. 이 작업은 되돌릴 수 없습니다."
        confirmText="삭제"
        type="danger"
      />

      <div className="table-header-actions">
        <div>
          <h3 className="section-title">상점 상품 관리</h3>
          <p className="admin-section-description">배지, 이름색, 프로필 배경, 아바타 프레임 상품을 관리합니다.</p>
        </div>
      </div>

      <div className="admin-split-grid">
        <div className="admin-panel">
          <div className="admin-panel-header">
            <span>{editingId ? '상품 수정' : '새 상품 등록'}</span>
          </div>
          <div className="admin-form-grid">
            <label className="admin-field">
              <span>상품 이름</span>
              <input value={draft.name} onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))} />
            </label>
            <label className="admin-field">
              <span>가격</span>
              <input
                type="number"
                value={draft.price}
                onChange={(e) => setDraft((prev) => ({ ...prev, price: Number(e.target.value) }))}
              />
            </label>
            <label className="admin-field">
              <span>타입</span>
              <select
                value={draft.type}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    type: e.target.value as ShopFormState['type'],
                  }))
                }
              >
                <option value="badge">배지</option>
                <option value="nameColor">이름색</option>
                <option value="profileBg">프로필 배경</option>
                <option value="avatarFrame">아바타 프레임</option>
              </select>
            </label>
            <label className="admin-field">
              <span>스타일</span>
              <input
                value={draft.style}
                onChange={(e) => setDraft((prev) => ({ ...prev, style: e.target.value }))}
                placeholder="#FFD700 또는 linear-gradient(...)"
              />
            </label>
            <label className="admin-field admin-field-wide">
              <span>설명</span>
              <textarea
                value={draft.description}
                onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="상품 설명을 입력해 주세요."
              />
            </label>
          </div>

          <div className="admin-preview-card">
            <div className="admin-preview-header">
              <Palette size={16} />
              <span>상품 미리보기</span>
            </div>
            <div className="shop-preview-card">
              <div className="shop-preview-visual">
                {draft.type === 'badge' && <div className="shop-preview-badge">{draft.name || 'NEW BADGE'}</div>}
                {draft.type === 'nameColor' && (
                  <div className="shop-preview-name" style={{ color: draft.style || '#6c5ce7' }}>
                    Schooly Admin
                  </div>
                )}
                {draft.type === 'profileBg' && <div className="shop-preview-bg" style={previewStyle} />}
                {draft.type === 'avatarFrame' && (
                  <div className="shop-preview-frame" style={previewStyle}>
                    <div className="shop-preview-frame-inner" />
                  </div>
                )}
              </div>
              <div>
                <div className="shop-preview-title">{draft.name || '상품 이름'}</div>
                <div className="shop-preview-desc">{draft.description || '설명이 여기에 표시됩니다.'}</div>
              </div>
            </div>
          </div>

          <div className="admin-panel-actions">
            {editingId && (
              <button type="button" className="admin-btn dismiss" onClick={resetForm}>
                수정 취소
              </button>
            )}
            <button type="button" className="admin-btn approve" onClick={handleSave} disabled={shopSaving}>
              {editingId ? <PencilLine size={16} /> : <Plus size={16} />}
              {editingId ? '상품 저장' : '상품 등록'}
            </button>
          </div>
        </div>

        <div className="admin-panel">
          <div className="admin-panel-header">
            <span>판매 중인 상품 {shopItems.length}개</span>
          </div>
          <div className="admin-list">
            {shopItems.length === 0 ? (
              <div className="admin-empty">등록된 상품이 없습니다.</div>
            ) : (
              shopItems.map((item) => (
                <div key={item.id} className="admin-list-card">
                  <div className="admin-list-main">
                    <div className="admin-inline-icon">
                      <Ticket size={16} />
                    </div>
                    <div>
                      <div className="admin-list-title">
                        {item.name} <span className="admin-chip">{item.type}</span>
                      </div>
                      <div className="admin-list-description">{item.description}</div>
                      <div className="admin-meta-row">
                        <span>{(item.price ?? 0).toLocaleString()}P</span>
                        <span>{item.style || '스타일 없음'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="admin-inline-actions">
                    <button
                      type="button"
                      className="admin-btn"
                      onClick={() => {
                        setDraft({
                          name: item.name || '',
                          description: item.description || '',
                          price: item.price || 0,
                          type: item.type || 'badge',
                          style: item.style || '',
                        });
                        setEditingId(item.id);
                      }}
                    >
                      <PencilLine size={16} />
                      수정
                    </button>
                    <button type="button" className="admin-btn delete" onClick={() => setDeleteTarget(item)}>
                      <Trash2 size={16} />
                      삭제
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
