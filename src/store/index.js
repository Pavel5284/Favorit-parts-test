import { configureStore } from '@reduxjs/toolkit';
import partsReducer from './partsSlice';

// Фабрика нужна тестам: у каждого теста свой чистый store.
export const makeStore = () => configureStore({ reducer: { parts: partsReducer } });
export const store = makeStore();
