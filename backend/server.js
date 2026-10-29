const express = require('express');
const cors = require('cors');
const crypto = require('node:crypto');
const { db, DB_PATH } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const AUTH_SECRET = process.env.AUTH_SECRET || 'biblioteca-dev-secret-cambiar-antes-de-publicar';
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@biblioteca.local').trim().toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin123!';

app.use(cors());
app.use(express.json());

function fechaLocal() {
  const ahora = new Date();
  const anio = ahora.getFullYear();
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  const dia = String(ahora.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

function fechaValida(fecha) {
  if (typeof fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const comprobacion = new Date(Date.UTC(anio, mes - 1, dia));
  return comprobacion.getUTCFullYear() === anio
    && comprobacion.getUTCMonth() === mes - 1
    && comprobacion.getUTCDate() === dia;
}

function estadoActual(prestamo) {
  if (prestamo.fechaDevolucionReal) return 'DEVUELTO';
  if (prestamo.fechaDevolucionPrevista < fechaLocal()) return 'VENCIDO';
  return 'PRESTADO';
}

function crearId(prefijo) {
  return `${prefijo}-${crypto.randomUUID()}`;
}

function responderError(res, mensaje, status = 400) {
  return res.status(status).json({ error: mensaje });
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verificarPassword(password, stored) {
  if (typeof password !== 'string' || !stored || !stored.includes(':')) return false;
  const [salt, expectedHex] = stored.split(':');
  const actual = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, 'hex');
  return expected.length === actual.length && crypto.timingSafeEqual(actual, expected);
}

function usuarioPublico(usuario) {
  return {
    id: usuario.id,
    nombre: usuario.nombre,
    email: usuario.email,
    rol: usuario.rol,
    lectorId: usuario.lectorId || null
  };
}

function crearToken(usuario) {
  const payload = Buffer.from(JSON.stringify({
    sub: usuario.id,
    exp: Math.floor(Date.now() / 1000) + (12 * 60 * 60)
  })).toString('base64url');
  const firma = crypto.createHmac('sha256', AUTH_SECRET).update(payload).digest('base64url');
  return `${payload}.${firma}`;
}

function decodificarToken(token) {
  try {
    const [payload, firma] = String(token || '').split('.');
    if (!payload || !firma) return null;
    const firmaEsperada = crypto.createHmac('sha256', AUTH_SECRET).update(payload).digest();
    const firmaRecibida = Buffer.from(firma, 'base64url');
    if (firmaEsperada.length !== firmaRecibida.length || !crypto.timingSafeEqual(firmaEsperada, firmaRecibida)) return null;
    const datos = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!datos.sub || !datos.exp || datos.exp < Math.floor(Date.now() / 1000)) return null;
    return datos;
  } catch (_error) {
    return null;
  }
}

function autenticar(req, res, next) {
  const encabezado = req.headers.authorization || '';
  const token = encabezado.startsWith('Bearer ') ? encabezado.slice(7) : '';
  const datosToken = decodificarToken(token);
  if (!datosToken) return responderError(res, 'Inicia sesión para continuar.', 401);
  const usuario = db.prepare(`
    SELECT id, nombre, email, rol, lectorId FROM usuarios WHERE id = ?
  `).get(datosToken.sub);
  if (!usuario) return responderError(res, 'La sesión ya no es válida. Inicia sesión nuevamente.', 401);
  req.user = usuario;
  next();
}

function exigirRol(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.rol)) {
      return responderError(res, 'No tienes permisos para realizar esta operación.', 403);
    }
    next();
  };
}

function asegurarAdministradorInicial() {
  const existeAdmin = db.prepare("SELECT id FROM usuarios WHERE rol = 'admin' LIMIT 1").get();
  if (existeAdmin) return;
  const conflicto = db.prepare('SELECT id FROM usuarios WHERE email = ? COLLATE NOCASE').get(ADMIN_EMAIL);
  if (conflicto) throw new Error(`El correo configurado para el administrador (${ADMIN_EMAIL}) ya pertenece a otro usuario.`);
  db.prepare(`
    INSERT INTO usuarios (id, nombre, email, passwordHash, rol, lectorId, creadoEn)
    VALUES (?, ?, ?, ?, 'admin', NULL, ?)
  `).run(crearId('USR'), 'Administrador', ADMIN_EMAIL, hashPassword(ADMIN_PASSWORD), new Date().toISOString());
  console.log(`Cuenta inicial de administrador creada: ${ADMIN_EMAIL}`);
  if (!process.env.ADMIN_PASSWORD) console.warn('Aviso: cambia ADMIN_PASSWORD y AUTH_SECRET antes de publicar el sistema.');
}

asegurarAdministradorInicial();

function buscarMaterial(id) {
  return db.prepare(`
    SELECT
      m.id, m.codigo, m.titulo, m.autor, m.tipo, m.cantidad,
      MAX(0, m.cantidad - (
        SELECT COUNT(*)
        FROM prestamos p
        WHERE p.materialId = m.id AND p.fechaDevolucionReal IS NULL
      )) AS disponibles
    FROM materiales m
    WHERE m.id = ?
  `).get(id);
}

function listarMateriales() {
  return db.prepare(`
    SELECT
      m.id, m.codigo, m.titulo, m.autor, m.tipo, m.cantidad,
      MAX(0, m.cantidad - (
        SELECT COUNT(*)
        FROM prestamos p
        WHERE p.materialId = m.id AND p.fechaDevolucionReal IS NULL
      )) AS disponibles
    FROM materiales m
    ORDER BY m.titulo COLLATE NOCASE
  `).all();
}

function contarPrestamosActivos(materialId) {
  return db.prepare(`
    SELECT COUNT(*) AS total
    FROM prestamos
    WHERE materialId = ? AND fechaDevolucionReal IS NULL
  `).get(materialId).total;
}

function enriquecerPrestamo(prestamo) {
  if (!prestamo) return null;
  const material = buscarMaterial(prestamo.materialId);
  const lector = db.prepare(`
    SELECT id, codigo, nombre, correo FROM lectores WHERE id = ?
  `).get(prestamo.lectorId);
  return {
    ...prestamo,
    estado: estadoActual(prestamo),
    material: material || null,
    lector: lector || null
  };
}

function buscarPrestamo(id) {
  return db.prepare(`
    SELECT id, materialId, lectorId, fechaPrestamo,
      fechaDevolucionPrevista, fechaDevolucionReal, observacion
    FROM prestamos WHERE id = ?
  `).get(id);
}

function obtenerTexto(valor) {
  return typeof valor === 'string' ? valor.trim() : '';
}

// SALUD DE LA API Y BASE DE DATOS
app.get('/api/health', (_req, res) => {
  try {
    const prueba = db.prepare('SELECT 1 AS ok').get();
    res.json({
      estado: prueba.ok === 1 ? 'ok' : 'error',
      mensaje: 'API de Biblioteca funcionando',
      baseDatos: 'SQLite',
      archivoBaseDatos: 'backend/data/biblioteca.sqlite'
    });
  } catch (_error) {
    responderError(res, 'No se pudo consultar la base de datos.', 500);
  }
});

// AUTENTICACIÓN Y CUENTAS
app.post('/api/auth/register', (req, res) => {
  const nombre = obtenerTexto(req.body.nombre);
  const email = obtenerTexto(req.body.email).toLowerCase();
  const password = typeof req.body.password === 'string' ? req.body.password : '';

  if (nombre.length < 2) return responderError(res, 'Ingresa tu nombre completo.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return responderError(res, 'Ingresa un correo electrónico válido.');
  if (password.length < 8) return responderError(res, 'La contraseña debe tener al menos 8 caracteres.');
  if (Buffer.byteLength(password, 'utf8') > 128) return responderError(res, 'La contraseña es demasiado larga.');
  if (db.prepare('SELECT 1 FROM usuarios WHERE email = ? COLLATE NOCASE').get(email)) {
    return responderError(res, 'Ya existe una cuenta con ese correo electrónico.', 409);
  }

  const usuarioId = crearId('USR');
  const lectorId = crearId('LEC');
  const codigo = `EST-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const creadoEn = new Date().toISOString();
  const registrar = db.transaction(() => {
    db.prepare('INSERT INTO lectores (id, codigo, nombre, correo) VALUES (?, ?, ?, ?)')
      .run(lectorId, codigo, nombre, email);
    db.prepare(`
      INSERT INTO usuarios (id, nombre, email, passwordHash, rol, lectorId, creadoEn)
      VALUES (?, ?, ?, ?, 'estudiante', ?, ?)
    `).run(usuarioId, nombre, email, hashPassword(password), lectorId, creadoEn);
  });

  try {
    registrar();
  } catch (error) {
    if (String(error.message).includes('UNIQUE')) return responderError(res, 'Ya existe una cuenta con ese correo electrónico.', 409);
    return responderError(res, 'No se pudo crear la cuenta.', 500);
  }
  const usuario = db.prepare('SELECT id, nombre, email, rol, lectorId FROM usuarios WHERE id = ?').get(usuarioId);
  res.status(201).json({ token: crearToken(usuario), usuario: usuarioPublico(usuario) });
});

app.post('/api/auth/login', (req, res) => {
  const email = obtenerTexto(req.body.email).toLowerCase();
  const password = typeof req.body.password === 'string' && Buffer.byteLength(req.body.password, 'utf8') <= 128 ? req.body.password : '';
  const usuario = db.prepare('SELECT * FROM usuarios WHERE email = ? COLLATE NOCASE').get(email);
  if (!usuario || !verificarPassword(password, usuario.passwordHash)) {
    return responderError(res, 'Correo o contraseña incorrectos.', 401);
  }
  res.json({ token: crearToken(usuario), usuario: usuarioPublico(usuario) });
});

app.get('/api/auth/me', autenticar, (req, res) => {
  res.json({ usuario: usuarioPublico(req.user) });
});

// CATÁLOGO PARA USUARIOS AUTENTICADOS. Es de solo consulta.
app.get('/api/catalogo', autenticar, (_req, res) => {
  res.json(listarMateriales());
});

function enriquecerSolicitud(solicitud) {
  const material = buscarMaterial(solicitud.materialId);
  const lector = db.prepare('SELECT id, codigo, nombre, correo FROM lectores WHERE id = ?').get(solicitud.lectorId);
  const prestamoBase = solicitud.prestamoId ? buscarPrestamo(solicitud.prestamoId) : null;
  return {
    ...solicitud,
    material: material || null,
    lector: lector || null,
    prestamo: prestamoBase ? enriquecerPrestamo(prestamoBase) : null
  };
}

app.get('/api/solicitudes', autenticar, (req, res) => {
  const filas = req.user.rol === 'admin'
    ? db.prepare('SELECT * FROM solicitudes ORDER BY CASE estado WHEN \'PENDIENTE\' THEN 0 ELSE 1 END, fechaSolicitud DESC').all()
    : db.prepare('SELECT * FROM solicitudes WHERE lectorId = ? ORDER BY fechaSolicitud DESC').all(req.user.lectorId);
  res.json(filas.map(enriquecerSolicitud));
});

app.post('/api/solicitudes', autenticar, exigirRol('estudiante'), (req, res) => {
  const materialId = obtenerTexto(req.body.materialId);
  const fechaDevolucionPrevista = obtenerTexto(req.body.fechaDevolucionPrevista);
  const fechaSolicitud = fechaLocal();
  const observacion = obtenerTexto(req.body.observacion);

  if (!materialId) return responderError(res, 'Selecciona un material válido.');
  if (!fechaValida(fechaDevolucionPrevista) || fechaDevolucionPrevista < fechaSolicitud) {
    return responderError(res, 'La fecha de devolución debe ser hoy o una fecha futura válida.');
  }
  const material = buscarMaterial(materialId);
  if (!material) return responderError(res, 'No se encontró el material seleccionado.', 404);
  if (material.disponibles < 1) return responderError(res, 'Este material no tiene unidades disponibles actualmente.');
  const solicitudDuplicada = db.prepare(`
    SELECT 1 FROM solicitudes WHERE lectorId = ? AND materialId = ? AND estado = 'PENDIENTE'
  `).get(req.user.lectorId, materialId);
  if (solicitudDuplicada) return responderError(res, 'Ya tienes una solicitud pendiente para este material.', 409);
  const prestamoActivo = db.prepare(`
    SELECT 1 FROM prestamos WHERE lectorId = ? AND materialId = ? AND fechaDevolucionReal IS NULL
  `).get(req.user.lectorId, materialId);
  if (prestamoActivo) return responderError(res, 'Ya tienes este material prestado y aún no lo has devuelto.', 409);

  const solicitud = {
    id: crearId('SOL'), materialId, lectorId: req.user.lectorId,
    fechaSolicitud, fechaDevolucionPrevista, estado: 'PENDIENTE',
    observacion, prestamoId: null
  };
  db.prepare(`
    INSERT INTO solicitudes (id, materialId, lectorId, fechaSolicitud,
      fechaDevolucionPrevista, estado, observacion, prestamoId)
    VALUES (@id, @materialId, @lectorId, @fechaSolicitud,
      @fechaDevolucionPrevista, @estado, @observacion, @prestamoId)
  `).run(solicitud);
  res.status(201).json(enriquecerSolicitud(solicitud));
});

app.patch('/api/solicitudes/:id/aprobar', autenticar, exigirRol('admin'), (req, res) => {
  const solicitud = db.prepare('SELECT * FROM solicitudes WHERE id = ?').get(req.params.id);
  if (!solicitud) return responderError(res, 'Solicitud no encontrada.', 404);
  if (solicitud.estado !== 'PENDIENTE') return responderError(res, 'Esta solicitud ya fue resuelta.', 409);
  if (solicitud.fechaDevolucionPrevista < fechaLocal()) {
    return responderError(res, 'La fecha propuesta ya pasó. Rechaza esta solicitud para que el estudiante envíe una nueva fecha.', 409);
  }
  const material = buscarMaterial(solicitud.materialId);
  if (!material || material.disponibles < 1) return responderError(res, 'No hay unidades disponibles. Rechaza la solicitud o espera una devolución.', 409);

  const prestamo = {
    id: crearId('PRE'), materialId: solicitud.materialId, lectorId: solicitud.lectorId,
    fechaPrestamo: fechaLocal(), fechaDevolucionPrevista: solicitud.fechaDevolucionPrevista,
    fechaDevolucionReal: null, observacion: solicitud.observacion || ''
  };
  try {
    const aprobar = db.transaction(() => {
      const actual = db.prepare("SELECT * FROM solicitudes WHERE id = ? AND estado = 'PENDIENTE'").get(solicitud.id);
      if (!actual) throw new Error('SOLICITUD_RESUELTA');
      const disponiblesAhora = buscarMaterial(actual.materialId);
      if (!disponiblesAhora || disponiblesAhora.disponibles < 1) throw new Error('SIN_DISPONIBILIDAD');
      db.prepare(`
        INSERT INTO prestamos (id, materialId, lectorId, fechaPrestamo,
          fechaDevolucionPrevista, fechaDevolucionReal, observacion)
        VALUES (@id, @materialId, @lectorId, @fechaPrestamo,
          @fechaDevolucionPrevista, @fechaDevolucionReal, @observacion)
      `).run(prestamo);
      db.prepare("UPDATE solicitudes SET estado = 'APROBADA', prestamoId = ? WHERE id = ?")
        .run(prestamo.id, actual.id);
    });
    aprobar();
  } catch (error) {
    if (error.message === 'SIN_DISPONIBILIDAD') return responderError(res, 'Otra solicitud ocupó la última unidad disponible.', 409);
    if (error.message === 'SOLICITUD_RESUELTA') return responderError(res, 'Esta solicitud ya fue resuelta.', 409);
    throw error;
  }
  res.json(enriquecerSolicitud(db.prepare('SELECT * FROM solicitudes WHERE id = ?').get(solicitud.id)));
});

app.patch('/api/solicitudes/:id/rechazar', autenticar, exigirRol('admin'), (req, res) => {
  const solicitud = db.prepare('SELECT * FROM solicitudes WHERE id = ?').get(req.params.id);
  if (!solicitud) return responderError(res, 'Solicitud no encontrada.', 404);
  if (solicitud.estado !== 'PENDIENTE') return responderError(res, 'Esta solicitud ya fue resuelta.', 409);
  db.prepare("UPDATE solicitudes SET estado = 'RECHAZADA' WHERE id = ? AND estado = 'PENDIENTE'").run(solicitud.id);
  res.json(enriquecerSolicitud(db.prepare('SELECT * FROM solicitudes WHERE id = ?').get(solicitud.id)));
});

// Desde este punto, los endpoints administrativos requieren autenticación y rol de administrador.
app.use('/api/materiales', autenticar, exigirRol('admin'));
app.use('/api/lectores', autenticar, exigirRol('admin'));
app.use('/api/prestamos', autenticar, exigirRol('admin'));

// MATERIALES
app.get('/api/materiales', (_req, res) => {
  res.json(listarMateriales());
});

app.post('/api/materiales', (req, res) => {
  const codigo = obtenerTexto(req.body.codigo);
  const titulo = obtenerTexto(req.body.titulo);
  const autor = obtenerTexto(req.body.autor);
  const tipo = obtenerTexto(req.body.tipo);
  const cantidad = Number(req.body.cantidad);

  if (!codigo || !titulo || !autor || !tipo) {
    return responderError(res, 'Completa el código, título, autor y tipo del material.');
  }
  if (!Number.isInteger(cantidad) || cantidad < 1) {
    return responderError(res, 'La cantidad debe ser un número entero mayor que cero.');
  }
  const duplicado = db.prepare('SELECT 1 FROM materiales WHERE codigo = ? COLLATE NOCASE').get(codigo);
  if (duplicado) return responderError(res, 'Ya existe un material con ese código.', 409);

  const material = { id: crearId('MAT'), codigo, titulo, autor, tipo, cantidad };
  db.prepare(`
    INSERT INTO materiales (id, codigo, titulo, autor, tipo, cantidad)
    VALUES (@id, @codigo, @titulo, @autor, @tipo, @cantidad)
  `).run(material);
  res.status(201).json({ ...material, disponibles: cantidad });
});

app.put('/api/materiales/:id', (req, res) => {
  const material = db.prepare('SELECT * FROM materiales WHERE id = ?').get(req.params.id);
  if (!material) return responderError(res, 'Material no encontrado.', 404);

  const codigo = obtenerTexto(req.body.codigo);
  const titulo = obtenerTexto(req.body.titulo);
  const autor = obtenerTexto(req.body.autor);
  const tipo = obtenerTexto(req.body.tipo);
  const cantidad = Number(req.body.cantidad);
  if (!codigo || !titulo || !autor || !tipo || !Number.isInteger(cantidad) || cantidad < 1) {
    return responderError(res, 'Verifica los datos del material y que la cantidad sea un entero positivo.');
  }
  const duplicado = db.prepare('SELECT 1 FROM materiales WHERE codigo = ? COLLATE NOCASE AND id <> ?').get(codigo, material.id);
  if (duplicado) return responderError(res, 'Ese código ya pertenece a otro material.', 409);

  const ocupados = contarPrestamosActivos(material.id);
  if (cantidad < ocupados) {
    return responderError(res, `No puedes indicar menos de ${ocupados} unidades: esa cantidad está prestada.`);
  }

  db.prepare(`
    UPDATE materiales SET codigo = ?, titulo = ?, autor = ?, tipo = ?, cantidad = ?
    WHERE id = ?
  `).run(codigo, titulo, autor, tipo, cantidad, material.id);
  res.json(buscarMaterial(material.id));
});

app.delete('/api/materiales/:id', (req, res) => {
  const material = db.prepare('SELECT id FROM materiales WHERE id = ?').get(req.params.id);
  if (!material) return responderError(res, 'Material no encontrado.', 404);
  const tienePrestamo = db.prepare('SELECT 1 FROM prestamos WHERE materialId = ? LIMIT 1').get(material.id);
  const tieneSolicitud = db.prepare('SELECT 1 FROM solicitudes WHERE materialId = ? LIMIT 1').get(material.id);
  if (tienePrestamo || tieneSolicitud) return responderError(res, 'No puedes eliminar este material porque tiene historial de préstamos o solicitudes.');
  db.prepare('DELETE FROM materiales WHERE id = ?').run(material.id);
  res.status(204).end();
});

// LECTORES
app.get('/api/lectores', (_req, res) => {
  res.json(db.prepare('SELECT id, codigo, nombre, correo FROM lectores ORDER BY nombre COLLATE NOCASE').all());
});

app.post('/api/lectores', (req, res) => {
  const codigo = obtenerTexto(req.body.codigo);
  const nombre = obtenerTexto(req.body.nombre);
  const correo = obtenerTexto(req.body.correo);
  if (!codigo || !nombre || !correo) return responderError(res, 'Completa el código, nombre y correo del lector.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) return responderError(res, 'Ingresa un correo electrónico válido.');
  const duplicado = db.prepare('SELECT 1 FROM lectores WHERE codigo = ? COLLATE NOCASE').get(codigo);
  if (duplicado) return responderError(res, 'Ya existe un lector con ese código.', 409);

  const lector = { id: crearId('LEC'), codigo, nombre, correo };
  db.prepare('INSERT INTO lectores (id, codigo, nombre, correo) VALUES (@id, @codigo, @nombre, @correo)').run(lector);
  res.status(201).json(lector);
});

app.put('/api/lectores/:id', (req, res) => {
  const lector = db.prepare('SELECT id FROM lectores WHERE id = ?').get(req.params.id);
  if (!lector) return responderError(res, 'Lector no encontrado.', 404);

  const codigo = obtenerTexto(req.body.codigo);
  const nombre = obtenerTexto(req.body.nombre);
  const correo = obtenerTexto(req.body.correo);
  if (!codigo || !nombre || !correo) return responderError(res, 'Completa el código, nombre y correo del lector.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) return responderError(res, 'Ingresa un correo electrónico válido.');
  const duplicado = db.prepare('SELECT 1 FROM lectores WHERE codigo = ? COLLATE NOCASE AND id <> ?').get(codigo, lector.id);
  if (duplicado) return responderError(res, 'Ya existe otro lector con ese código.', 409);
  const cuenta = db.prepare('SELECT id FROM usuarios WHERE lectorId = ?').get(lector.id);
  if (cuenta) {
    const correoOcupado = db.prepare('SELECT 1 FROM usuarios WHERE email = ? COLLATE NOCASE AND id <> ?').get(correo, cuenta.id);
    if (correoOcupado) return responderError(res, 'Ese correo ya pertenece a otra cuenta de acceso.', 409);
  }

  const actualizar = db.transaction(() => {
    db.prepare('UPDATE lectores SET codigo = ?, nombre = ?, correo = ? WHERE id = ?')
      .run(codigo, nombre, correo, lector.id);
    if (cuenta) db.prepare('UPDATE usuarios SET nombre = ?, email = ? WHERE id = ?').run(nombre, correo, cuenta.id);
  });
  actualizar();
  res.json(db.prepare('SELECT id, codigo, nombre, correo FROM lectores WHERE id = ?').get(lector.id));
});

app.delete('/api/lectores/:id', (req, res) => {
  const lector = db.prepare('SELECT id FROM lectores WHERE id = ?').get(req.params.id);
  if (!lector) return responderError(res, 'Lector no encontrado.', 404);
  const tieneCuenta = db.prepare('SELECT 1 FROM usuarios WHERE lectorId = ? LIMIT 1').get(lector.id);
  if (tieneCuenta) return responderError(res, 'No puedes eliminar este lector porque tiene una cuenta de acceso al portal estudiantil.');
  const tienePrestamo = db.prepare('SELECT 1 FROM prestamos WHERE lectorId = ? LIMIT 1').get(lector.id);
  const tieneSolicitud = db.prepare('SELECT 1 FROM solicitudes WHERE lectorId = ? LIMIT 1').get(lector.id);
  if (tienePrestamo || tieneSolicitud) {
    return responderError(res, 'No puedes eliminar este lector porque tiene historial de préstamos o solicitudes. Puedes editar sus datos para mantener el historial.');
  }
  db.prepare('DELETE FROM lectores WHERE id = ?').run(lector.id);
  res.status(204).end();
});

// PRÉSTAMOS
app.get('/api/prestamos', (req, res) => {
  let prestamos = db.prepare(`
    SELECT id, materialId, lectorId, fechaPrestamo,
      fechaDevolucionPrevista, fechaDevolucionReal, observacion
    FROM prestamos ORDER BY fechaPrestamo DESC
  `).all().map(enriquecerPrestamo);

  if (req.query.estado && req.query.estado !== 'TODOS') {
    prestamos = prestamos.filter((prestamo) => prestamo.estado === req.query.estado);
  }
  res.json(prestamos);
});

app.get('/api/prestamos/:id', (req, res) => {
  const prestamo = buscarPrestamo(req.params.id);
  if (!prestamo) return responderError(res, 'Préstamo no encontrado.', 404);
  res.json(enriquecerPrestamo(prestamo));
});

app.post('/api/prestamos', (req, res) => {
  const materialId = obtenerTexto(req.body.materialId);
  const lectorId = obtenerTexto(req.body.lectorId);
  const fechaDevolucionPrevista = obtenerTexto(req.body.fechaDevolucionPrevista);
  const fechaPrestamo = obtenerTexto(req.body.fechaPrestamo) || fechaLocal();
  const observacion = obtenerTexto(req.body.observacion);

  if (!materialId) return responderError(res, 'Selecciona un material válido.');
  if (!lectorId) return responderError(res, 'Selecciona un lector válido.');
  if (!fechaValida(fechaDevolucionPrevista)) return responderError(res, 'Indica una fecha de devolución válida.');
  if (!fechaValida(fechaPrestamo)) return responderError(res, 'La fecha del préstamo no es válida.');
  if (fechaDevolucionPrevista < fechaPrestamo) return responderError(res, 'La fecha de devolución no puede ser anterior al préstamo.');

  const material = db.prepare('SELECT id FROM materiales WHERE id = ?').get(materialId);
  if (!material) return responderError(res, 'Selecciona un material válido.');
  const lector = db.prepare('SELECT id FROM lectores WHERE id = ?').get(lectorId);
  if (!lector) return responderError(res, 'Selecciona un lector válido.');
  const materialConDisponibilidad = buscarMaterial(materialId);
  if (!materialConDisponibilidad || materialConDisponibilidad.disponibles < 1) {
    return responderError(res, 'No hay unidades disponibles de ese material.');
  }

  const prestamo = {
    id: crearId('PRE'), materialId, lectorId, fechaPrestamo,
    fechaDevolucionPrevista, fechaDevolucionReal: null, observacion
  };
  db.prepare(`
    INSERT INTO prestamos (
      id, materialId, lectorId, fechaPrestamo,
      fechaDevolucionPrevista, fechaDevolucionReal, observacion
    ) VALUES (@id, @materialId, @lectorId, @fechaPrestamo,
      @fechaDevolucionPrevista, @fechaDevolucionReal, @observacion)
  `).run(prestamo);
  res.status(201).json(enriquecerPrestamo(prestamo));
});

app.put('/api/prestamos/:id', (req, res) => {
  const prestamo = buscarPrestamo(req.params.id);
  if (!prestamo) return responderError(res, 'Préstamo no encontrado.', 404);

  const nuevaFecha = req.body.fechaDevolucionPrevista ?? prestamo.fechaDevolucionPrevista;
  const nuevaObservacion = req.body.observacion ?? prestamo.observacion;
  if (!fechaValida(nuevaFecha)) return responderError(res, 'Indica una fecha de devolución válida.');
  if (nuevaFecha < prestamo.fechaPrestamo) return responderError(res, 'La devolución prevista no puede ser anterior al préstamo.');
  if (prestamo.fechaDevolucionReal) return responderError(res, 'No puedes modificar un préstamo que ya fue devuelto.');

  db.prepare('UPDATE prestamos SET fechaDevolucionPrevista = ?, observacion = ? WHERE id = ?')
    .run(nuevaFecha, obtenerTexto(String(nuevaObservacion ?? '')), prestamo.id);
  res.json(enriquecerPrestamo(buscarPrestamo(prestamo.id)));
});

app.patch('/api/prestamos/:id/devolver', (req, res) => {
  const prestamo = buscarPrestamo(req.params.id);
  if (!prestamo) return responderError(res, 'Préstamo no encontrado.', 404);
  if (prestamo.fechaDevolucionReal) return responderError(res, 'Este material ya fue registrado como devuelto.');

  const fecha = obtenerTexto(req.body.fechaDevolucionReal) || fechaLocal();
  if (!fechaValida(fecha)) return responderError(res, 'La fecha de devolución real no es válida.');
  if (fecha < prestamo.fechaPrestamo) return responderError(res, 'La devolución real no puede ser anterior al préstamo.');
  db.prepare('UPDATE prestamos SET fechaDevolucionReal = ? WHERE id = ?').run(fecha, prestamo.id);
  res.json(enriquecerPrestamo(buscarPrestamo(prestamo.id)));
});

app.delete('/api/prestamos/:id', (req, res) => {
  const prestamo = buscarPrestamo(req.params.id);
  if (!prestamo) return responderError(res, 'Préstamo no encontrado.', 404);
  const tieneSolicitud = db.prepare('SELECT 1 FROM solicitudes WHERE prestamoId = ? LIMIT 1').get(prestamo.id);
  if (tieneSolicitud) return responderError(res, 'Este préstamo procede de una solicitud aprobada. Registra su devolución para conservar el historial.');
  db.prepare('DELETE FROM prestamos WHERE id = ?').run(prestamo.id);
  res.status(204).end();
});

app.listen(PORT, () => {
  console.log(`Biblioteca API disponible en http://localhost:${PORT}`);
  console.log(`Base de datos SQLite: ${DB_PATH}`);
});
