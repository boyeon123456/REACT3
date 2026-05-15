import { useEffect, useMemo, useState } from 'react';
import { collection, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { InventoryItem } from '../types/profile';
import { useAuthStore } from '../store/authStore';

export function useInventory() {
  const user = useAuthStore((state) => state.user);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [shopItemsMap, setShopItemsMap] = useState<Record<string, InventoryItem>>({});

  const inventoryMap = useMemo(
    () =>
      inventory.reduce<Record<string, InventoryItem>>((acc, item) => {
        acc[item.id] = item;
        return acc;
      }, {}),
    [inventory]
  );

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

  const equippedItems = (() => {
    if (!user?.equipped_items) return [];
    return Object.values(user.equipped_items)
      .map((itemId) => inventoryMap[itemId as string])
      .filter(Boolean);
  })();

  const equippedItemsByType = useMemo(
    () =>
      equippedItems.reduce<Partial<Record<InventoryItem['type'], InventoryItem>>>((acc, item) => {
        acc[item.type] = item;
        return acc;
      }, {}),
    [equippedItems]
  );
  const badgeItems = useMemo(() => inventory.filter((item) => item.type === 'badge'), [inventory]);

  useEffect(() => {
    if (!user?.id || !user.equipped_items) return;

    const nextEquipped = Object.entries(user.equipped_items).reduce<Record<string, string>>((acc, [type, itemId]) => {
      if (inventoryMap[itemId]) {
        acc[type] = itemId;
      }
      return acc;
    }, {});

    const currentKeys = Object.keys(user.equipped_items);
    const nextKeys = Object.keys(nextEquipped);

    if (currentKeys.length === nextKeys.length) return;

    updateDoc(doc(db, 'users', user.id), { equipped_items: nextEquipped }).catch((error) => {
      console.error('Error cleaning removed equipped items:', error);
    });
  }, [inventoryMap, user?.equipped_items, user?.id]);

  return {
    inventory,
    inventoryMap,
    shopItemsMap,
    equippedItems,
    equippedItemsByType,
    badgeItems,
  };
}
