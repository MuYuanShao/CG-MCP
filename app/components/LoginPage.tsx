import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  ChevronRight,
  Clock,
  Shield,
  TrendingUp,
  UserCheck,
  Building2,
  ClipboardList,
  FileCheck,
} from 'lucide-react';
import { login, type StoredUser } from '../services/auth';
import { Button } from './ui/button';

interface LoginPageProps {
  onLoginSuccess: (user: StoredUser) => void;
}

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const queryClient = useQueryClient();
  const [loginForm, setLoginForm] = useState({ username: 'root', password: '' });

  const loginMutation = useMutation({
    mutationFn: () => login(loginForm.username, loginForm.password),
    onSuccess: (user) => {
      onLoginSuccess(user);
      queryClient.clear();
    },
  });

  return (
    <div className="min-h-screen overflow-hidden bg-[#f6f8fb] text-[#111827]">
      <div className="grid min-h-screen lg:grid-cols-[1.08fr_0.92fr]">
        <section className="relative hidden overflow-hidden bg-[#07111f] px-12 py-10 text-white lg:flex lg:flex-col lg:justify-between xl:px-16">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(45,212,191,0.22),transparent_28%),linear-gradient(135deg,rgba(14,165,233,0.16),transparent_42%)]" />
          <div className="absolute right-10 top-12 h-72 w-72 rotate-6 rounded-[2rem] border border-white/10 bg-white/[0.03]" />
          <div className="absolute bottom-14 left-12 h-52 w-52 -rotate-12 rounded-[2rem] border border-cyan-200/10 bg-cyan-200/[0.04]" />
          <div className="relative z-10 flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-white text-[#07111f] shadow-lg shadow-cyan-950/30">
              <Shield className="size-5" />
            </div>
            <div>
              <div className="text-sm font-medium uppercase tracking-[0.28em] text-cyan-100/80">SPD Portal</div>
              <div className="text-lg font-semibold">供应商协同平台</div>
            </div>
          </div>
          <div className="relative z-10 max-w-2xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-4 py-2 text-sm text-cyan-50/90 shadow-xl shadow-black/10 backdrop-blur">
              <CheckCircle2 className="size-4 text-cyan-200" />
              医院供应链全流程在线协同
            </div>
            <h1 className="max-w-xl text-4xl font-semibold leading-tight tracking-normal xl:text-5xl">
              统一管理订单、资质、验收与结算
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-slate-200/78">
              以供应商业务视角整合采购、配送、库存、发票和对账数据，让关键节点更清晰，处理效率更稳定。
            </p>
            <div className="mt-10 grid max-w-xl grid-cols-3 gap-3">
              {([
                { label: '待处理订单', value: '128', icon: ClipboardList },
                { label: '资质预警', value: '16', icon: FileCheck },
                { label: '本月履约率', value: '96%', icon: TrendingUp },
              ] as const).map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="rounded-lg border border-white/10 bg-white/[0.06] p-4 backdrop-blur">
                    <Icon className="mb-4 size-5 text-cyan-200" />
                    <div className="text-2xl font-semibold">{item.value}</div>
                    <div className="mt-1 text-xs text-slate-300">{item.label}</div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="relative z-10 grid grid-cols-2 gap-3 text-sm text-slate-200/80">
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-cyan-200" />
              7x24 小时业务访问
            </div>
            <div className="flex items-center gap-2">
              <Building2 className="size-4 text-cyan-200" />
              多医院授权协同
            </div>
          </div>
        </section>
        <main className="flex min-h-screen items-center justify-center px-5 py-8 sm:px-8">
          <form
            className="w-full max-w-[440px] rounded-lg border border-slate-200 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.12)] sm:p-8"
            onSubmit={(event) => {
              event.preventDefault();
              loginMutation.mutate();
            }}
          >
            <div className="mb-8">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-lg bg-[#0f172a] text-white shadow-md">
                    <Shield className="size-5" />
                  </div>
                  <div>
                    <div className="text-sm text-slate-500">SPD Portal</div>
                    <div className="font-semibold text-slate-950">供应商平台</div>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">安全登录</span>
              </div>
              <h1 className="text-2xl font-semibold leading-tight text-slate-950">欢迎回来</h1>
              <p className="mt-2 text-sm leading-6 text-slate-500">请输入管理员账号后继续访问业务系统。</p>
            </div>
            <div className="space-y-5">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">用户名</span>
                <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 px-3 transition focus-within:border-[#0f172a] focus-within:bg-white focus-within:ring-4 focus-within:ring-slate-900/8">
                  <UserCheck className="mr-2 size-4 text-slate-400" />
                  <input
                    value={loginForm.username}
                    onChange={(event) => setLoginForm((current) => ({ ...current, username: event.target.value }))}
                    className="h-11 w-full bg-transparent text-sm text-slate-950 outline-none placeholder:text-slate-400"
                    autoComplete="username"
                    placeholder="请输入用户名"
                  />
                </div>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">密码</span>
                <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 px-3 transition focus-within:border-[#0f172a] focus-within:bg-white focus-within:ring-4 focus-within:ring-slate-900/8">
                  <Shield className="mr-2 size-4 text-slate-400" />
                  <input
                    type="password"
                    value={loginForm.password}
                    onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
                    className="h-11 w-full bg-transparent text-sm text-slate-950 outline-none placeholder:text-slate-400"
                    autoComplete="current-password"
                    placeholder="请输入密码"
                  />
                </div>
              </label>
              <Button
                type="submit"
                size="lg"
                className="mt-2 h-11 w-full rounded-lg bg-[#0f172a] text-white shadow-lg shadow-slate-900/15 hover:bg-[#1e293b]"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? '登录中...' : '登录平台'}
                <ChevronRight className="size-4" />
              </Button>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3 border-t border-slate-100 pt-5 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-500" />
                权限实时校验
              </div>
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-cyan-600" />
                操作全程留痕
              </div>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}
