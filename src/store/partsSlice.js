import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { getBrands, getOffers } from '../api/partsApi';

// signal позволяет отменить запрос, который стал не нужен (пользователь ввёл другое).
export const fetchBrands = createAsyncThunk('parts/fetchBrands', (number, { signal }) =>
  getBrands(number, signal)
);

export const fetchOffers = createAsyncThunk('parts/fetchOffers', ({ number, brand }, { signal }) =>
  getOffers(number, brand, signal)
);

// status: idle | loading | succeeded | failed
const asyncState = () => ({ status: 'idle', items: [], error: null, requestId: null });

const initialState = () => ({
  number: '',
  brands: asyncState(),
  selected: null, // { brand, number } — выбранный производитель
  offers: asyncState()
});

// Ответ принимаем, только если он на тот запрос, который сейчас актуален:
// отменённые и устаревшие запросы состояние не меняют.
const isCurrent = (stage, action) => stage.requestId === action.meta.requestId;

const partsSlice = createSlice({
  name: 'parts',
  initialState,
  reducers: {
    reset: () => initialState()
  },
  extraReducers: (builder) => {
    builder
      // Этап 1
      .addCase(fetchBrands.pending, (state, action) => {
        state.number = action.meta.arg;
        state.brands = { ...asyncState(), status: 'loading', requestId: action.meta.requestId };
        state.selected = null;
        state.offers = asyncState();
      })
      .addCase(fetchBrands.fulfilled, (state, action) => {
        if (!isCurrent(state.brands, action)) return;
        state.brands.status = 'succeeded';
        state.brands.items = action.payload;
      })
      .addCase(fetchBrands.rejected, (state, action) => {
        if (!isCurrent(state.brands, action)) return;
        state.brands.status = 'failed';
        state.brands.error = action.error.message;
      })
      // Этап 2
      .addCase(fetchOffers.pending, (state, action) => {
        state.selected = action.meta.arg;
        state.offers = { ...asyncState(), status: 'loading', requestId: action.meta.requestId };
      })
      .addCase(fetchOffers.fulfilled, (state, action) => {
        if (!isCurrent(state.offers, action)) return;
        state.offers.status = 'succeeded';
        state.offers.items = action.payload;
      })
      .addCase(fetchOffers.rejected, (state, action) => {
        if (!isCurrent(state.offers, action)) return;
        state.offers.status = 'failed';
        state.offers.error = action.error.message;
      });
  }
});

export const { reset } = partsSlice.actions;
export default partsSlice.reducer;
