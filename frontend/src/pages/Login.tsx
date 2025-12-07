import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import api from '../lib/api';
import { useAuthStore } from '../store/auth';
import { useNavigate } from 'react-router-dom';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

type FormData = z.infer<typeof schema>;

export default function Login() {
  const { register, handleSubmit, formState } = useForm<FormData>({
    resolver: zodResolver(schema),
  });
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  const onSubmit = async (data: FormData) => {
    const res = await api.post('/auth/login', data);
    login(res.data.accessToken, res.data.user);
    navigate('/');
  };

  return (
    <div className="form-card" style={{ marginTop: 40 }}>
      <h1 className="form-title">Iniciar sesión</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="form-grid">
        <div className="form-field">
          <label className="form-label">Email</label>
          <input
            {...register('email')}
            className="form-input"
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
            {...register('password')}
            className="form-input"
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
          className="btn-primary"
        >
          Entrar
        </button>
      </form>
    </div>
  );
}
