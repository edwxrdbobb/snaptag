import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, User, MapPin } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../auth/AuthContext";

export function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  if (isAuthenticated) {
    navigate("/", { replace: true });
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (login(username, password)) {
      toast.success("Welcome back!");
      navigate("/", { replace: true });
    } else {
      toast.error("Invalid username or password");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm glass-panel text-white p-8 rounded-3xl shadow-2xl animate-in fade-in zoom-in duration-500">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-emerald-500 p-3 rounded-2xl mb-4">
            <MapPin className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Snaptag Dashboard</h1>
          <p className="text-sm text-white/50 mt-1">Sign in to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-white/80 ml-1">
              Username
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full glass-input rounded-xl pl-11 pr-4 py-3 text-sm"
                required
                autoFocus
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-white/80 ml-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full glass-input rounded-xl pl-11 pr-4 py-3 text-sm"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg hover:shadow-cyan-500/20 transform hover:-translate-y-0.5 mt-2"
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
