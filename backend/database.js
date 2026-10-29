const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');

const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'biblioteca.sqlite');
const SEED_PATH = path.join(DATA_DIR, 'db.json');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(DB_PATH);
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');
db.exec(fs.readFileSync(SCHEMA_PATH, 'utf8'));

/**
 * Importa los datos de demostración desde db.json una sola vez.
 * El archivo JSON se conserva como semilla; después, toda la información
 * operativa se guarda en biblioteca.sqlite.
 */
function importarDatosIniciales() {
  const migracionRealizada = db
    .prepare('SELECT value FROM app_meta WHERE key = ?')
    .get('seed_json_imported');

  if (migracionRealizada) return;

  let semilla = { materiales: [], lectores: [], prestamos: [] };
  if (fs.existsSync(SEED_PATH)) {
    semilla = JSON.parse(fs.readFileSync(SEED_PATH, 'utf8'));
  }

  const insertar = db.transaction(() => {
    const insertarMaterial = db.prepare(`
      INSERT OR IGNORE INTO materiales (id, codigo, titulo, autor, tipo, cantidad)
      VALUES (@id, @codigo, @titulo, @autor, @tipo, @cantidad)
    `);
    const insertarLector = db.prepare(`
      INSERT OR IGNORE INTO lectores (id, codigo, nombre, correo)
      VALUES (@id, @codigo, @nombre, @correo)
    `);
    const insertarPrestamo = db.prepare(`
      INSERT OR IGNORE INTO prestamos (
        id, materialId, lectorId, fechaPrestamo,
        fechaDevolucionPrevista, fechaDevolucionReal, observacion
      ) VALUES (
        @id, @materialId, @lectorId, @fechaPrestamo,
        @fechaDevolucionPrevista, @fechaDevolucionReal, @observacion
      )
    `);

    for (const material of semilla.materiales || []) insertarMaterial.run(material);
    for (const lector of semilla.lectores || []) insertarLector.run(lector);
    for (const prestamo of semilla.prestamos || []) {
      insertarPrestamo.run({ fechaDevolucionReal: null, observacion: '', ...prestamo });
    }

    db.prepare('INSERT INTO app_meta (key, value) VALUES (?, ?)')
      .run('seed_json_imported', new Date().toISOString());
  });

  insertar();
}

importarDatosIniciales();

module.exports = { db, DB_PATH };
