import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Compras from './pages/Compras';
import Mermas from './pages/Mermas';
import Mesas from './pages/Mesas';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Empleados from './pages/Empleados';
import RegistrarEmpleado from './pages/RegistrarEmpleado';
import Insumos from './pages/Insumos';
import OlvideContrasena from './pages/OlvideContrasena';
import RestablecerContrasena from './pages/RestablecerContrasena';

function PrivateRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated() ? <Layout>{children}</Layout> : <Navigate to="/" />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/recuperar" element={<OlvideContrasena />} />
      <Route path="/restablecer" element={<RestablecerContrasena />} />
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/empleados"
        element={
          <PrivateRoute>
            <Empleados />
          </PrivateRoute>
        }
      />
      <Route
        path="/empleados/nuevo"
        element={
          <PrivateRoute>
            <RegistrarEmpleado />
          </PrivateRoute>
        }
      />
      <Route
        path="/insumos"
        element={
          <PrivateRoute>
            <Insumos />
          </PrivateRoute>
        }
      />
      <Route path="/mermas" element={<PrivateRoute><Mermas /></PrivateRoute>} />
      <Route path="/compras" element={<PrivateRoute><Compras /></PrivateRoute>} />
      <Route path="/mesas" element={<PrivateRoute><Mesas /></PrivateRoute>} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
