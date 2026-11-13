import { useSelector } from 'react-redux';
import SearchForm from './components/SearchForm/SearchForm';
import BrandList from './components/BrandList/BrandList';
import OffersTable from './components/OffersTable/OffersTable';
import styles from './App.module.css';

export default function App() {
  const { brands, selected } = useSelector((s) => s.parts);
  const hasBrands = brands.status === 'succeeded' && brands.items.length > 0;

  return (
    <>
      <header className={styles.header}>
        <div className={`container-fluid ${styles.shell} ${styles.headerInner}`}>
          <span className={styles.headerIcon} aria-hidden="true">
            <span className="bi bi-gear-wide-connected" />
          </span>
          <div>
            <h1>Подбор автозапчастей</h1>
            <p>Найдите деталь по артикулу и сравните аналоги по цене и наличию</p>
          </div>
        </div>
      </header>

      <main className={`container-fluid ${styles.shell} ${styles.main}`}>
        <SearchForm />

        {brands.status !== 'idle' && (
          <div className={styles.results}>
            <section className={styles.panel} aria-labelledby="brands-title">
              <h2 id="brands-title" className={styles.sectionTitle}>
                Производители
                {hasBrands && (
                  <span className={`badge text-bg-light ${styles.count}`}>{brands.items.length}</span>
                )}
              </h2>
              <BrandList />
            </section>

            <section className={styles.panel} aria-labelledby="offers-title" aria-live="polite">
              <h2 id="offers-title" className={styles.sectionTitle}>
                Предложения и аналоги
              </h2>
              {selected ? (
                <OffersTable />
              ) : (
                hasBrands && (
                  <p className={styles.hint}>
                    <span className={`bi bi-arrow-left ${styles.hintIcon}`} aria-hidden="true" />
                    Выберите производителя, чтобы увидеть цены и аналоги.
                  </p>
                )
              )}
            </section>
          </div>
        )}
      </main>
    </>
  );
}
