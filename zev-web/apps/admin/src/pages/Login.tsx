import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserStore } from '@/store'
import request from '@/api/request'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const setToken = useUserStore(state => state.setToken)
  const navigate = useNavigate()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const data = await request.post('/system/login', { username, password }) as { token: string }
      setToken(data.token)
      navigate('/')
    } catch (err: unknown) {
      const error = err as Error
      alert(error.message || '登录失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <div className="w-full max-w-sm p-8 border border-border bg-card shadow-sm transition-all">
        <div className="mb-8 text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">登录系统</h1>
          <p className="text-sm text-muted-foreground">请输入您的账号密码进行身份验证</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">用户名</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full px-3 py-2 border border-input bg-background outline-none focus:ring-1 focus:ring-ring transition-all"
              placeholder="请输入用户名"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">密码</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-input bg-background outline-none focus:ring-1 focus:ring-ring transition-all"
              placeholder="请输入密码"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-primary text-primary-foreground hover:opacity-90 transition-opacity font-medium cursor-pointer disabled:opacity-50"
          >
            {loading ? '登录中...' : '登录'}
          </button>
        </form>
      </div>
    </div>
  )
}
