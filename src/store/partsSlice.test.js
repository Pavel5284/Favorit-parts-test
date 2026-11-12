import { describe, expect, it } from 'vitest';
import reducer, { fetchBrands, fetchOffers, reset } from './partsSlice';

const brand = { brand: 'MEYLE', number: 'A', name: 'x' };

describe('partsSlice', () => {
  it('игнорирует ответ на устаревший запрос, если уже начат новый поиск', () => {
    let state = reducer(undefined, fetchBrands.pending('req-1', 'AAA'));
    state = reducer(state, fetchBrands.pending('req-2', 'BBB'));
    state = reducer(state, fetchBrands.fulfilled([brand], 'req-1', 'AAA')); // запоздавший ответ

    expect(state.brands.status).toBe('loading');
    expect(state.brands.items).toEqual([]);
  });

  it('новый поиск сбрасывает выбранного производителя и таблицу предложений', () => {
    let state = reducer(undefined, fetchBrands.pending('r1', 'A'));
    state = reducer(state, fetchBrands.fulfilled([brand], 'r1', 'A'));
    state = reducer(state, fetchOffers.pending('r2', { number: 'A', brand: 'MEYLE' }));
    state = reducer(state, fetchOffers.fulfilled([{ id: '1' }], 'r2', { number: 'A', brand: 'MEYLE' }));
    expect(state.offers.items).toHaveLength(1);

    state = reducer(state, fetchBrands.pending('r3', 'B'));
    expect(state.selected).toBeNull();
    expect(state.offers.status).toBe('idle');
    expect(state.offers.items).toEqual([]);
  });

  it('ошибка этапа 2 не ломает уже полученный список производителей', () => {
    const arg = { number: 'A', brand: 'MEYLE' };
    let state = reducer(undefined, fetchBrands.pending('r1', 'A'));
    state = reducer(state, fetchBrands.fulfilled([brand], 'r1', 'A'));
    state = reducer(state, fetchOffers.pending('r2', arg));
    state = reducer(state, fetchOffers.rejected(new Error('Нет связи'), 'r2', arg));

    expect(state.offers).toMatchObject({ status: 'failed', error: 'Нет связи' });
    expect(state.brands.status).toBe('succeeded');
    expect(state.brands.items).toEqual([brand]);
  });

  it('reset возвращает начальное состояние', () => {
    let state = reducer(undefined, fetchBrands.pending('r1', 'A'));
    state = reducer(state, reset());
    expect(state.brands.status).toBe('idle');
    expect(state.number).toBe('');
  });
});
