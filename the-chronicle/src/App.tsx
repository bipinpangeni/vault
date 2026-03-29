import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { SupabaseProvider, useAuth } from './components/SupabaseProvider';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { BlogPost } from './pages/BlogPost';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminEditor } from './pages/AdminEditor';
import { StaticPage } from './pages/StaticPage';
import { Login } from './pages/Login';
import { About } from './pages/About';
import { Contact } from './pages/Contact';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAdmin, loading } = useAuth();
  const location = useLocation();
  
  if (loading) return (
    <div className="flex justify-center items-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
    </div>
  );
  
  if (!user || !isAdmin) return <Navigate to="/login" state={{ from: location }} replace />;
  
  return <>{children}</>;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Layout><Home /></Layout>} />
      <Route path="/post/:slug" element={<Layout><BlogPost /></Layout>} />
      <Route path="/about" element={<Layout><About /></Layout>} />
      <Route path="/contact" element={<Layout><Contact /></Layout>} />
      <Route path="/privacy" element={<Layout><StaticPage key="privacy" /></Layout>} />
      <Route path="/terms" element={<Layout><StaticPage key="terms" /></Layout>} />
      
      {/* Admin Routes */}
      <Route path="/admin" element={
        <ProtectedRoute>
          <Layout><AdminDashboard /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/admin/new" element={
        <ProtectedRoute>
          <Layout><AdminEditor /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/admin/edit/:id" element={
        <ProtectedRoute>
          <Layout><AdminEditor /></Layout>
        </ProtectedRoute>
      } />
      
      <Route path="*" element={<Layout><div className="text-center py-20"><h1 className="text-4xl font-bold">404 - Not Found</h1></div></Layout>} />
    </Routes>
  );
}

import { HelmetProvider } from 'react-helmet-async';

export default function App() {
  return (
    <HelmetProvider>
      <SupabaseProvider>
        <Router>
          <AppRoutes />
        </Router>
      </SupabaseProvider>
    </HelmetProvider>
  );
}
