import { afterEach, describe, expect, it, vi } from 'vitest';
import { getBrands, getOffers, normalizeItem, pickPrice } from './partsApi';

const mockResponse = (body, ok = true, status = 200) =>
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok, status, json: async () => body }));

afterEach(() => vi.unstubAllGlobals());

describe('pickPrice', () => {
  it('берёт минимальную цену среди складов с остатком, а не цену верхнего уровня', () => {
    expect(
      pickPrice([
        { price: 90, stock: 0 },
        { price: 120, stock: 5 },
        { price: 100, stock: 2 }
      ])
    ).toBe(100);
  });
  it('если остатков нет нигде, всё равно показывает цену', () => {
    expect(pickPrice([{ price: 90, stock: 0 }])).toBe(90);
  });
  it('возвращает null, когда цен нет', () => {
    expect(pickPrice([])).toBeNull();
  });
});

describe('normalizeItem', () => {
  it('оставляет только склады с остатком и сортирует их по цене', () => {
    const item = normalizeItem({
      goodsID: '1', brand: 'B', number: 'N', name: 'x', count: 7,
      warehouses: [
        { id: 'a', code: 'A', price: 300, stock: 2 },
        { id: 'b', code: 'B', price: 100, stock: 0 },
        { id: 'c', code: 'C', price: 200, stock: 5 }
      ]
    });
    expect(item.warehouses.map((w) => w.name)).toEqual(['C', 'A']);
    expect(item.priceFrom).toBe(true); // цены на складах разные — в интерфейсе «от»
    expect(item.price).toBe(200);
  });
  it('если count не пришёл, остаток считается по складам', () => {
    const item = normalizeItem({
      goodsID: '1', brand: 'B', number: 'N', name: 'x',
      warehouses: [{ price: 1, stock: 2 }, { price: 1, stock: 3 }]
    });
    expect(item.stock).toBe(5);
    expect(item.priceFrom).toBe(false);
  });
});

describe('getBrands', () => {
  it('убирает дубли производителей', async () => {
    mockResponse({
      goods: [
        { goodsID: '1', brand: 'MEYLE', number: 'A', name: 'x' },
        { goodsID: '2', brand: 'MEYLE', number: 'A', name: 'x' },
        { goodsID: '3', brand: 'FEBI', number: 'A', name: 'x' }
      ]
    });
    const brands = await getBrands('A');
    expect(brands.map((b) => b.brand)).toEqual(['MEYLE', 'FEBI']);
  });
  it('пустая структура («не найдено») даёт пустой список', async () => {
    mockResponse({ goods: [{ goodsID: '', brand: '', number: '', name: '' }] });
    expect(await getBrands('X')).toEqual([]);
  });
  it('поддерживает ответ в виде голого массива', async () => {
    mockResponse([{ goodsID: '1', brand: 'ZEN', number: 'A', name: 'x' }]);
    expect(await getBrands('A')).toHaveLength(1);
  });
  it('превращает ошибку сервиса в понятное сообщение', async () => {
    mockResponse({ error: 'Invalid key client!' });
    await expect(getBrands('A')).rejects.toThrow('Неверный ключ покупателя');
  });
  it('показывает текст ошибки сервиса, даже если он пришёл с кодом 403', async () => {
    mockResponse({ error: 'Empty key!' }, false, 403);
    await expect(getBrands('A')).rejects.toThrow('Не указан ключ покупателя');
  });
  it('сообщает о сбое сети', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(getBrands('A')).rejects.toThrow('Нет связи с сервером');
  });
  it('отмену запроса не выдаёт за сбой сети', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('aborted', 'AbortError')));
    await expect(getBrands('A')).rejects.toMatchObject({ name: 'AbortError' });
  });
  it('сообщает о HTTP-ошибке', async () => {
    mockResponse({}, false, 502);
    await expect(getBrands('A')).rejects.toThrow('502');
  });
});

describe('getOffers', () => {
  it('склеивает искомую деталь и аналоги, цена берётся со складов', async () => {
    mockResponse({
      goods: [
        {
          goodsID: '1', brand: 'MEYLE', number: 'A', name: 'Деталь', count: 20,
          price: 1, warehouses: [{ price: 500, stock: 20 }],
          analogues: [
            { goodsID: '2', brand: 'FEBI', number: 'B', name: 'Аналог', count: 0, warehouses: [{ price: 700, stock: 0 }] }
          ]
        }
      ]
    });
    const rows = await getOffers('A', 'MEYLE');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ isAnalogue: false, price: 500, stock: 20 });
    expect(rows[1]).toMatchObject({ isAnalogue: true, price: 700, stock: 0 });
  });
});
