import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  BarChart3,
  LayoutGrid,
  Trophy,
  Map,
  PlusCircle,
  LogOut,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "../auth/AuthContext";

const navItems = [
  { to: "/", label: "Insights", icon: BarChart3, end: true },
  { to: "/submissions", label: "Locations", icon: LayoutGrid, end: false },
  { to: "/accuracy", label: "Accuracy", icon: ShieldCheck, end: false },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy, end: false },
  { to: "/map", label: "Map", icon: Map, end: false },
  { to: "/add", label: "Add Location", icon: PlusCircle, end: false },
];

export function DashboardLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="md:w-64 md:min-h-screen glass-panel md:rounded-none border-b md:border-b-0 md:border-r border-white/10 flex md:flex-col p-4 md:p-6 gap-2 md:gap-1 items-center md:items-stretch">
        <div className="flex items-center gap-2 md:mb-8 mr-auto md:mr-0">
          <div className="bg-gradient-to-br from-blue-500 to-emerald-500 p-2 rounded-xl">
            <MapPin className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight hidden md:inline text-white">
            Snaptag
          </span>
        </div>

        <nav className="flex md:flex-col gap-1 md:gap-2 flex-1">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? "bg-white/15 text-white shadow-inner"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="hidden md:inline">{label}</span>
            </NavLink>
          ))}
        </nav>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:text-white hover:bg-red-500/20 transition-all"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span className="hidden md:inline">Logout</span>
        </button>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 p-4 md:p-8 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
