// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary';
import { DEBOUNCE_MS } from './components/SearchForm/SearchForm';
import { makeStore } from './store';

const brandsResponse = {
  goods: [
    { goodsID: '1', brand: 'MEYLE', number: '7160500039S', name: 'Втулка' },
    { goodsID: '2', brand: 'FEBI', number: '7160500039S', name: 'Втулка FEBI' }
  ]
};

const offersResponse = {
  goods: [
    {
      goodsID: '1', brand: 'MEYLE', number: '7160500039S', name: 'Втулка стабилизатора', count: 20,
      warehouses: [{ id: 'w1', code: 'МС2', price: 1250, stock: 20 }],
      analogues: [{ goodsID: '3', brand: 'ZEN', number: 'Z1', name: 'Втулка ZEN', count: 0, warehouses: [] }]
    }
  ]
};

const ok = (body) => ({ ok: true, status: 200, json: async () => body });
const paramsOf = (url) => new URL(url, 'http://localhost').searchParams;

function mockApi(handler) {
  const fetchMock = vi.fn(async (url) => handler(paramsOf(url)));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const renderApp = () =>
  render(
    <Provider store={makeStore()}>
      <App />
    </Provider>
  );

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('поиск запчасти', () => {
  it('проходит весь путь: артикул → производители → предложения и аналоги', async () => {
    const fetchMock = mockApi((p) => ok(p.get('brand') ? offersResponse : brandsResponse));
    const user = userEvent.setup();
    renderApp();

    await user.type(screen.getByLabelText('Артикул детали'), '7160500039S{Enter}');
    await user.click(await screen.findByRole('button', { name: /MEYLE/ }));

    const table = await screen.findByRole('table');
    const rows = within(table).getAllByRole('row').slice(1); // без строки заголовка
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain('Втулка стабилизатора');
    expect(rows[0].textContent).toMatch(/1\s?250/); // цена
    expect(rows[0].textContent).toContain('20 шт.'); // остаток
    expect(rows[1].textContent).toContain('Аналог');
    expect(rows[1].textContent).toContain('Нет в наличии');

    // второй запрос ушёл с производителем и флагом аналогов
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const offersParams = paramsOf(fetchMock.mock.calls[1][0]);
    expect(offersParams.get('brand')).toBe('MEYLE');
    expect(offersParams.get('analogues')).toBe('on');

    // фильтр «Только в наличии» прячет позицию с нулевым остатком
    await user.click(screen.getByRole('switch', { name: 'Только в наличии' }));
    expect(within(table).getAllByRole('row')).toHaveLength(2); // заголовок + 1 позиция
  });

  it('понятно сообщает, когда ничего не найдено (API отдаёт пустую структуру)', async () => {
    mockApi(() => ok({ goods: [{ goodsID: '', brand: '', number: '', name: '' }] }));
    const user = userEvent.setup();
    renderApp();

    await user.type(screen.getByLabelText('Артикул детали'), 'XXXX{Enter}');
    expect(await screen.findByText(/ничего не найдено/)).toBeTruthy();
  });

  it('при сбое сети показывает ошибку, а «Повторить» делает запрос ещё раз', async () => {
    let calls = 0;
    mockApi(() => {
      calls += 1;
      if (calls === 1) throw new TypeError('Failed to fetch');
      return ok(brandsResponse);
    });
    const user = userEvent.setup();
    renderApp();

    await user.type(screen.getByLabelText('Артикул детали'), '7160500039S{Enter}');
    expect(await screen.findByText(/Нет связи с сервером/)).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Повторить' }));
    expect(await screen.findByRole('button', { name: /MEYLE/ })).toBeTruthy();
  });

  it('не шлёт запрос на каждый символ: ждёт паузу и не ищет по одному символу', async () => {
    vi.useFakeTimers();
    const fetchMock = mockApi(() => ok(brandsResponse));
    renderApp();
    const input = screen.getByLabelText('Артикул детали');

    fireEvent.change(input, { target: { value: '7' } });
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS + 100);
    expect(fetchMock).not.toHaveBeenCalled(); // один символ — слишком коротко

    ['71', '716', '7160'].forEach((v) => fireEvent.change(input, { target: { value: v } }));
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS - 100);
    expect(fetchMock).not.toHaveBeenCalled(); // пауза ещё не прошла

    await vi.advanceTimersByTimeAsync(200);
    expect(fetchMock).toHaveBeenCalledTimes(1); // один запрос на итоговое значение
    expect(paramsOf(fetchMock.mock.calls[0][0]).get('number')).toBe('7160');
  });

  it('Enter ищет сразу, а следом debounce не дублирует запрос', async () => {
    vi.useFakeTimers();
    const fetchMock = mockApi(() => ok(brandsResponse));
    renderApp();
    const input = screen.getByLabelText('Артикул детали');

    fireEvent.change(input, { target: { value: '7160' } });
    fireEvent.submit(input.closest('form'));
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS * 2);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('ErrorBoundary', () => {
  it('показывает запасной экран вместо белого листа, если рендер упал', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const CrashOnRender = () => {
      throw new Error('Ошибка при рендере тестового компонента');
    };
    render(
      <ErrorBoundary>
        <CrashOnRender />
      </ErrorBoundary>
    );
    expect(screen.getByRole('alert').textContent).toContain('Что-то пошло не так');
  });
});
