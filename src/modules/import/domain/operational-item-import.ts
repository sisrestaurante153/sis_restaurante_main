const COLUMN_ALIASES = {
  itemName: ["nome do item", "item", "nome_item"],
  type: ["tipo", "tipo do item"],
  operationalCategory: ["categoria operacional (secao)", "categoria operacional", "secao"],
  purchaseUnit: ["unidade de compra", "un compra"],
  purchaseQuantity: ["quantidade de compra", "qtde compra"],
  purchaseCost: ["preco de compra", "custo de compra"],
  conversionFactor: ["fator de conversao", "conversao"],
  usageUnit: ["unidade de uso", "un uso"],
  usageQuantity: ["quantidade de uso", "qtde uso"],
  usageCost: ["preco de uso", "custo de uso"],
  updatedAt: ["data e hora da ultima atualizacao", "ultima atualizacao", "atualizado em"],
  descriptionFlag: ["indicador de descricao operacional", "descricao operacional", "flag descricao"]
} as const;

type MappingKey = keyof typeof COLUMN_ALIASES;

export interface OperationalItemImportRow {
  itemName: string;
  type: string;
  operationalCategory: string;
  purchaseUnit: string;
  purchaseQuantity: string;
  purchaseCost: string;
  conversionFactor: string;
  usageUnit: string;
  usageQuantity: string;
  usageCost: string;
  updatedAt: string;
  descriptionFlag: boolean;
}

function normalizeHeader(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function splitCsvLine(line: string, delimiter: string) {
  const cells: string[] = [];
  let current = "";
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      if (insideQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
        continue;
      }

      insideQuotes = !insideQuotes;
      continue;
    }

    if (char === delimiter && !insideQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function detectDelimiter(headerLine: string) {
  const delimiters = [";", ",", "\t"];
  return delimiters
    .map((delimiter) => ({
      delimiter,
      score: headerLine.split(delimiter).length
    }))
    .sort((left, right) => right.score - left.score)[0]?.delimiter ?? ";";
}

function parseBooleanFlag(value: string) {
  return ["1", "sim", "true", "s", "yes"].includes(value.trim().toLowerCase());
}

export function inferOperationalItemColumnMapping(headers: string[]) {
  const normalizedHeaders = new Map(headers.map((header) => [normalizeHeader(header), header]));

  return Object.fromEntries(
    Object.entries(COLUMN_ALIASES).map(([key, aliases]) => {
      const matched = aliases.find((alias) => normalizedHeaders.has(alias));
      return [key, matched ? normalizedHeaders.get(matched) : null];
    })
  ) as Record<MappingKey, string | null>;
}

export function parseOperationalItemsCsv(content: string) {
  const lines = content
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return {
      headers: [],
      mapping: inferOperationalItemColumnMapping([]),
      rows: [] as OperationalItemImportRow[]
    };
  }

  const delimiter = detectDelimiter(lines[0]);
  const headers = splitCsvLine(lines[0], delimiter);
  const mapping = inferOperationalItemColumnMapping(headers);
  const headerIndex = new Map(headers.map((header, index) => [header, index]));

  const rows = lines.slice(1).map((line) => {
    const values = splitCsvLine(line, delimiter);
    const readCell = (key: MappingKey) => {
      const header = mapping[key];
      if (!header) {
        return "";
      }

      return values[headerIndex.get(header) ?? -1] ?? "";
    };

    return {
      itemName: readCell("itemName"),
      type: readCell("type"),
      operationalCategory: readCell("operationalCategory"),
      purchaseUnit: readCell("purchaseUnit"),
      purchaseQuantity: readCell("purchaseQuantity"),
      purchaseCost: readCell("purchaseCost"),
      conversionFactor: readCell("conversionFactor"),
      usageUnit: readCell("usageUnit"),
      usageQuantity: readCell("usageQuantity"),
      usageCost: readCell("usageCost"),
      updatedAt: readCell("updatedAt"),
      descriptionFlag: parseBooleanFlag(readCell("descriptionFlag"))
    };
  });

  return {
    headers,
    mapping,
    rows
  };
}
