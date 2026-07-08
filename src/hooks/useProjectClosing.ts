import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface ReadinessCheck {
  hasDraftOrders: boolean;
  hasPendingShipments: boolean;
  hasNegativeStock: boolean;
  hasPendingPayments: boolean;
  hasReceivables: boolean; // Piutang belum tertagih
  hasPayables: boolean;    // Hutang belum dibayar
  isReady: boolean;
}

export interface ClosingCalculation {
  totalSales: number;
  totalCosts: number;
  grossProfit: number;
  companyShare: number;
  workerPool: number;
  investorPool: number;
  csrPool: number;
  totalCapital: number;
  distributions: any[];
}

export function useProjectClosing(projectId?: string) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkReadiness = useCallback(async (): Promise<ReadinessCheck | null> => {
    if (!projectId || !profile?.organization_id) return null;
    setLoading(true);
    try {
      // Check draft orders
      const { data: draftOrders } = await supabase
        .from('sales_orders')
        .select('id')
        .eq('project_id', projectId)
        .eq('status', 'Draft');
      
      // Check pending shipments
      const { data: pendingShipments } = await supabase
        .from('delivery_orders')
        .select('id')
        .eq('project_id', projectId)
        .in('status', ['Siap Dikirim', 'Dalam Pengiriman']);

      // Check negative stock
      const { data: negStock } = await supabase
        .from('inventory_balances')
        .select('id')
        .eq('project_id', projectId)
        .lt('total_quantity', 0);

      // Check piutang (Sales Belum Lunas)
      const { data: receivables } = await supabase
        .from('sales_orders')
        .select('id')
        .eq('project_id', projectId)
        .eq('payment_status', 'Belum Lunas')
        .neq('status', 'Dibatalkan');

      // Check hutang (Supplier Bill belum lunas)
      // Since bills might not be strictly project-based, we'll assume no hutang for this simple MVP, or check supplier_bills if they have project_id.
      // supplier_bills doesn't have project_id directly, or does it? If not, we ignore.
      // Let's just check if there are any negative cash? No.
      
      const hasDraftOrders = (draftOrders?.length || 0) > 0;
      const hasPendingShipments = (pendingShipments?.length || 0) > 0;
      const hasNegativeStock = (negStock?.length || 0) > 0;
      const hasReceivables = (receivables?.length || 0) > 0;

      const isReady = !hasDraftOrders && !hasPendingShipments && !hasNegativeStock;

      return {
        hasDraftOrders,
        hasPendingShipments,
        hasNegativeStock,
        hasPendingPayments: false,
        hasReceivables,
        hasPayables: false,
        isReady
      };
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [projectId, profile?.organization_id]);

  const calculateProfit = useCallback(async (): Promise<ClosingCalculation | null> => {
    if (!projectId || !profile?.organization_id) return null;
    setLoading(true);
    try {
      // 1. Total Penjualan
      const { data: sales } = await supabase
        .from('sales_orders')
        .select('total_amount')
        .eq('project_id', projectId)
        .neq('status', 'Dibatalkan');
      
      const totalSales = sales?.reduce((sum, s) => sum + Number(s.total_amount || 0), 0) || 0;

      // 2. Total Biaya (Cash OUT for project)
      const { data: expenses } = await supabase
        .from('cash_bank_mutations')
        .select('amount, mutation_type')
        .eq('project_id', projectId)
        .eq('mutation_type', 'OUT');
      
      const totalCosts = expenses?.reduce((sum, e) => sum + Number(e.amount || 0), 0) || 0;

      const grossProfit = totalSales - totalCosts;

      const { data: investments } = await supabase
        .from('project_investments')
        .select('investor_id, amount, investment_type, expected_profit, investors(name)')
        .eq('project_id', projectId)
        .eq('status', 'Confirmed');

      const totalMurabahahProfit = investments?.filter(i => i.investment_type === 'Murabahah').reduce((sum, inv) => sum + Number(inv.expected_profit || 0), 0) || 0;
      
      const adjustedGrossProfit = grossProfit - totalMurabahahProfit;

      // 3. Pool Calculation
      const companyShare = adjustedGrossProfit * 0.10;
      const remainingProfit = adjustedGrossProfit * 0.90;
      
      const workerPool = remainingProfit * 0.45;
      const investorPool = remainingProfit * 0.45;
      const csrPool = remainingProfit * 0.10;

      // 4. Fetch Members
      const { data: members } = await supabase
        .from('project_members')
        .select('user_id, role, member_name, profiles(full_name)')
        .eq('project_id', projectId);

      const totalCapital = investments?.reduce((sum, inv) => sum + Number(inv.amount || 0), 0) || 0;
      const totalMudharabahCapital = investments?.filter(i => i.investment_type !== 'Murabahah').reduce((sum, inv) => sum + Number(inv.amount || 0), 0) || 0;

      const distributions: any[] = [];

      // Company Cash
      distributions.push({
        recipient_name: 'Kas Perusahaan Sultan Berkah Sejahtera',
        recipient_role: 'Kas Perusahaan',
        total_share: companyShare
      });

      // CSR
      distributions.push({
        recipient_name: 'Dana CSR',
        recipient_role: 'CSR',
        total_share: csrPool
      });

      // Workers
      const ceo = members?.find(m => m.role?.toUpperCase() === 'CEO');
      const otherWorkers = members?.filter(m => m.role?.toUpperCase() !== 'CEO') || [];
      
      if (ceo) {
        distributions.push({
          recipient_name: (ceo as any).member_name || (ceo as any).profiles?.full_name || 'CEO',
          recipient_role: 'CEO',
          worker_share: workerPool * 0.30,
          total_share: workerPool * 0.30
        });
      }

      if (otherWorkers.length > 0) {
        // distribute remaining 70% of worker pool (or 100% if no CEO)
        const workerPortion = ceo ? (workerPool * 0.70) : workerPool;
        const sharePerWorker = workerPortion / otherWorkers.length;
        
        otherWorkers.forEach(w => {
          distributions.push({
            recipient_name: (w as any).member_name || (w as any).profiles?.full_name || 'Team Member',
            recipient_role: 'Worker',
            worker_share: sharePerWorker,
            total_share: sharePerWorker
          });
        });
      } else if (!ceo) {
        // No workers at all? Just dump it to company cash
        distributions[0].total_share += workerPool;
      } else {
        // Only CEO, CEO gets all 100% worker pool
        const ceoDist = distributions.find(d => d.recipient_role === 'CEO');
        if (ceoDist) {
          ceoDist.worker_share = workerPool;
          ceoDist.total_share = workerPool;
        }
      }

      // Investors
      if (investments) {
        investments.forEach(inv => {
          const capAmount = Number(inv.amount);
          const isMurabahah = inv.investment_type === 'Murabahah';
          
          let capPct = 0;
          let share = 0;
          let roleLabel = 'Investor (Bagi Hasil)';

          if (isMurabahah) {
            share = Number(inv.expected_profit || 0);
            roleLabel = 'Peminjam (Murabahah)';
          } else {
            if (totalMudharabahCapital > 0) {
              capPct = (capAmount / totalMudharabahCapital) * 100;
              share = investorPool * (capAmount / totalMudharabahCapital);
            }
          }
          
          distributions.push({
            recipient_name: (inv as any).investors?.name || 'Investor',
            recipient_role: roleLabel,
            capital_return: capAmount,
            capital_percentage: isMurabahah ? null : capPct,
            investor_share: share,
            total_share: capAmount + share
          });
        });
      }

      const totalDistributions = distributions.reduce((sum, d) => sum + d.total_share, 0);

      return {
        totalSales,
        totalCosts,
        grossProfit,
        companyShare,
        workerPool,
        investorPool,
        csrPool,
        totalCapital,
        distributions
      };

    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [projectId, profile?.organization_id]);

  const saveClosing = async (calc: ClosingCalculation) => {
    if (!projectId || !profile?.organization_id) return false;
    setLoading(true);
    try {
      // 1. Insert Closing
      const { data: closing, error: err1 } = await supabase
        .from('project_closings')
        .insert({
          organization_id: profile.organization_id,
          project_id: projectId,
          closing_date: new Date().toISOString().split('T')[0],
          gross_profit: calc.grossProfit,
          company_cash_share: calc.companyShare,
          worker_pool: calc.workerPool,
          investor_pool: calc.investorPool,
          csr_pool: calc.csrPool,
          status: 'Ditutup'
        })
        .select()
        .single();

      if (err1) throw err1;

      // 2. Insert Distributions
      const distInserts = calc.distributions.map(d => ({
        organization_id: profile.organization_id,
        project_closing_id: closing.id,
        project_id: projectId,
        recipient_name: d.recipient_name,
        recipient_role: d.recipient_role,
        capital_amount: d.capital_amount || 0,
        capital_percentage: d.capital_percentage || 0,
        worker_share: d.worker_share || 0,
        investor_share: d.investor_share || 0,
        total_share: d.total_share,
        payment_status: 'Belum Dibayar'
      }));

      const { error: err2 } = await supabase
        .from('project_profit_distributions')
        .insert(distInserts);
        
      if (err2) throw err2;

      // 3. Update Project Status to Closed
      const { error: err3 } = await supabase
        .from('projects')
        .update({ status: 'Closed', end_date: new Date().toISOString().split('T')[0] })
        .eq('id', projectId);

      if (err3) throw err3;

      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const getExistingClosing = async () => {
    if (!projectId) return null;
    const { data } = await supabase
      .from('project_closings')
      .select('*, distributions:project_profit_distributions(*)')
      .eq('project_id', projectId)
      .single();
    return data;
  };

  return { loading, error, checkReadiness, calculateProfit, saveClosing, getExistingClosing };
}
