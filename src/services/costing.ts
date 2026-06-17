import { db } from './db';
import type { Item } from '../types';

export const costingService = {
  /**
   * Menghitung Harga Rata-Rata Bergerak (Moving Average Cost)
   * Formula: ((Stok Lama x Avg Cost Lama) + (Qty Masuk x Harga Beli Bersih)) / (Stok Lama + Qty Masuk)
   */
  calculateMovingAverageCost(oldStock: number, oldAvgCost: number, newQty: number, netPurchaseCost: number): number {
    if (newQty <= 0) return oldAvgCost; // Menghindari pembagian tidak valid jika tidak ada qty masuk baru

    const oldTotalValue = oldStock * oldAvgCost;
    const newTotalValue = newQty * netPurchaseCost;

    const totalQty = oldStock + newQty;
    
    if (totalQty === 0) return 0;
    
    return (oldTotalValue + newTotalValue) / totalQty;
  },

  /**
   * Mengambil Average Cost saat ini dari tabel item
   */
  getItemAverageCost(itemId: string): number {
    const item = db.getById<Item>('items', itemId);
    if (!item) return 0;
    return item.avg_cost || 0;
  }
};
