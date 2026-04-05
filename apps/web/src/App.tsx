import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<div>Dashboard - Coming Soon</div>} />
        <Route path="/scenarios" element={<div>业务场景管理 - Coming Soon</div>} />
        <Route path="/regulations" element={<div>规章制度库 - Coming Soon</div>} />
        <Route path="/tasks" element={<div>测试任务列表 - Coming Soon</div>} />
        <Route path="/tasks/:id" element={<div>任务详情 - Coming Soon</div>} />
        <Route path="/papers" element={<div>底稿归档 - Coming Soon</div>} />
      </Route>
    </Routes>
  );
}
