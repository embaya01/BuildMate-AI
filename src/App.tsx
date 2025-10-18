import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'; 
import { useAuth } from './context/AuthContext'; 
import { LandingPage } from './pages/LandingPage'; 
import { AuthProvider } from './context/AuthContext'; 
import { ThemeProvider } from './context/ThemeContext'; 
import { AppLayout } from './layouts/AppLayout'; 
import { LoginPage } from './pages/auth/LoginPage'; 
import { RegisterPage } from './pages/auth/RegisterPage'; 
import { DashboardPage } from './pages/DashboardPage'; 
import { ProjectsPage } from './pages/ProjectsPage'; 
import { MaterialsPage } from './pages/MaterialsPage'; 
import { LaborPage } from './pages/LaborPage'; 
import { ProfilePage } from './pages/ProfilePage'; 
import { SubcontractorsPage } from './pages/SubcontractorsPage'; 
import { SettingsPage } from './pages/SettingsPage'; 
import { EstimatorPage } from './pages/EstimatorPage'; 
 
const LandingRoute = () => { 
  const { user, loading } = useAuth(); 
 
  if (loading) { 
    return ( 
      <div className="fullscreen-state"> 
        <div className="spinner" aria-label="Loading" /> 
      </div> 
    ); 
  } 
 
  if (user) { 
    return <Navigate to="/dashboard" replace />; 
  } 
 
  return <LandingPage />; 
}; 
 
export default function App() { 
  return ( 
    <ThemeProvider> 
      <AuthProvider> 
        <BrowserRouter> 
          <Routes> 
            <Route path="/" element={<LandingRoute />} /> 
            <Route path="/login" element={<LoginPage />} /> 
            <Route path="/register" element={<RegisterPage />} /> 
            <Route element={<AppLayout />}> 
              <Route path="/dashboard" element={<DashboardPage />} /> 
              <Route path="/projects" element={<ProjectsPage />} /> 
              <Route path="/estimates" element={<EstimatorPage />} /> 
              <Route path="/materials" element={<MaterialsPage />} /> 
              <Route path="/labor" element={<LaborPage />} /> 
              <Route path="/profile" element={<ProfilePage />} /> 
              <Route path="/subcontractors" element={<SubcontractorsPage />} /> 
              <Route path="/settings" element={<SettingsPage />} /> 
            </Route> 
            <Route path="*" element={<Navigate to="/" replace />} /> 
          </Routes> 
        </BrowserRouter> 
      </AuthProvider> 
    </ThemeProvider> 
  ); 
} 
