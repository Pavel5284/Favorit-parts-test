const API_URL = import.meta.env.VITE_API_URL || '/api';
const API_KEY = import.meta.env.VITE_API_KEY;

function getApiKey() {
  if (!API_KEY) throw new Error('Не задан VITE_API_KEY. Создайте .env по примеру .env.example.');
  return API_KEY;
}

const KNOWN_ERRORS = {
  'Empty key': 'Не указан ключ покупателя.',
  'Invalid key client': 'Неверный ключ покупателя.',
  'Empty number goods': 'Введите номер детали.',
  'Request quota exceeded': 'Превышен лимит запросов. Попробуйте позже.'
};

function translateError(error) {
  const text = Array.isArray(error) ? error.join('; ') : String(error);
  const known = Object.keys(KNOWN_ERRORS).find((key) => text.includes(key));
  return known ? KNOWN_ERRORS[known] : `Ошибка сервиса: ${text}`;
}

// Если деталь не найдена, API возвращает массив с одной пустой структурой.
const isFilled = (item) => Boolean(item && (item.goodsID || item.brand));

// Цену берём со складов (поле price верхнего уровня API просит не использовать):
// минимальная среди складов, где товар есть в наличии.
export function pickPrice(warehouses = []) {
  const priced = warehouses.filter((w) => Number(w.price) > 0);
  const inStock = priced.filter((w) => Number(w.stock) > 0);
  const prices = (inStock.length ? inStock : priced).map((w) => Number(w.price));
  return prices.length ? Math.min(...prices) : null;
}

export function normalizeItem(item) {
  const warehouses = item.warehouses ?? [];

  // Склады, где деталь реально есть, от дешёвого к дорогому.
  const available = warehouses
    .filter((w) => Number(w.stock) > 0)
    .map((w, i) => ({
      id: w.id ?? String(i),
      name: w.code || '',
      own: Boolean(w.own),
      price: Number(w.price) > 0 ? Number(w.price) : null,
      stock: Number(w.stock),
      shipmentDate: w.shipmentDate ?? ''
    }))
    .sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));

  const stock = item.count ?? warehouses.reduce((sum, w) => sum + (Number(w.stock) || 0), 0);

  return {
    id: item.goodsID,
    brand: item.brand,
    number: item.number,
    name: item.name,
    price: pickPrice(warehouses),
    priceFrom: new Set(available.map((w) => w.price)).size > 1, // цены на складах разные
    stock: Number(stock) || 0,
    warehouses: available
  };
}

async function request(params, signal) {
  const query = new URLSearchParams({ key: getApiKey(), ...params }); // сам кодирует # и &

  let response;
  try {
    response = await fetch(`${API_URL}?${query}`, { signal });
  } catch (error) {
    if (error?.name === 'AbortError') throw error; // запрос отменили мы сами — это не сбой сети
    throw new Error('Нет связи с сервером. Проверьте подключение к интернету.');
  }

  // Ошибки сервиса приходят с кодом 403 и телом {"error": "..."}, поэтому тело читаем до проверки статуса.
  let data = null;
  try {
    data = await response.json();
  } catch {
    // тело не JSON — разберём ниже по статусу
  }

  if (data && !Array.isArray(data) && data.error) throw new Error(translateError(data.error));
  if (!response.ok) throw new Error(`Сервер вернул ошибку ${response.status}.`);
  if (data === null) throw new Error('Сервер вернул некорректный ответ.');

  const goods = Array.isArray(data) ? data : data.goods;
  if (!Array.isArray(goods)) throw new Error('Неожиданный формат ответа сервера.');
  return goods.filter(isFilled);
}

// Этап 1: список производителей, выпускающих деталь с таким номером.
export async function getBrands(number, signal) {
  const goods = await request({ number }, signal);
  const unique = new Map();
  goods.forEach((g) => {
    if (g.brand && !unique.has(g.brand)) {
      unique.set(g.brand, { brand: g.brand, number: g.number || number, name: g.name });
    }
  });
  return [...unique.values()];
}

// Этап 2: искомая позиция + её аналоги.
export async function getOffers(number, brand, signal) {
  const goods = await request({ number, brand, analogues: 'on' }, signal);
  const rows = [];
  goods.forEach((g) => {
    rows.push({ ...normalizeItem(g), isAnalogue: false });
    (g.analogues ?? []).filter(isFilled).forEach((a) => {
      rows.push({ ...normalizeItem(a), isAnalogue: true });
    });
  });
  return rows;
}
