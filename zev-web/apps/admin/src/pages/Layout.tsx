import { Outlet, Navigate, useNavigate } from 'react-router-dom'
import { useUserStore } from '@/store'

export default function Layout() {
  const token = useUserStore(state => state.token)
  const logout = useUserStore(state => state.logout)
  const navigate = useNavigate()

  if (!token) {
    return <Navigate to="/login" replace />
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex bg-secondary">
      {/* 侧边栏 */}
      <aside className="w-64 bg-card border-r border-border flex flex-col">
        <div className="h-16 flex items-center justify-center border-b border-border">
          <span className="text-lg font-bold tracking-widest">ZEV ADMIN</span>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <div className="px-4 py-2 bg-secondary text-secondary-foreground text-sm font-medium cursor-pointer transition-colors border border-transparent">
            仪表盘
          </div>
          <div className="px-4 py-2 text-muted-foreground hover:bg-secondary/50 text-sm font-medium cursor-pointer transition-colors border border-transparent">
            角色权限管理
          </div>
        </nav>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 flex flex-col">
        {/* 顶部导航 */}
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-8">
          <div className="text-sm text-muted-foreground">
            主页 / 仪表盘
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium">管理员</span>
            <button onClick={handleLogout} className="text-sm text-muted-foreground hover:text-foreground cursor-pointer">
              退出登录
            </button>
          </div>
        </header>

        {/* 路由内容 */}
        <div className="flex-1 p-8 bg-background overflow-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
