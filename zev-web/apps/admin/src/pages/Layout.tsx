import { Outlet, Navigate, useNavigate, useLocation, Link } from 'react-router-dom'
import { useUserStore } from '@/store'
import { LayoutDashboard, Home, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function Layout() {
  const token = useUserStore(state => state.token)
  const logout = useUserStore(state => state.logout)
  const navigate = useNavigate()
  const location = useLocation()

  if (!token) {
    return <Navigate to="/login" replace />
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: Home },
    { name: 'User Management', path: '/users', icon: Users },
  ]

  return (
    <div className="min-h-screen flex bg-white text-black text-sm">
      {/* Sidebar */}
      <aside className="w-[240px] bg-white border-r border-[#E5E5E5] flex flex-col">
        <div className="h-16 px-6 flex items-center space-x-3 border-b border-[#E5E5E5]">
          <LayoutDashboard className="h-5 w-5" />
          <span className="text-base font-semibold">Zev Admin</span>
        </div>
        <nav className="flex-1 p-6 space-y-1">
          {navItems.map(item => {
            const Icon = item.icon
            const active = location.pathname.startsWith(item.path)
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center space-x-3 px-4 py-3 cursor-pointer transition-colors font-medium",
                  active ? "bg-[#F5F5F5] text-black" : "text-[#666666] hover:bg-[#F5F5F5]"
                )}
              >
                <Icon className="h-[18px] w-[18px]" />
                <span className="text-sm">{item.name}</span>
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Top Header */}
        <header className="h-16 px-8 bg-white border-b border-[#E5E5E5] flex items-center justify-between">
          <div className="text-sm text-[#666666]">
            Dashboard / Home
          </div>
          <div className="flex items-center space-x-3">
            <span className="font-medium text-black text-sm">Admin</span>
            <div className="h-8 w-8 bg-[#F5F5F5] flex items-center justify-center text-xs">
              M
            </div>
            <button onClick={handleLogout} className="text-xs text-[#666666] hover:text-black focus:outline-none">
              [退出]
            </button>
          </div>
        </header>

        {/* Page Content area */}
        <div className="flex-1 p-[48px] overflow-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
