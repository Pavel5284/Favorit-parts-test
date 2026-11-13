import Loader from '../Loader/Loader';
import styles from './StatusView.module.css';

// Единое место для состояний загрузки, ошибки и пустого ответа.
export default function StatusView({ state, loadingText, emptyText, onRetry, children }) {
  if (state.status === 'loading') return <Loader text={loadingText} />;

  if (state.status === 'failed') {
    return (
      <div className={`alert alert-danger mb-0 ${styles.error}`} role="alert">
        <span>
          <span className={`bi bi-exclamation-circle ${styles.icon}`} aria-hidden="true" />
          {state.error}
        </span>
        <button className="btn btn-sm btn-outline-danger" onClick={onRetry}>
          Повторить
        </button>
      </div>
    );
  }

  if (state.status === 'succeeded') {
    return state.items.length === 0 ? (
      <div className="alert alert-warning mb-0">
        <span className={`bi bi-search ${styles.icon}`} aria-hidden="true" />
        {emptyText}
      </div>
    ) : (
      children
    );
  }

  return null;
}
