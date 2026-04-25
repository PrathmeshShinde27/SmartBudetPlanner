import { useEffect } from 'react';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { useBudget } from './state/BudgetContext.jsx';

export default function App() {
  const { refresh, month } = useBudget();

  useEffect(() => {
    refresh();
  }, [refresh, month]);

  return (
    <ProtectedRoute>
      <Layout />
    </ProtectedRoute>
  );
}
