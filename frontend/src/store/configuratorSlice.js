import { createSlice } from '@reduxjs/toolkit';

/** Current selections in the product configurator, keyed by product slug so they survive navigation. */
const slice = createSlice({
  name: 'configurator',
  initialState: { selections: {} },
  reducers: {
    initSelection: (s, { payload: { slug, defaults } }) => {
      if (!s.selections[slug]) s.selections[slug] = { ...defaults };
    },
    setOption: (s, { payload: { slug, group, code } }) => {
      s.selections[slug] = { ...s.selections[slug], [group]: code };
    },
    resetSelection: (s, { payload: { slug, defaults } }) => { s.selections[slug] = { ...defaults }; },
  },
});

export const { initSelection, setOption, resetSelection } = slice.actions;
export default slice.reducer;
