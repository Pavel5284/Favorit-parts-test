import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchOffers } from '../../store/partsSlice';
import { formatPrice, formatShipment } from '../../utils/format';
import StatusView from '../StatusView/StatusView';
import styles from './OffersTable.module.css';

export default function OffersTable() {
  const dispatch = useDispatch();
  const { offers, selected } = useSelector((s) => s.parts);
  const [onlyInStock, setOnlyInStock] = useState(false);
  const ref = useRef(null);

  // На узких экранах результаты оказываются под списком производителей —
  // подводим к ним, чтобы пользователь не гадал, сработал ли клик.
  useEffect(() => {
    if (!window.matchMedia?.('(max-width: 991.98px)').matches) return;
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    ref.current?.scrollIntoView?.({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
  }, [selected?.brand]);

  const rows = onlyInStock ? offers.items.filter((r) => r.stock > 0) : offers.items;
  const analogues = offers.items.filter((r) => r.isAnalogue).length;

  return (
    <div ref={ref} className={styles.wrap}>
      <StatusView
        state={offers}
        loadingText="Загружаем предложения и аналоги..."
        emptyText="Предложений по этой детали нет."
        onRetry={() => dispatch(fetchOffers(selected))}
      >
        <div className={styles.toolbar}>
          <span className="text-secondary">
            Найдено: {offers.items.length}
            {analogues > 0 && ` (аналогов: ${analogues})`}
          </span>
          <div className="form-check form-switch m-0">
            <input
              className="form-check-input"
              type="checkbox"
              role="switch"
              id="only-in-stock"
              checked={onlyInStock}
              onChange={(e) => setOnlyInStock(e.target.checked)}
            />
            <label className="form-check-label" htmlFor="only-in-stock">
              Только в наличии
            </label>
          </div>
        </div>

        {rows.length === 0 ? (
          <p className="text-secondary mb-0 py-3">
            Нет позиций в наличии. Отключите фильтр, чтобы увидеть все.
          </p>
        ) : (
          <div className="table-responsive">
            <table className={`table align-middle mb-0 ${styles.offers}`}>
              <caption className="visually-hidden">
                Предложения по детали {selected?.brand} {selected?.number}
              </caption>
              <thead>
                <tr>
                  <th scope="col">Название / Производитель</th>
                  <th scope="col" className="text-end">
                    Цена
                  </th>
                  <th scope="col" className="text-end">
                    Остаток
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={`${row.id}-${i}`}>
                    <td>
                      <div className="fw-semibold">{row.name || '—'}</div>
                      <small className="text-secondary">
                        {row.brand} · {row.number}
                      </small>{' '}
                      <span className={`badge ${row.isAnalogue ? 'text-bg-info' : 'text-bg-success'}`}>
                        {row.isAnalogue ? 'Аналог' : 'Искомая деталь'}
                      </span>
                      {row.warehouses.length > 0 && (
                        <details className={styles.warehouses}>
                          <summary>Склады: {row.warehouses.length}</summary>
                          <ul>
                            {row.warehouses.map((w, j) => (
                              <li key={`${w.id}-${j}`}>
                                <span>
                                  {w.name || `Склад ${j + 1}`}
                                  {w.own && <span className="badge text-bg-light ms-1">свой</span>}
                                </span>
                                <span>{formatPrice(w.price)}</span>
                                <span>{w.stock} шт.</span>
                                {formatShipment(w.shipmentDate) && (
                                  <small>{formatShipment(w.shipmentDate)}</small>
                                )}
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </td>
                    <td className="text-end text-nowrap" data-label="Цена">
                      {row.priceFrom && <small className="text-secondary me-1">от</small>}
                      {formatPrice(row.price)}
                    </td>
                    <td className="text-end text-nowrap" data-label="Остаток">
                      {row.stock > 0 ? (
                        <span className="text-success fw-semibold">{row.stock} шт.</span>
                      ) : (
                        <span className="badge text-bg-secondary">Нет в наличии</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </StatusView>
    </div>
  );
}
