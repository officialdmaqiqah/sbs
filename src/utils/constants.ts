import type { ChartOfAccount } from '../types';

export const CHART_OF_ACCOUNTS: ChartOfAccount[] = [
  // Aset
  { id: '1001', code: '1001', name: 'Kas', type: 'Aset' },
  { id: '1002', code: '1002', name: 'Bank', type: 'Aset' },
  { id: '1003', code: '1003', name: 'Piutang usaha', type: 'Aset' },
  { id: '1004', code: '1004', name: 'Persediaan ayam', type: 'Aset' },
  { id: '1005', code: '1005', name: 'Persediaan bahan kandang', type: 'Aset' },
  { id: '1006', code: '1006', name: 'Persediaan kandang jadi', type: 'Aset' },
  { id: '1007', code: '1007', name: 'Persediaan bahan pakan', type: 'Aset' },
  { id: '1008', code: '1008', name: 'Persediaan pakan jadi', type: 'Aset' },
  { id: '1009', code: '1009', name: 'Persediaan telur', type: 'Aset' },
  
  // Kewajiban
  { id: '2001', code: '2001', name: 'Hutang supplier', type: 'Kewajiban' },
  { id: '2002', code: '2002', name: 'DP customer', type: 'Kewajiban' },
  { id: '2003', code: '2003', name: 'Hutang bagi hasil', type: 'Kewajiban' },
  { id: '2004', code: '2004', name: 'Hutang CSR', type: 'Kewajiban' },
  
  // Modal
  { id: '3001', code: '3001', name: 'Modal investor project', type: 'Modal' },
  { id: '3002', code: '3002', name: 'Kas perusahaan', type: 'Modal' },
  { id: '3003', code: '3003', name: 'Saldo laba project', type: 'Modal' },
  
  // Pendapatan
  { id: '4001', code: '4001', name: 'Penjualan paket usaha', type: 'Pendapatan' },
  { id: '4002', code: '4002', name: 'Penjualan ayam', type: 'Pendapatan' },
  { id: '4003', code: '4003', name: 'Penjualan kandang', type: 'Pendapatan' },
  { id: '4004', code: '4004', name: 'Penjualan telur', type: 'Pendapatan' },
  { id: '4005', code: '4005', name: 'Penjualan pakan', type: 'Pendapatan' },
  
  // HPP
  { id: '5001', code: '5001', name: 'HPP paket usaha', type: 'HPP' },
  { id: '5002', code: '5002', name: 'HPP ayam', type: 'HPP' },
  { id: '5003', code: '5003', name: 'HPP kandang', type: 'HPP' },
  { id: '5004', code: '5004', name: 'HPP pakan', type: 'HPP' },
  { id: '5005', code: '5005', name: 'HPP telur', type: 'HPP' },
  
  // Biaya
  { id: '6001', code: '6001', name: 'Biaya produksi', type: 'Biaya' },
  { id: '6002', code: '6002', name: 'Biaya distribusi', type: 'Biaya' },
  { id: '6003', code: '6003', name: 'Biaya marketing', type: 'Biaya' },
  { id: '6004', code: '6004', name: 'Biaya operasional', type: 'Biaya' },
  { id: '6005', code: '6005', name: 'Biaya admin', type: 'Biaya' },
  { id: '6006', code: '6006', name: 'Biaya lain-lain', type: 'Biaya' },
];
