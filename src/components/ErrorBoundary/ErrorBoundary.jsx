import { Component } from 'react';
import styles from './ErrorBoundary.module.css';

// Error Boundary до сих пор можно написать только классом: хуков-аналогов getDerivedStateFromError нет.
// Если в рендере что-то упадёт, пользователь увидит понятный экран, а не белый лист.
export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Ошибка интерфейса:', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className={`container-fluid ${styles.shell} ${styles.screen}`}>
        <div className="alert alert-danger" role="alert">
          <h2 className={`h5 ${styles.title}`}>
            <span className={`bi bi-exclamation-triangle ${styles.icon}`} aria-hidden="true" />
            Что-то пошло не так
          </h2>
          <p className={styles.text}>Интерфейс неожиданно остановился. Обновите страницу и попробуйте снова.</p>
          <button className="btn btn-danger" onClick={() => window.location.reload()}>
            Обновить страницу
          </button>
        </div>
      </div>
    );
  }
}
