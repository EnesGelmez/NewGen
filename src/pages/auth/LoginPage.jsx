import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Zap, ArrowRight, AlertCircle } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";

const DEMO_CREDENTIALS = [
  {
    label: "Super Admin",
    email: "admin@newgen.dev",
    pass: "admin123",
    color: "bg-purple-100 text-purple-700 border-purple-200",
    desc: "Tüm sistemi yönetir",
  },
  {
    label: "Arçelik Admin",
    email: "admin@arcelik.com",
    pass: "admin123",
    color: "bg-blue-100 text-blue-700 border-blue-200",
    desc: "Arçelik A.Ş. — Tenant Yöneticisi",
  },
  {
    label: "Beko Admin",
    email: "admin@beko.com",
    pass: "admin123",
    color: "bg-emerald-100 text-emerald-700 border-emerald-200",
    desc: "Beko A.Ş. — Tenant Yöneticisi",
  },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading, error, clearError } = useAuthStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    const success = await login(email, password);
    if (success) {
      const user = useAuthStore.getState().user;
      if (user.role === "SUPER_ADMIN") {
        navigate("/admin");
      } else {
        navigate("/tenant");
      }
    }
  };

  const fillDemo = (cred) => {
    setEmail(cred.email);
    setPassword(cred.pass);
    clearError();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-purple-500/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-blue-500 shadow-xl shadow-blue-500/30 mb-4">
            <Zap size={26} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">NexusBridge</h1>
          <p className="text-sm text-white/50 mt-1">
            LOGO ERP Integration Platform
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl bg-white shadow-2xl shadow-black/20">
          {/* Header stripe */}
          <div className="rounded-t-2xl bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-5">
            <h2 className="text-lg font-semibold text-white">Giriş Yap</h2>
            <p className="text-sm text-blue-100/80 mt-0.5">
              Hesabınıza erişmek için bilgilerinizi girin
            </p>
          </div>

          <div className="p-6 space-y-5">
            {/* Demo pills */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Demo Hesaplar
              </p>
              <div className="space-y-1.5">
                {DEMO_CREDENTIALS.map((cred) => (
                  <button
                    key={cred.email}
                    onClick={() => fillDemo(cred)}
                    className={`w-full flex items-center justify-between rounded-lg border px-3 py-2 text-xs transition-all hover:shadow-sm ${cred.color}`}
                  >
                    <div className="text-left">
                      <span className="font-semibold">{cred.label}</span>
                      <span className="mx-2 opacity-50">·</span>
                      <span className="opacity-70">{cred.desc}</span>
                    </div>
                    <ArrowRight size={12} className="opacity-50" />
                  </button>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-3 text-muted-foreground">
                  veya manuel giriş
                </span>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                  <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Input
                label="E-posta Adresi"
                type="email"
                placeholder="ornek@sirket.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">
                  Şifre
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Şifrenizi girin"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-2 pr-10 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-10"
                loading={isLoading}
              >
                {isLoading ? "Giriş yapılıyor..." : "Giriş Yap"}
                {!isLoading && <ArrowRight size={15} />}
              </Button>
            </form>
          </div>
        </div>

        <p className="text-center text-xs text-white/30 mt-6">
          © 2026 NexusBridge · Enterprise Integration Platform
        </p>
      </div>
    </div>
  );
}
