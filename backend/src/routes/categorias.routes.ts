import { Router } from "express";
import { Pool } from "pg";

const router = Router();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * GET /categorias
 * Lista todas las categorías
 */
router.get("/", async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, nombre, descripcion
       FROM categorias
       ORDER BY nombre ASC`
    );
    res.json(result.rows);
  } catch (err: any) {
    console.error("Error en GET /categorias:", err.message || err);
    res.status(500).json({ message: "Error al obtener categorías" });
  }
});

/**
 * POST /categorias
 * Crea una nueva categoría
 */
router.post("/", async (req, res) => {
  try {
    const { nombre, descripcion } = req.body;

    if (!nombre || !nombre.trim()) {
      return res
        .status(400)
        .json({ message: "El nombre de la categoría es obligatorio" });
    }

    const result = await pool.query(
      `INSERT INTO categorias (nombre, descripcion)
       VALUES ($1, $2)
       RETURNING id, nombre, descripcion`,
      [nombre.trim(), descripcion || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    if (err.code === "23505") {
      // UNIQUE violation en nombre
      return res
        .status(400)
        .json({ message: "Ya existe una categoría con ese nombre" });
    }
    console.error("Error en POST /categorias:", err.message || err);
    res.status(500).json({ message: "Error al crear categoría" });
  }
});

/**
 * GET /categorias/:id
 * Obtiene una categoría por id
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT id, nombre, descripcion
       FROM categorias
       WHERE id = $1`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Categoría no encontrada' });
    }

    res.json(result.rows[0]);
  } catch (err: any) {
    console.error('Error en GET /categorias/:id:', err.message || err);
    res.status(500).json({ message: 'Error al obtener categoría' });
  }
});

/**
 * PUT /categorias/:id
 * Actualiza nombre/descripcion de una categoría
 */
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion } = req.body;

    const result = await pool.query(
      `UPDATE categorias
       SET
         nombre      = COALESCE($1, nombre),
         descripcion = COALESCE($2, descripcion)
       WHERE id = $3
       RETURNING id, nombre, descripcion`,
      [nombre?.trim() ?? null, descripcion ?? null, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Categoría no encontrada" });
    }

    res.json(result.rows[0]);
  } catch (err: any) {
    if (err.code === "23505") {
      return res
        .status(400)
        .json({ message: "Ya existe una categoría con ese nombre" });
    }
    console.error("Error en PUT /categorias/:id:", err.message || err);
    res.status(500).json({ message: "Error al actualizar categoría" });
  }
});

/**
 * DELETE /categorias/:id
 * Intenta eliminar. Si tiene productos asociados, devuelve error entendible.
 */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM categorias
       WHERE id = $1`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Categoría no encontrada" });
    }

    return res.status(204).send();
  } catch (err: any) {
    // 23503 = foreign_key_violation (hay productos usando esa categoría)
    if (err.code === "23503") {
      return res.status(400).json({
        message:
          "No se puede eliminar la categoría porque tiene productos asociados",
      });
    }
    console.error("Error en DELETE /categorias/:id:", err.message || err);
    res.status(500).json({ message: "Error al eliminar categoría" });
  }
});

export default router;
