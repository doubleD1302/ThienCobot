// Cấu hình Hồ Tạo Hóa (Gacha Pool)

export const GACHA_POOL_WEIGHTS = {
  supreme: 0.0025,  // 0.25%
  stones: 0.10,     // 10%
  vnd: 0.10,        // 10%
  dbItems: 0.7975   // 79.75%
};

export const DB_ITEM_RARITY_WEIGHTS = {
  'Hạ phẩm': 0.50,
  'Phàm phẩm': 0.25,
  'Trung phẩm': 0.125,
  'Cực phẩm': 0.075,
  'Thượng phẩm': 0.0375,
  'Tiên phẩm': 0.02,
  'Thần phẩm': 0.0175
};

export function mapGachaRarityToDbRarity(gachaRarity) {
  switch (gachaRarity) {
    case 'Hạ phẩm':
    case 'Phàm phẩm':
      return ['Thường'];
    case 'Trung phẩm':
    case 'Thượng phẩm':
      return ['Hiếm'];
    case 'Cực phẩm':
      return ['Cực hiếm'];
    case 'Tiên phẩm':
      return ['Huyền thoại'];
    case 'Thần phẩm':
      return ['Thần cấp'];
    default:
      return ['Thường'];
  }
}

export function rollFromWeights(weightsMap) {
  const rand = Math.random();
  let cumulative = 0;
  for (const [key, weight] of Object.entries(weightsMap)) {
    cumulative += weight;
    if (rand <= cumulative) {
      return key;
    }
  }
  return Object.keys(weightsMap)[Object.keys(weightsMap).length - 1];
}

// Roll Linh Thạch
export function rollStonesAmount() {
  const rand = Math.random();
  if (rand <= 0.99) {
    // 99%: 1-10k
    return Math.floor(Math.random() * (10000 - 1000 + 1)) + 1000;
  } else if (rand <= 0.999) {
    // 0.9%: 10-100k
    return Math.floor(Math.random() * (100000 - 10000 + 1)) + 10000;
  } else {
    // 0.1%: 1m
    return 1000000;
  }
}

// Roll VND
export function rollVndAmount() {
  const rand = Math.random();
  if (rand <= 0.99) {
    // 99%: 10-100k
    return Math.floor(Math.random() * (100000 - 10000 + 1)) + 10000;
  } else if (rand <= 0.999) {
    // 0.9%: 100-1000k
    return Math.floor(Math.random() * (1000000 - 100000 + 1)) + 100000;
  } else {
    // 0.1%: 10m
    return 10000000;
  }
}
