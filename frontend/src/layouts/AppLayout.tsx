import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: "📊", end: true },
  { to: "/jobs", label: "Jobs & Scheduling", icon: "🗓️" },
  { to: "/clients", label: "Clients", icon: "🏢" },
  { to: "/properties", label: "Properties", icon: "📍" },
  { to: "/invoices", label: "Invoices", icon: "🧾" },
  { to: "/inventory", label: "Inventory", icon: "📦" },
  { to: "/inspections", label: "Inspections", icon: "✅" },
  { to: "/staff", label: "Staff", icon: "👥", adminOnly: true },
];

export function AppLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
          <span className="text-2xl">🧹</span>
          <div>
            <div className="text-sm font-bold leading-tight text-slate-900">CFBS</div>
            <div className="text-xs text-slate-500 leading-tight">Cleaning &amp; Facility Ops</div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV_ITEMS.filter((item) => !item.adminOnly || user?.role === "ADMIN").map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-50"
                }`
              }
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-200 p-4">
          <div className="text-sm font-medium text-slate-900">{user?.name}</div>
          <div className="text-xs text-slate-500">{user?.email}</div>
          <button onClick={logout} className="btn-secondary mt-3 w-full text-xs">
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-x-hidden bg-slate-50 p-6">
        <Outlet />
      </main>
    </div>
  );
}
