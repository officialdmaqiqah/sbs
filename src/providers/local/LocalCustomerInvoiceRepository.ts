import type { CustomerInvoiceRepository } from '../interfaces/CustomerInvoiceRepository';
import type { CustomerInvoice } from '../../types';

export class LocalCustomerInvoiceRepository implements CustomerInvoiceRepository {
  private repo: any;

  constructor(repo: any) {
    this.repo = repo;
  }

  async getInvoiceById(id: string): Promise<CustomerInvoice | null> {
    const list = await this.repo.list();
    return list.find((x: any) => x.id === id) || null;
  }

  async listInvoices(filters?: Record<string, any>): Promise<CustomerInvoice[]> {
    const list = await this.repo.list();
    if (!filters) return list;
    
    return list.filter((item: any) => {
      for (const key in filters) {
        if (item[key] !== filters[key]) return false;
      }
      return true;
    });
  }

  async createInvoice(data: any): Promise<CustomerInvoice> {
    return this.repo.create(data);
  }

  async updateInvoice(id: string, data: any): Promise<CustomerInvoice> {
    return this.repo.update(id, data);
  }
}
