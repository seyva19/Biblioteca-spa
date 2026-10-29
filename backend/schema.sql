-- Esquema SQLite para Biblioteca SPA.
-- Los identificadores se conservan como texto para no cambiar el contrato de la API.

CREATE TABLE IF NOT EXISTS app_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS materiales (
  id TEXT PRIMARY KEY,
  codigo TEXT NOT NULL COLLATE NOCASE UNIQUE,
  titulo TEXT NOT NULL,
  autor TEXT NOT NULL,
  tipo TEXT NOT NULL,
  cantidad INTEGER NOT NULL CHECK (cantidad >= 1)
);

CREATE TABLE IF NOT EXISTS lectores (
  id TEXT PRIMARY KEY,
  codigo TEXT NOT NULL COLLATE NOCASE UNIQUE,
  nombre TEXT NOT NULL,
  correo TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS prestamos (
  id TEXT PRIMARY KEY,
  materialId TEXT NOT NULL,
  lectorId TEXT NOT NULL,
  fechaPrestamo TEXT NOT NULL,
  fechaDevolucionPrevista TEXT NOT NULL,
  fechaDevolucionReal TEXT,
  observacion TEXT NOT NULL DEFAULT '',
  FOREIGN KEY (materialId) REFERENCES materiales(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  FOREIGN KEY (lectorId) REFERENCES lectores(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CHECK (fechaDevolucionPrevista >= fechaPrestamo),
  CHECK (fechaDevolucionReal IS NULL OR fechaDevolucionReal >= fechaPrestamo)
);

CREATE INDEX IF NOT EXISTS idx_prestamos_material_activo
  ON prestamos (materialId, fechaDevolucionReal);

CREATE INDEX IF NOT EXISTS idx_prestamos_lector
  ON prestamos (lectorId);

CREATE INDEX IF NOT EXISTS idx_prestamos_fecha_prevista
  ON prestamos (fechaDevolucionPrevista);

-- Cuentas de acceso para administradores y estudiantes.
CREATE TABLE IF NOT EXISTS usuarios (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  email TEXT NOT NULL COLLATE NOCASE UNIQUE,
  passwordHash TEXT NOT NULL,
  rol TEXT NOT NULL CHECK (rol IN ('admin', 'estudiante')),
  lectorId TEXT UNIQUE,
  creadoEn TEXT NOT NULL,
  FOREIGN KEY (lectorId) REFERENCES lectores(id)
    ON UPDATE CASCADE ON DELETE RESTRICT
);

-- Solicitudes de préstamo: no afectan existencias hasta ser aprobadas.
CREATE TABLE IF NOT EXISTS solicitudes (
  id TEXT PRIMARY KEY,
  materialId TEXT NOT NULL,
  lectorId TEXT NOT NULL,
  fechaSolicitud TEXT NOT NULL,
  fechaDevolucionPrevista TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'PENDIENTE'
    CHECK (estado IN ('PENDIENTE', 'APROBADA', 'RECHAZADA')),
  observacion TEXT NOT NULL DEFAULT '',
  prestamoId TEXT UNIQUE,
  FOREIGN KEY (materialId) REFERENCES materiales(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  FOREIGN KEY (lectorId) REFERENCES lectores(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  FOREIGN KEY (prestamoId) REFERENCES prestamos(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CHECK (fechaDevolucionPrevista >= fechaSolicitud)
);

CREATE INDEX IF NOT EXISTS idx_solicitudes_estado_fecha
  ON solicitudes (estado, fechaSolicitud);
CREATE INDEX IF NOT EXISTS idx_solicitudes_lector
  ON solicitudes (lectorId, fechaSolicitud);
