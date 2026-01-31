import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../lib/api";

type CategoriaFormState = {
  nombre: string;
  descripcion: string;
};

export default function CategoriaForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const esNuevo = id === "nueva";

  const [form, setForm] = useState<CategoriaFormState>({
    nombre: "",
    descripcion: "",
  });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Si es edición, cargar datos
  useEffect(() => {
    const load = async () => {
      if (esNuevo || !id) return;
      setLoading(true);
      setMsg(null);
      try {
        const res = await api.get(`/categorias/${id}`);
        setForm({
          nombre: res.data.nombre ?? "",
          descripcion: res.data.descripcion ?? "",
        });
      } catch (err) {
        console.error(err);
        setMsg("Error al cargar categoría");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [esNuevo, id]);

  const onChange =
    (field: keyof CategoriaFormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    try {
      if (esNuevo) {
        await api.post("/categorias", {
          nombre: form.nombre,
          descripcion: form.descripcion || null,
        });
        setMsg("Categoría creada correctamente");
      } else if (id) {
        await api.put(`/categorias/${id}`, {
          nombre: form.nombre,
          descripcion: form.descripcion || null,
        });
        setMsg("Categoría actualizada correctamente");
      }

      setTimeout(() => navigate("/categorias"), 500);
    } catch (err: any) {
      console.error(err);
      const backendMsg = err?.response?.data?.message;
      setMsg(backendMsg || "Error al guardar categoría");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-page">
      <div className="card">
        <button
          type="button"
          className="btn-link-back"
          onClick={() => navigate("/categorias")}
        >
          ← Volver
        </button>

        <h2 className="form-title">
          {esNuevo ? "Nueva categoría" : "Editar categoría"}
        </h2>

        {loading && <p className="form-message">Cargando...</p>}

        {msg && (
          <p
            className={`form-message ${
              msg.includes("Error")
                ? "form-message-error"
                : "form-message-success"
            }`}
          >
            {msg}
          </p>
        )}

        <form onSubmit={onSubmit} className="form-grid">
          <div className="form-field">
            <label className="form-label">Nombre</label>
            <input
              type="text"
              value={form.nombre}
              onChange={onChange("nombre")}
              required
              className="form-input"
            />
          </div>

          <div className="form-field">
            <label className="form-label">Descripción (opcional)</label>
            <textarea
              value={form.descripcion}
              onChange={onChange("descripcion")}
              rows={3}
              className="form-textarea"
            />
          </div>

          <div className="actions-bar">
            <button type="submit" className="btn-primary" disabled={loading}>
              {esNuevo ? "Crear" : "Guardar cambios"}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate("/categorias")}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
