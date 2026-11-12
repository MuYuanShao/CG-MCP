export type ImportedPlanLine = {
  id: number;
  orderNo: string;
  instanceId?: string;
  sourceLineId?: string;
  sourceStatus?: string;
  supplierCode?: string;
  supplierName?: string;
  receivingAddress?: string;
  hospital?: string;
  productCode: string;
  productName: string;
  spec: string;
  model: string;
  registrationNo?: string;
  manufacturer?: string;
  zcLocalCode?: string;
  unit: string;
  planDate: string;
  planQty: number;
  unitPrice: number;
  amount?: number | null;
  currency?: string;
  taxIncluded?: boolean;
  quantityExact?: string;
  amountExact?: string;
  unitPriceExact?: string;
};

export type ImportedOrder = {
  key: string;
  header: ImportedPlanLine;
  lines: ImportedPlanLine[];
  quantitySummary: string;
  total: string;
};

function scaled(value: string) {
  const [integer = '0', fraction = ''] = value.split('.');
  return BigInt(integer) * 10_000n + BigInt(fraction.padEnd(4, '0'));
}

export function formatPlanDecimal(value: string, minimum = 0) {
  const [integer = '0', fraction = ''] = value.split('.');
  const decimals = fraction.replace(/0+$/, '').padEnd(minimum, '0');
  return integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (decimals ? '.' + decimals : '');
}

function formatScaled(value: bigint, minimum = 0) {
  return formatPlanDecimal(`${value / 10_000n}.${String(value % 10_000n).padStart(4, '0')}`, minimum);
}

export function groupImportedPlans(lines: ImportedPlanLine[]): ImportedOrder[] {
  const groups = new Map<string, ImportedPlanLine[]>();
  for (const line of lines) {
    if (!line.sourceStatus) continue;
    const key = JSON.stringify([line.instanceId ?? line.hospital, line.orderNo]);
    const group = groups.get(key) ?? [];
    group.push(line);
    groups.set(key, group);
  }
  return [...groups].flatMap(([key, group]) => {
    const header = group[0];
    if (!header) return [];
    const byUnit = new Map<string, bigint>();
    let amount = 0n;
    for (const line of group) {
      byUnit.set(line.unit, (byUnit.get(line.unit) ?? 0n) + scaled(line.quantityExact ?? line.planQty.toFixed(4)));
      amount += scaled(line.amountExact ?? (line.amount ?? 0).toFixed(4));
    }
    return [{ key, header, lines: group, total: formatScaled(amount, 2),
      quantitySummary: [...byUnit].map(([unit, quantity]) => `${formatScaled(quantity)} ${unit}`.trim()).join(' / ') }];
  });
}
