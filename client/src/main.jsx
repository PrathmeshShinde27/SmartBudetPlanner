import React from 'react';
import ReactDOM from 'react-dom/client';
import { Navigate, RouterProvider, createBrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './state/AuthContext.jsx';
import { BudgetProvider } from './state/BudgetContext.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Expenses from './pages/Expenses.jsx';
import Categories from './pages/Categories.jsx';
import Settings from './pages/Settings.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import VerifyEmail from './pages/VerifyEmail.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import Admin from './pages/Admin.jsx';
import { registerServiceWorker } from './registerServiceWorker.js';
import './styles.css';

const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  { path: '/register', element: <Register /> },
  { path: '/verify-email', element: <VerifyEmail /> },
  { path: '/forgot-password', element: <ForgotPassword /> },
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <Dashboard /> },
      { path: 'expenses', element: <Expenses /> },
      { path: 'categories', element: <Categories /> },
      { path: 'admin', element: <Admin /> },
      { path: 'settings', element: <Settings /> }
    ]
  }
]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <BudgetProvider>
        <RouterProvider router={router} />
      </BudgetProvider>
    </AuthProvider>
  </React.StrictMode>
);

registerServiceWorker();
