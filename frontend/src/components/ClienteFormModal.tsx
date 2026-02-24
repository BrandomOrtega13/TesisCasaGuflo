import { useEffect, useState } from "react";
import api from "../lib/api";

type FormState = {
  identificacion: string;
  nombre: string;
  telefono: string;
  correo: string;
};

// Permite: + (solo al inicio) + números + espacios + guiones + paréntesis
const normalizePhone = (raw: any) => {
  const s = String(raw ?? "").trim();
  const cleaned = s.replace(/[^\d+\s()-]/g, "");
  const plusFixed = cleaned.replace(/\+/g, (_m, idx) => (idx === 0 ? "+" : ""));
  return plusFixed;
};

const digitsCount = (raw: any) => String(raw ?? "").replace(/\D/g, "").trim().length;

export default function ClienteFormModal({
  open,
  clienteId,
  onClose,
  onSaved,
}: {
  open: boolean;
  clienteId: string | null; // null => nuevo
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = !clienteId;

  const [form, setForm] = useState<FormState>({
    identificacion: "",
    nombre: "",
    telefono: "",
    correo: "",
  });

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    const load = async () => {
      setMsg(null);

      if (isNew) {
        setForm({ identificacion: "", nombre: "", telefono: "", correo: "" });
        return;
      }

      setLoading(true);
      try {
        const r = await api.get(`/clientes/${clienteId}`);
        setForm({
          identificacion: r.data.identificacion ?? "",
          nombre: r.data.nombre ?? "",
          telefono: r.data.telefono ?? "",
          correo: r.data.correo ?? "",
        });
      } catch (err) {
        console.error(err);
        setMsg("Error al cargar cliente");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [open, clienteId, isNew]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    // Limpieza para teléfono
    const telefonoClean = normalizePhone(form.telefono);
    const telefonoDigits = digitsCount(telefonoClean);

    // payload que enviamos
    const payload = {
      identificacion: form.identificacion,
      nombre: form.nombre.trim(),
      // si el teléfono queda vacío => enviamos ""
      telefono: telefonoClean,
      // correo sin validar
      correo: String(form.correo ?? "").trim(),
    };

    try {
      if (!payload.nombre) {
        setMsg("El nombre es obligatorio");
        setLoading(false);
        return;
      }

      // Teléfono: opcional, pero si viene debe tener mínimo 10 dígitos
      if (payload.telefono && telefonoDigits > 0 && telefonoDigits < 10) {
        setMsg("El teléfono debe tener mínimo 10 dígitos (o dejarlo vacío)");
        setLoading(false);
        return;
      }

      if (isNew) {
        await api.post("/clientes", payload);
      } else {
        await api.put(`/clientes/${clienteId}`, payload);
      }

      onSaved();
      onClose();
    } catch (err: any) {
      console.error(err);
      const m = err?.response?.data?.message || "Error al guardar cliente";
      setMsg(m);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div
        className="modal-card"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-head">
          <div className="modal-title">{isNew ? "Nuevo cliente" : "Editar cliente"}</div>

          <button type="button" onClick={onClose} className="modal-close" aria-label="Cerrar">
            ✕
          </button>
        </div>

        <div className="modal-body">
          <div className="card">
            {loading && <p className="list-message">Cargando...</p>}

            {msg && (
              <p
                className={
                  "form-message " +
                  (msg.includes("Error") ? "form-message-error" : "form-message-success")
                }
              >
                {msg}
              </p>
            )}

            <form onSubmit={onSubmit} className="form-grid">
              <div className="form-field">
                <label className="form-label">Cédula o RUC *</label>
                <input
                  className="form-input"
                  name="identificacion"
                  value={form.identificacion}
                  onChange={onChange}
                  required
                  placeholder="Ingrese numero de cedula o RUC del cliente"
                />
              </div>

              <div className="form-field">
                <label className="form-label">Nombre *</label>
                <input
                  className="form-input"
                  name="nombre"
                  value={form.nombre}
                  onChange={onChange}
                  required
                  placeholder="Ingrese el nombre del cliente"
                />
              </div>

              <div className="form-field">
                <label className="form-label">Contacto celular</label>
                <input
                  className="form-input"
                  name="telefono"
                  value={form.telefono}
                  onChange={onChange}
                  placeholder="Opcional, mínimo 10 dígitos"
                />
              </div>

              <div className="form-field">
                <label className="form-label">Correo</label>
                <input
                  className="form-input"
                  name="correo"
                  value={form.correo}
                  onChange={onChange}
                  placeholder="Opcional"
                />
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button className="btn-primary" type="submit" disabled={loading}>
                  {loading ? "Guardando..." : "Guardar"}
                </button>
                <button className="btn-secondary" type="button" onClick={onClose}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
