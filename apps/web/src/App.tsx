import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import { QueryErrorHandler } from './lib/query-error-handler';
import { Layout } from './components/layout/Layout';
import LoginPage from './pages/LoginPage';
import ScenarioListPage from './pages/ScenarioListPage';
import TaskListPage from './pages/TaskListPage';
import TaskDetailPage from './pages/TaskDetailPage';
import RegulationListPage from './pages/RegulationListPage';

function ProtectedRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen text-gray-500">加载中...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return (
    <>
      <QueryErrorHandler />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<TaskListPage />} />
          <Route path="/scenarios" element={<ScenarioListPage />} />
          <Route path="/regulations" element={<RegulationListPage />} />
          <Route path="/tasks" element={<TaskListPage />} />
          <Route path="/tasks/:id" element={<TaskDetailPage />} />
          <Route path="/papers" element={<div>底稿归档 - Coming Soon</div>} />
        </Route>
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/*" element={<ProtectedRoutes />} />
      </Routes>
    </AuthProvider>
  );
}
