import { useState } from "react";
import { Disc3, Mail, Lock, LogIn, UserPlus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const DJLogin = () => {
  const { signIn, signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setLoading(true);
    const { error } = isSignUp
      ? await signUp(email, password)
      : await signIn(email, password);

    if (error) {
      toast.error(error.message);
    } else if (isSignUp) {
      toast.success("Conta criada! Você já está logado.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6 text-center animate-slide-up">
        <div className="w-16 h-16 rounded-2xl bg-gradient-neon flex items-center justify-center mx-auto">
          <Disc3 className="w-8 h-8 text-primary-foreground animate-spin" style={{ animationDuration: '3s' }} />
        </div>
        <div>
          <h1 className="font-display font-bold text-2xl text-foreground">
            Toca<span className="text-primary text-glow-cyan">Ai</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isSignUp ? "Crie sua conta de DJ" : "Painel do DJ"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email..."
              className="w-full pl-10 pr-4 py-3 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:border-glow-cyan transition-all text-sm"
              autoFocus
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Senha..."
              className="w-full pl-10 pr-4 py-3 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:border-glow-cyan transition-all text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-gradient-neon text-primary-foreground font-display font-bold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <Disc3 className="w-4 h-4 animate-spin" />
            ) : isSignUp ? (
              <>
                <UserPlus className="w-4 h-4" />
                Criar conta
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                Entrar
              </>
            )}
          </button>
        </form>

        <button
          onClick={() => setIsSignUp(!isSignUp)}
          className="text-xs text-primary hover:underline underline-offset-4"
        >
          {isSignUp ? "Já tem conta? Faça login" : "Não tem conta? Cadastre-se"}
        </button>
      </div>
    </div>
  );
};

export default DJLogin;
