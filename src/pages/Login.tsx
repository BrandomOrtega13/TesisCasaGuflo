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
  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema) });
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  const onSubmit = async (data: FormData) => {
    const res = await api.post('/auth/login', data);
    login(res.data.accessToken, res.data.user);
    navigate('/');
  };

  return (
    <div style={{ maxWidth:420, margin:'24px auto', background:'#fff', padding:24,
      borderRadius:8, border:'1px solid #e5e7eb' }}>
      <h1 style={{ fontSize:20, fontWeight:600, marginBottom:12 }}>Iniciar sesión</h1>
      <form onSubmit={handleSubmit(onSubmit)} style={{ display:'grid', gap:12 }}>
        <div>
          <label style={{ display:'block', fontSize:12 }}>Email</label>
          <input {...register('email')}
            style={{ border:'1px solid #cbd5e1', borderRadius:6, width:'100%', padding:'8px 12px' }} />
          {errors.email && <p style={{ color:'#dc2626', fontSize:12 }}>{String(errors.email.message)}</p>}
        </div>
        <div>
          <label style={{ display:'block', fontSize:12 }}>Contraseña</label>
          <input type="password" {...register('password')}
            style={{ border:'1px solid #cbd5e1', borderRadius:6, width:'100%', padding:'8px 12px' }} />
          {errors.password && <p style={{ color:'#dc2626', fontSize:12 }}>{String(errors.password.message)}</p>}
        </div>
        <button disabled={isSubmitting}
          style={{ background:'#000', color:'#fff', padding:'8px 12px', borderRadius:6 }}>
          Entrar
        </button>
      </form>
    </div>
  );
}
