import { useMemo, useState } from 'react';
import { ChevronRight, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { typeLabels } from '../../types/profile';
import type { InventoryFilter, InventoryItem } from '../../types/profile';

const inventoryFilters: { key: InventoryFilter; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'badge', label: '배지' },
  { key: 'nameColor', label: '닉네임 색상' },
  { key: 'profileBg', label: '배경' },
  { key: 'avatarFrame', label: '프레임' },
];

import type { User } from '../../store/authStore';

interface ProfileInventoryProps {
  user: User;
  inventory: InventoryItem[];
  handleEquip: (item: InventoryItem) => void;
}

export default function ProfileInventory({ user, inventory, handleEquip }: ProfileInventoryProps) {
  const navigate = useNavigate();
  const [inventoryFilter, setInventoryFilter] = useState<InventoryFilter>('all');

  const filteredInventory = useMemo(() => {
    if (inventoryFilter === 'all') return inventory;
    return inventory.filter((item) => item.type === inventoryFilter);
  }, [inventory, inventoryFilter]);

  return (
    <div className="content-stack">
      <article className="content-card">
        <div className="section-heading">
          <div>
            <p className="section-kicker">INVENTORY</p>
            <h3>내 아이템 관리</h3>
          </div>
          <button type="button" className="inline-action" onClick={() => navigate('/shop')}>
            상점으로 이동
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="filter-row">
          {inventoryFilters.map((filter) => (
            <button
              key={filter.key}
              type="button"
              className={`filter-chip ${inventoryFilter === filter.key ? 'active' : ''}`}
              onClick={() => setInventoryFilter(filter.key)}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {filteredInventory.length === 0 ? (
          <div className="empty-panel large">
            <ShoppingBag size={20} />
            <span>선택한 조건에 맞는 아이템이 없어요.</span>
          </div>
        ) : (
          <div className="inventory-grid-v4">
            {filteredInventory.map((item) => {
              const isEquipped = user.equipped_items?.[item.type] === item.id;

              return (
                <article key={item.id} className={`inventory-card ${isEquipped ? 'equipped' : ''}`}>
                  <div className="inventory-card-top">
                    <span className="inventory-type">{typeLabels[item.type]}</span>
                    {isEquipped && <span className="equipped-badge">적용 중</span>}
                  </div>

                  <div className="inventory-preview">
                    {item.type === 'profileBg' && <div className="preview-bar" style={{ background: item.style }} />}
                    {item.type === 'avatarFrame' && <div className="preview-ring" style={{ borderColor: item.style }} />}
                    {item.type === 'nameColor' && <strong style={{ color: item.style }}>닉네임 미리보기</strong>}
                    {item.type === 'badge' && <strong className="badge-preview">{item.name}</strong>}
                  </div>

                  <div className="inventory-card-copy">
                    <strong>{item.name}</strong>
                    <p>{typeLabels[item.type]} 아이템</p>
                  </div>

                  <button
                    type="button"
                    className={`inventory-action ${isEquipped ? 'secondary' : ''}`}
                    onClick={() => handleEquip(item)}
                  >
                    {isEquipped ? '장착 해제' : '장착하기'}
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </article>
    </div>
  );
}
