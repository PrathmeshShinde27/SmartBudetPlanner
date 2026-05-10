import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { api } from '../lib/api.js';
import { thisMonth } from '../lib/format.js';

const BudgetContext = createContext(null);

export function BudgetProvider({ children }) {
  const [month, setMonthState] = useState(() => localStorage.getItem('sbp_month') || thisMonth());
  const [dashboard, setDashboard] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [paymentTypes, setPaymentTypes] = useState([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [dashboardResult, expensesResult, categoriesResult, paymentTypesResult] = await Promise.all([
        api.get('/dashboard', { params: { month } }),
        api.get('/expenses', { params: { month } }),
        api.get('/categories', { params: { month } }),
        api.get('/payment-types')
      ]);
      setDashboard(dashboardResult.data);
      setExpenses(expensesResult.data.expenses);
      setCategories(categoriesResult.data.categories);
      setPaymentTypes(paymentTypesResult.data.paymentTypes);
    } finally {
      setLoading(false);
    }
  }, [month]);

  const setMonth = useCallback((value) => {
    localStorage.setItem('sbp_month', value);
    setMonthState(value);
  }, []);

  const value = useMemo(
    () => ({
      month,
      setMonth,
      dashboard,
      expenses,
      categories,
      paymentTypes,
      loading,
      refresh
    }),
    [month, dashboard, expenses, categories, paymentTypes, loading, refresh]
  );

  return <BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>;
}

export function useBudget() {
  return useContext(BudgetContext);
}
