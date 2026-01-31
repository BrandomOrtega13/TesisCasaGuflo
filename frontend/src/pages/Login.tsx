import { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import api from "../lib/api";
import { useAuthStore } from "../store/auth";
import { useNavigate } from "react-router-dom";

const schema = z.object({
  email: z.string().email("Ingresa un email válido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

type FormData = z.infer<typeof schema>;

export default function Login() {
  const { register, handleSubmit, formState } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  const [serverMsg, setServerMsg] = useState<string | null>(null);

  const onSubmit = async (data: FormData) => {
    setServerMsg(null);
    try {
      const res = await api.post("/auth/login", data);
      login(res.data.accessToken, res.data.user);
      navigate("/");
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.detail ||
        "Credenciales incorrectas. Verifica tu email y contraseña.";
      setServerMsg(msg);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-stack">
        <div className="auth-brand-card">
          <img
            src="/Logo-web.jpeg"
            alt="KardexPro"
            className="auth-brand-logo"
          />
          <div className="auth-brand-texts">
            <div className="auth-brand-name">KardexPro</div>
            <div className="auth-brand-slogan">Sistema de Inventario</div>
          </div>
        </div>

        <div className="auth-card">
          <div className="auth-head">
            <h1 className="auth-title auth-title-center">Iniciar sesión</h1>
            <p className="auth-subtitle auth-subtitle-center"></p>
          </div>

          {serverMsg && (
            <div className="auth-alert auth-alert--error">{serverMsg}</div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
            <div className="form-field">
              <label className="form-label">Email</label>
              <input
                type="email"
                {...register("email")}
                className="form-input"
                autoComplete="email"
              />
              {formState.errors.email && (
                <p className="form-message form-message-error">
                  {String(formState.errors.email.message)}
                </p>
              )}
            </div>

            <div className="form-field">
              <label className="form-label">Contraseña</label>
              <input
                type="password"
                placeholder="••••••••"
                {...register("password")}
                className="form-input"
                autoComplete="current-password"
              />
              {formState.errors.password && (
                <p className="form-message form-message-error">
                  {String(formState.errors.password.message)}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={formState.isSubmitting}
              className="btn-primary auth-submit"
            >
              {formState.isSubmitting ? "Entrando..." : "Entrar"}
            </button>
          </form>

          <div className="auth-foot">
            <span className="auth-foot-text">Kardex Pro © 2026</span>
          </div>
        </div>
      </div>
    </div>
  );
}
