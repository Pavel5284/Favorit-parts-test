import { useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchBrands, fetchOffers } from '../../store/partsSlice';
import StatusView from '../StatusView/StatusView';
import styles from './BrandList.module.css';

export default function BrandList() {
  const dispatch = useDispatch();
  const { number, brands, selected } = useSelector((s) => s.parts);
  const offersRequest = useRef(null);

  const select = (item) => {
    offersRequest.current?.abort(); // если уже грузим другого производителя — отменяем
    offersRequest.current = dispatch(fetchOffers({ number: item.number, brand: item.brand }));
  };

  return (
    <StatusView
      state={brands}
      loadingText="Ищем производителей..."
      emptyText={`По номеру «${number}» ничего не найдено. Проверьте артикул.`}
      onRetry={() => dispatch(fetchBrands(number))}
    >
      <div className="list-group">
        {brands.items.map((item) => {
          const active = selected?.brand === item.brand;
          return (
            <button
              key={item.brand}
              type="button"
              className={`list-group-item list-group-item-action ${styles.item} ${
                active ? 'active' : ''
              }`}
              aria-pressed={active}
              onClick={() => select(item)}
            >
              <span>
                <span className={styles.brand}>{item.brand}</span>
                {item.name && <small className={styles.name}>{item.name}</small>}
              </span>
              <span className="bi bi-chevron-right" aria-hidden="true" />
            </button>
          );
        })}
      </div>
    </StatusView>
  );
}
