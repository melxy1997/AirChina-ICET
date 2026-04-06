import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';

const navItems = [
  { to: '/', label: '测试任务' },
  { to: '/scenarios', label: '业务场景' },
  { to: '/regulations', label: '规章制度' },
  { to: '/papers', label: '底稿归档' },
];

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex">
      {/* 侧边栏 */}
      <aside className="w-60 bg-slate-800 text-white flex-shrink-0 flex flex-col">
        <div className="p-4 border-b border-slate-700">
          <h1 className="text-lg font-bold">ICET</h1>
          <p className="text-xs text-slate-400">内部控制评价测试系统</p>
        </div>
        <nav className="p-2 flex-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `block px-3 py-2 rounded text-sm mb-1 transition-colors ${
                  isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        {/* 用户信息 */}
        <div className="p-4 border-t border-slate-700">
          <div className="text-sm text-slate-300">{user?.name}</div>
          <div className="text-xs text-slate-500">{user?.role}</div>
          <button onClick={handleLogout} className="text-xs text-slate-400 hover:text-white mt-2">
            退出登录
          </button>
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 p-6 overflow-auto bg-gray-50">
        <Outlet />
      </main>
    </div>
  );
}
