export interface VendaRow {
  id: string;
  itemId: string;
  itemName: string;
  date: string;
  quantity: string;
  unitPrice: string;
  total: string;
  channel: string | null;
  origin: string;
}

export interface SaveVendaInput {
  itemId: string;
  date: string;
  quantity: string;
  unitPrice: string;
  channel?: string;
}

export interface FinancialReturnSaleEntry {
  date: string;
  quantity: number;
  unitPrice: number;
  total: number;
  channel: string | null;
}

export interface FinancialReturnRow {
  itemId: string;
  itemName: string;
  quantitySold: number;
  revenueTotal: number;
  costTotal: number;
  marginTotal: number;
  marginPercent: number | null;
  sales: FinancialReturnSaleEntry[];
}

export interface FinancialReturnFilters {
  dateFrom: string;
  dateTo: string;
}
