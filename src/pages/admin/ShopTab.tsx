import { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { logAdminAction } from '../../lib/adminAudit';
import { useAuthStore } from '../../store/authStore';

export default function ShopTab() {
  const { user } = useAuthStore();
  const [shopItems, setShopItems] = useState<{ id: string; name?: string; description?: string; price?: number; type?: string; style?: string }[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemPrice, setNewItemPrice] = useState(1000);
  const [newItemType, setNewItemType] = useState<
    'badge' | 'nameColor' | 'profileBg' | 'avatarFrame'
  >('badge');
  const [newItemStyle, setNewItemStyle] = useState('');
  const [shopSaving, setShopSaving] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'shop_items'), orderBy('price', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setShopItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const handleCreateShopItem = async () => {
    if (!newItemName.trim() || newItemPrice === undefined || newItemPrice === null) return;
    setShopSaving(true);
    try {
      const ref = await addDoc(collection(db, 'shop_items'), {
        name: newItemName,
        description: newItemDesc,
        price: newItemPrice,
        type: newItemType,
        style: newItemStyle,
        createdAt: Date.now(),
      });
      await logAdminAction(user, 'shop.item_create', {
        targetCollection: 'shop_items',
        targetId: ref.id,
        detail: { name: newItemName, price: newItemPrice, type: newItemType },
      });
      setNewItemName('');
      setNewItemDesc('');
      setNewItemPrice(1000);
      alert('아이템이 등록되었습니다.');
    } catch (e: unknown) {
      console.error(e);
      const msg = e instanceof Error ? e.message : String(e);
      alert('아이템 등록 실패: ' + msg);
    } finally {
      setShopSaving(false);
    }
  };

  const handleDeleteShopItem = async (id: string) => {
    if (!window.confirm('이 상품을 상점에서 삭제할까요?')) return;
    try {
      await deleteDoc(doc(db, 'shop_items', id));
      await logAdminAction(user, 'shop.item_delete', {
        targetCollection: 'shop_items',
        targetId: id,
      });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="admin-content">
      <div
        style={{
          background: 'var(--bg-main)',
          padding: '24px',
          borderRadius: '16px',
          border: '1px solid var(--border-light)',
          marginBottom: '32px',
        }}
      >
        <h3 className="section-title" style={{ marginBottom: '20px' }}>
          🎁 새 상품 등록
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div className="input-field">
            <label
              style={{ fontSize: '13px', fontWeight: 700, display: 'block', marginBottom: '6px' }}
            >
              아이템 이름
            </label>
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder="예: [Gold] 칭호"
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '10px',
                border: '1px solid var(--border-light)',
                background: 'var(--bg-card)',
                color: 'var(--text-main)',
              }}
            />
          </div>
          <div className="input-field">
            <label
              style={{ fontSize: '13px', fontWeight: 700, display: 'block', marginBottom: '6px' }}
            >
              가격 (Points)
            </label>
            <input
              type="number"
              value={newItemPrice}
              onChange={(e) => setNewItemPrice(Number(e.target.value))}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '10px',
                border: '1px solid var(--border-light)',
                background: 'var(--bg-card)',
                color: 'var(--text-main)',
              }}
            />
          </div>
          <div className="input-field">
            <label
              style={{ fontSize: '13px', fontWeight: 700, display: 'block', marginBottom: '6px' }}
            >
              아이템 종류
            </label>
            <select
              value={newItemType}
              onChange={(e) =>
                setNewItemType(e.target.value as 'badge' | 'nameColor' | 'profileBg' | 'avatarFrame')
              }
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '10px',
                border: '1px solid var(--border-light)',
                background: 'var(--bg-card)',
                color: 'var(--text-main)',
              }}
            >
              <option value="badge">칭호 (Badge)</option>
              <option value="nameColor">이름 색상 (Color)</option>
              <option value="profileBg">프로필 배경 (Background)</option>
              <option value="avatarFrame">아바타 테두리 (Frame)</option>
            </select>
          </div>
          <div className="input-field">
            <label
              style={{ fontSize: '13px', fontWeight: 700, display: 'block', marginBottom: '6px' }}
            >
              스타일 (Color Hex / Gradient)
            </label>
            <input
              type="text"
              value={newItemStyle}
              onChange={(e) => setNewItemStyle(e.target.value)}
              placeholder="예: #FFD700 또는 linear-gradient(...)"
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '10px',
                border: '1px solid var(--border-light)',
                background: 'var(--bg-card)',
                color: 'var(--text-main)',
              }}
            />
          </div>
          <div className="input-field" style={{ gridColumn: 'span 2' }}>
            <label
              style={{ fontSize: '13px', fontWeight: 700, display: 'block', marginBottom: '6px' }}
            >
              상품 설명
            </label>
            <textarea
              value={newItemDesc}
              onChange={(e) => setNewItemDesc(e.target.value)}
              placeholder="아이템에 대한 설명을 간단히 입력하세요."
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '10px',
                border: '1px solid var(--border-light)',
                background: 'var(--bg-card)',
                color: 'var(--text-main)',
                minHeight: '80px',
              }}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={handleCreateShopItem}
          disabled={shopSaving}
          className="admin-btn approve"
          style={{ marginTop: '20px', width: '100%', padding: '14px', fontSize: '16px' }}
        >
          {shopSaving ? '등록 중...' : '상품 출시하기'}
        </button>
      </div>

      <h3 className="section-title" style={{ marginBottom: '16px' }}>
        현재 판매 중인 목록 ({shopItems.length})
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
        {shopItems.map((item) => (
          <div
            key={item.id}
            style={{
              padding: '20px',
              borderRadius: '16px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-light)',
              position: 'relative',
            }}
          >
            <div
              style={{
                fontSize: '11px',
                color: 'var(--primary)',
                fontWeight: 800,
                marginBottom: '4px',
              }}
            >
              {item.type?.toUpperCase()}
            </div>
            <div
              style={{
                fontSize: '18px',
                fontWeight: 800,
                marginBottom: '8px',
                color: item.type === 'nameColor' ? item.style : 'var(--text-main)',
              }}
            >
              {item.name}
            </div>
            <div
              style={{
                fontSize: '13px',
                color: 'var(--text-muted)',
                marginBottom: '16px',
                minHeight: '32px',
              }}
            >
              {item.description}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 800, color: '#f59e0b' }}>
                💎 {item.price?.toLocaleString()} P
              </div>
              <button
                type="button"
                onClick={() => handleDeleteShopItem(item.id)}
                style={{
                  padding: '6px',
                  color: '#FF4757',
                  background: 'rgba(255,71,87,0.05)',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
