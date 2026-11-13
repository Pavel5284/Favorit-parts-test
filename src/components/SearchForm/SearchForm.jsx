import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchBrands, reset } from '../../store/partsSlice';
import styles from './SearchForm.module.css';

export const MIN_LENGTH = 2; // с одного символа искать бессмысленно
export const DEBOUNCE_MS = 600; // ждём паузу в наборе, чтобы не слать запрос на каждую букву

export default function SearchForm() {
  const [value, setValue] = useState('');
  const dispatch = useDispatch();
  const loading = useSelector((s) => s.parts.brands.status === 'loading');
  const last = useRef({ number: '', promise: null }); // последний запущенный поиск

  const search = useCallback(
    (number) => {
      last.current.promise?.abort(); // предыдущий запрос больше не нужен
      last.current = { number, promise: dispatch(fetchBrands(number)) };
    },
    [dispatch]
  );

  const resetResults = useCallback(() => {
    last.current.promise?.abort();
    last.current = { number: '', promise: null };
    dispatch(reset());
  }, [dispatch]);

  // Поиск «по факту ввода»: через паузу после последнего символа.
  useEffect(() => {
    const number = value.trim();

    if (!number) {
      if (last.current.number) resetResults(); // поле очистили — убираем старую выдачу
      return;
    }
    if (number.length < MIN_LENGTH || number === last.current.number) return;

    const timer = setTimeout(() => {
      // Пока ждали паузу, пользователь мог нажать Enter — тогда этот номер уже ищется.
      if (number !== last.current.number) search(number);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [value, search, resetResults]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const number = value.trim();
    if (number) search(number); // Enter ищет сразу, не дожидаясь паузы
  };

  return (
    <form onSubmit={handleSubmit} className={styles.search} role="search">
      <label htmlFor="part-number" className="visually-hidden">
        Артикул детали
      </label>
      <div className={styles.box}>
        <div className={styles.field}>
          <span className={`bi bi-search ${styles.icon}`} aria-hidden="true" />
          <input
            id="part-number"
            type="text"
            className={`form-control form-control-lg ${styles.input}`}
            placeholder="Артикул детали, например 7160500039S"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-describedby="search-hint"
            autoComplete="off"
            spellCheck={false}
            autoFocus
          />
          {value && (
            <button
              type="button"
              className={`btn btn-link ${styles.clear}`}
              onClick={() => {
                setValue('');
                resetResults();
              }}
              aria-label="Очистить поле"
            >
              <span className="bi bi-x-circle-fill" aria-hidden="true" />
            </button>
          )}
        </div>
        <button className={`btn btn-primary btn-lg ${styles.submit}`} type="submit" disabled={!value.trim()}>
          {loading && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />}
          Найти
        </button>
      </div>
      <div id="search-hint" className="form-text">
        Поиск запустится сам, когда закончите вводить (от {MIN_LENGTH} символов), или нажмите Enter.
      </div>
    </form>
  );
}
