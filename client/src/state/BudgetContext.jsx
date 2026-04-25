import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { api } from '../lib/api.js';
import { thisMonth } from '../lib/format.js';

const BudgetContext = createContext(null);

export function BudgetProvider({ children }) {
  const [month, setMonth] = useState(thisMonth());
  const [dashboard, setDashboard] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [dashboardResult, expensesResult, categoriesResult] = await Promise.all([
        api.get('/dashboard', { params: { month } }),
        api.get('/expenses', { params: { month } }),
        api.get('/categories', { params: { month } })
      ]);
      setDashboard(dashboardResult.data);
      setExpenses(expensesResult.data.expenses);
      setCategories(categoriesResult.data.categories);
    } finally {
      setLoading(false);
    }
  }, [month]);

  const value = useMemo(
    () => ({
      month,
      setMonth,
      dashboard,
      expenses,
      categories,
      loading,
      refresh
    }),
    [month, dashboard, expenses, categories, loading, refresh]
  );

  return <BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>;
}

export function useBudget() {
  return useContext(BudgetContext);
}
