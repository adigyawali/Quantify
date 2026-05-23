import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';

import Landing from './pages/Landing/Landing';
import Login from './pages/Auth/Login';
import Signup from './pages/Auth/Signup';
import AppShell from './components/layout/AppShell';
import Dashboard from './pages/Dashboard/Dashboard';
import Search from './pages/Stock/Search';
import StockDetail from './pages/Stock/StockDetail';
import Portfolio from './pages/Portfolio/Portfolio';
import Watchlist from './pages/Watchlist/Watchlist';
import Profile from './pages/Profile/Profile';

function Protected({ children }) {
  const { isAuthed, ready } = useAuth();
  const location = useLocation();
  if (!ready) return null;
  if (!isAuthed) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

function PublicOnly({ children }) {
  const { isAuthed, ready } = useAuth();
  if (!ready) return null;
  if (isAuthed) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login"  element={<PublicOnly><Login /></PublicOnly>} />
          <Route path="/signup" element={<PublicOnly><Signup /></PublicOnly>} />

          <Route element={<Protected><AppShell /></Protected>}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/search"    element={<Search />} />
            <Route path="/stock/:ticker" element={<StockDetail />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/watchlist" element={<Watchlist />} />
            <Route path="/profile"   element={<Profile />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
