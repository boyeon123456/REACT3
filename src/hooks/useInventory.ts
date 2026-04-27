import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import type { InventoryItem } from '../types/profile';
import { useAuthStore } from '../store/authStore';

export function useInventory() {
  const user = useAuthStore((state) => state.user);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [shopItemsMap, setShopItemsMap] = useState<Record<string, InventoryItem>>({});

  useEffect(() => {
    if (!user?.id) return undefined;

    const unsubscribeInventory = onSnapshot(collection(db, 'users', user.id, 'inventory'), (snapshot) => {
      setInventory(snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<InventoryItem, 'id'>) })));
    });

    const unsubscribeShopItems = onSnapshot(collection(db, 'shop_items'), (snapshot) => {
      const itemMap: Record<string, InventoryItem> = {};
      snapshot.forEach((item) => {
        itemMap[item.id] = { id: item.id, ...(item.data() as Omit<InventoryItem, 'id'>) };
      });
      setShopItemsMap(itemMap);
    });

    return () => {
      unsubscribeInventory();
      unsubscribeShopItems();
    };
  }, [user?.id]);

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const equippedItems = useMemo(() => {
    if (!user?.equipped_items) return [];
    return Object.values(user.equipped_items)
      .map((itemId) => shopItemsMap[itemId as string])
      .filter(Boolean);
  }, [shopItemsMap, user?.equipped_items]);

  return {
    inventory,
    shopItemsMap,
    equippedItems,
  };
}
