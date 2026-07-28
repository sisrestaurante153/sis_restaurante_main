export interface CardapioItemRow {
  id: string;
  itemId: string;
  itemName: string;
  itemType: string;
  salePrice: string;
  weekdays: number[] | null;
  active: boolean;
}

export interface CardapioSummary {
  id: string;
  name: string;
  channel: string;
  active: boolean;
  itemCount: number;
  updatedAt: string;
}

export interface CardapioDetail {
  id: string;
  name: string;
  channel: string;
  active: boolean;
  items: CardapioItemRow[];
}

export interface SaveCardapioInput {
  id?: string;
  name: string;
  channel: string;
  active: boolean;
}

export interface AddCardapioItemInput {
  cardapioId: string;
  itemId: string;
  salePrice: string;
  weekdays: number[] | null;
}

export const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;
