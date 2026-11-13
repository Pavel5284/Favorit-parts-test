import styles from './Loader.module.css';

export default function Loader({ text = 'Загрузка...' }) {
  return (
    <div className={styles.loader} role="status">
      <div className="spinner-border spinner-border-sm" aria-hidden="true" />
      <span>{text}</span>
    </div>
  );
}
