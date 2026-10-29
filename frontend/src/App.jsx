import { useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, ArrowUpRight, Bell, BookOpen, BookMarked, CheckCircle2, ChevronRight,
  CircleHelp, Clock3, GraduationCap, Home, Library, Pencil, Plus, Search, Trash2,
  Users, X, ClipboardCheck, LogOut, Mail, LockKeyhole, UserRound, ArrowRight,
  CalendarDays, Check, XCircle, Send, ShieldCheck
} from 'lucide-react';
import { api, fechaMasDias, hoyLocal, mostrarFecha } from './api.js';

function Icon({ children }) {
  return <span className="nav-icon" aria-hidden="true">{children}</span>;
}

function Layout({ usuario, onLogout }) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" to="/">
          <span className="brand-mark"><Library size={23} strokeWidth={2.2} /></span>
          <span><strong>STEVE GC</strong><small>Panel de gestión</small></span>
        </Link>
        <div className="nav-label">MENÚ PRINCIPAL</div>
        <nav className="nav-menu">
          <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}><Icon><Home size={18} /></Icon>Inicio</NavLink>
          <NavLink to="/materiales" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}><Icon><BookOpen size={18} /></Icon>Materiales</NavLink>
          <NavLink to="/lectores" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}><Icon><Users size={18} /></Icon>Lectores</NavLink>
          <NavLink to="/prestamos" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}><Icon><BookMarked size={18} /></Icon>Préstamos</NavLink>
          <NavLink to="/solicitudes" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}><Icon><ClipboardCheck size={18} /></Icon>Solicitudes</NavLink>
        </nav>
        <div className="sidebar-bottom"><div className="side-help"><span className="help-dot"><CircleHelp size={15} /></span><div><strong>Control de biblioteca</strong><p>Gestiona recursos y fechas de devolución desde un solo lugar.</p></div></div><small>Proyecto académico · SPA</small></div>
      </aside>
      <main className="main-area">
        <header className="topbar"><div><span className="eyebrow">SISTEMA DE ADMINISTRACIÓN</span><h1>Biblioteca estudiantil</h1></div><div className="admin-top-actions"><div className="user-chip"><span className="user-avatar"><ShieldCheck size={18} /></span><span><strong>{usuario?.nombre || 'Administrador'}</strong><small>Administrador</small></span></div><button className="button secondary logout-button" onClick={onLogout}><LogOut size={15} /> Salir</button></div></header>
        <div className="page-content"><Routes>
          <Route path="/" element={<Inicio />} />
          <Route path="/materiales" element={<Materiales />} />
          <Route path="/lectores" element={<Lectores />} />
          <Route path="/prestamos" element={<Prestamos />} />
          <Route path="/solicitudes" element={<SolicitudesAdmin />} />
          <Route path="/prestamo/:id" element={<DetallePrestamo />} />
          <Route path="*" element={<NoEncontrado />} />
        </Routes></div>
      </main>
    </div>
  );
}

function Estado({ estado }) {
  const clase = estado === 'DEVUELTO' ? 'green' : estado === 'VENCIDO' ? 'red' : 'blue';
  const texto = estado === 'DEVUELTO' ? 'Devuelto' : estado === 'VENCIDO' ? 'Vencido' : 'Prestado';
  return <span className={`status-badge ${clase}`}><span />{texto}</span>;
}

function CabeceraPagina({ etiqueta, titulo, descripcion, accion }) {
  return <div className="page-heading"><div><div className="eyebrow">{etiqueta}</div><h2>{titulo}</h2><p>{descripcion}</p></div>{accion}</div>;
}

function Mensaje({ tipo = 'error', children }) {
  if (!children) return null;
  return <div className={`message ${tipo}`} role="status">{children}</div>;
}

function Inicio() {
  const [datos, setDatos] = useState({ materiales: [], lectores: [], prestamos: [] });
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);
  useEffect(() => {
    Promise.all([api.materiales(), api.lectores(), api.prestamos()])
      .then(([materiales, lectores, prestamos]) => setDatos({ materiales, lectores, prestamos }))
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false));
  }, []);
  const activos = datos.prestamos.filter((p) => p.estado !== 'DEVUELTO');
  const vencidos = datos.prestamos.filter((p) => p.estado === 'VENCIDO');
  const metricas = [
    { etiqueta: 'Materiales registrados', valor: datos.materiales.length, nota: `${datos.materiales.reduce((s, m) => s + m.cantidad, 0)} unidades en inventario`, icono: <BookOpen size={19} />, color: 'purple' },
    { etiqueta: 'Lectores registrados', valor: datos.lectores.length, nota: 'Estudiantes habilitados', icono: <Users size={19} />, color: 'orange' },
    { etiqueta: 'Préstamos activos', valor: activos.length, nota: 'Pendientes de devolución', icono: <BookMarked size={19} />, color: 'cyan' },
    { etiqueta: 'Préstamos vencidos', valor: vencidos.length, nota: 'Requieren seguimiento', icono: <Clock3 size={19} />, color: 'pink' }
  ];
  return <>
    <CabeceraPagina etiqueta="RESUMEN GENERAL" titulo="¡Bienvenido!" descripcion="Aquí tienes una vista rápida del estado de la biblioteca." accion={<Link className="button primary" to="/prestamos"><Plus size={16} /> Registrar préstamo</Link>} />
    <Mensaje>{error}</Mensaje>
    {!cargando && vencidos.length > 0 && <Link className="overdue-alert" to="/prestamos?estado=VENCIDO"><span className="overdue-alert-icon"><Bell size={17} /></span><span><strong>{vencidos.length} préstamo(s) vencido(s)</strong><small>Revisa las fechas límite y coordina las devoluciones pendientes.</small></span><ArrowUpRight size={17} className="overdue-alert-arrow" /></Link>}
    <div className="metrics-grid">{metricas.map((m) => <div className="metric-card" key={m.etiqueta}><div className={`metric-icon ${m.color}`}>{m.icono}</div><div className="metric-label">{m.etiqueta}</div><div className="metric-value">{cargando ? '—' : m.valor}</div><div className="metric-note">{m.nota}</div><div className="metric-decoration" /></div>)}</div>
    <div className="content-grid">
      <section className="panel recent-panel"><div className="panel-heading"><div><h3>Préstamos recientes</h3><p>Últimos movimientos registrados</p></div><Link className="text-link" to="/prestamos">Ver todos <ArrowUpRight size={14} /></Link></div>
        {cargando ? <p className="empty-state">Cargando información…</p> : datos.prestamos.length === 0 ? <p className="empty-state">Todavía no hay préstamos registrados.</p> : <div className="table-scroll"><table><thead><tr><th>Material</th><th>Lector</th><th>Devolución</th><th>Estado</th><th></th></tr></thead><tbody>{datos.prestamos.slice(0, 5).map((p) => <tr key={p.id}><td><strong>{p.material?.titulo || 'Material eliminado'}</strong><small className="cell-sub">{p.id}</small></td><td>{p.lector?.nombre || 'Lector'}</td><td>{mostrarFecha(p.fechaDevolucionPrevista)}</td><td><Estado estado={p.estado} /></td><td><Link className="arrow-link" to={`/prestamo/${p.id}`} aria-label={`Ver ${p.id}`}><ChevronRight size={16} /></Link></td></tr>)}</tbody></table></div>}
      </section>
      <section className="panel quick-panel"><div className="panel-heading"><div><h3>Accesos rápidos</h3><p>Acciones frecuentes</p></div></div><Link className="quick-action" to="/materiales"><span className="quick-icon lavender"><BookOpen size={17} /></span><span><strong>Consultar materiales</strong><small>Revisar existencias y disponibilidad</small></span><b><ChevronRight size={16} /></b></Link><Link className="quick-action" to="/lectores"><span className="quick-icon lavender"><Users size={17} /></span><span><strong>Gestionar lectores</strong><small>Registrar y actualizar estudiantes</small></span><b><ChevronRight size={16} /></b></Link><Link className="quick-action" to="/prestamos"><span className="quick-icon mint"><Plus size={17} /></span><span><strong>Nuevo préstamo</strong><small>Registrar una nueva salida de material</small></span><b><ChevronRight size={16} /></b></Link><Link className="quick-action" to="/prestamos?estado=VENCIDO"><span className="quick-icon rose"><Clock3 size={17} /></span><span><strong>Revisar vencimientos</strong><small>Identificar préstamos fuera de fecha</small></span><b><ChevronRight size={16} /></b></Link><div className="tip-box"><strong>Dato útil</strong><p>La disponibilidad se actualiza automáticamente al registrar un préstamo o una devolución.</p></div></section>
    </div>
  </>;
}

function Materiales() {
  const [materiales, setMateriales] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [mostrarForm, setMostrarForm] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [form, setForm] = useState({ codigo: '', titulo: '', autor: '', tipo: 'Libro', cantidad: '1' });
  async function cargar() { try { setMateriales(await api.materiales()); setError(''); } catch (e) { setError(e.message); } }
  useEffect(() => { cargar(); }, []);
  const filtrados = materiales.filter((m) => `${m.codigo} ${m.titulo} ${m.autor} ${m.tipo}`.toLowerCase().includes(busqueda.toLowerCase()));
  function cambiarCampo(e) { setForm({ ...form, [e.target.name]: e.target.value }); }
  async function guardar(e) {
    e.preventDefault(); setError(''); setExito('');
    try { await api.crearMaterial({ ...form, cantidad: Number(form.cantidad) }); setForm({ codigo: '', titulo: '', autor: '', tipo: 'Libro', cantidad: '1' }); setMostrarForm(false); setExito('Material registrado correctamente.'); await cargar(); }
    catch (err) { setError(err.message); }
  }
  return <>
    <CabeceraPagina etiqueta="INVENTARIO" titulo="Materiales" descripcion="Consulta los libros y recursos disponibles para los estudiantes." accion={<button className="button primary" onClick={() => { setMostrarForm(!mostrarForm); setError(''); setExito(''); }}><Plus size={16} /> Añadir material</button>} />
    <Mensaje tipo="success">{exito}</Mensaje><Mensaje>{error}</Mensaje>
    {mostrarForm && <section className="panel form-panel"><div className="panel-heading"><div><h3>Registrar material</h3><p>Completa los datos del nuevo recurso.</p></div><button className="icon-button" onClick={() => setMostrarForm(false)} aria-label="Cerrar"><X size={16} /></button></div><form className="form-grid" onSubmit={guardar}><label>Código<input name="codigo" value={form.codigo} onChange={cambiarCampo} placeholder="Ej. LIB-010" required /></label><label>Título<input name="titulo" value={form.titulo} onChange={cambiarCampo} placeholder="Nombre del material" required /></label><label>Autor o responsable<input name="autor" value={form.autor} onChange={cambiarCampo} placeholder="Autor / área" required /></label><label>Tipo<select name="tipo" value={form.tipo} onChange={cambiarCampo}><option>Libro</option><option>Recurso</option><option>Equipo</option><option>Otro</option></select></label><label>Cantidad total<input type="number" name="cantidad" min="1" step="1" value={form.cantidad} onChange={cambiarCampo} required /></label><div className="form-actions"><button className="button secondary" type="button" onClick={() => setMostrarForm(false)}>Cancelar</button><button className="button primary" type="submit">Guardar material</button></div></form></section>}
    <section className="panel"><div className="list-toolbar"><div><h3>Catálogo de materiales</h3><p>{materiales.length} tipos de material registrados</p></div><div className="search-box"><Search size={15} /><input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por nombre, autor o código" /></div></div>
      {filtrados.length === 0 ? <div className="empty-state">No se encontraron materiales.</div> : <div className="table-scroll"><table><thead><tr><th>Material</th><th>Código</th><th>Tipo</th><th>Unidades</th><th>Disponibles</th><th>Estado</th></tr></thead><tbody>{filtrados.map((m, i) => <tr key={m.id}><td><div className="material-cell"><span className={`book-cover cover-${i % 4}`}><BookOpen size={17} /></span><span><strong>{m.titulo}</strong><small className="cell-sub">{m.autor}</small></span></div></td><td><span className="code-pill">{m.codigo}</span></td><td>{m.tipo}</td><td>{m.cantidad}</td><td><strong>{m.disponibles}</strong> / {m.cantidad}</td><td><span className={`availability ${m.disponibles > 0 ? 'available' : 'unavailable'}`}><span />{m.disponibles > 0 ? 'Disponible' : 'Agotado'}</span></td></tr>)}</tbody></table></div>}
    </section>
  </>;
}


function Lectores() {
  const [lectores, setLectores] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [form, setForm] = useState({ codigo: '', nombre: '', correo: '' });

  async function cargar() {
    try {
      setLectores(await api.lectores());
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => { cargar(); }, []);

  const filtrados = lectores.filter((l) =>
    `${l.codigo} ${l.nombre} ${l.correo}`.toLowerCase().includes(busqueda.toLowerCase())
  );

  function cambiarCampo(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function nuevoLector() {
    setForm({ codigo: '', nombre: '', correo: '' });
    setEditandoId(null);
    setMostrarForm(true);
    setError('');
    setExito('');
  }

  function editarLector(lector) {
    setForm({ codigo: lector.codigo, nombre: lector.nombre, correo: lector.correo });
    setEditandoId(lector.id);
    setMostrarForm(true);
    setError('');
    setExito('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function guardar(e) {
    e.preventDefault();
    setError('');
    setExito('');
    try {
      if (editandoId) {
        await api.actualizarLector(editandoId, form);
        setExito('Los datos del lector se actualizaron correctamente.');
      } else {
        await api.crearLector(form);
        setExito('Lector registrado correctamente.');
      }
      setForm({ codigo: '', nombre: '', correo: '' });
      setEditandoId(null);
      setMostrarForm(false);
      await cargar();
    } catch (e) {
      setError(e.message);
    }
  }

  async function eliminar(lector) {
    if (!window.confirm(`¿Deseas eliminar al lector ${lector.nombre}?`)) return;
    setError('');
    setExito('');
    try {
      await api.eliminarLector(lector.id);
      setExito('Lector eliminado correctamente.');
      await cargar();
    } catch (e) {
      setError(e.message);
    }
  }

  function cancelar() {
    setMostrarForm(false);
    setEditandoId(null);
    setForm({ codigo: '', nombre: '', correo: '' });
  }

  return <>
    <CabeceraPagina
      etiqueta="COMUNIDAD DE LA BIBLIOTECA"
      titulo="Lectores"
      descripcion="Registra y mantén actualizados los datos de los estudiantes que solicitan materiales."
      accion={<button className="button primary" onClick={nuevoLector}><Plus size={16} /> Nuevo lector</button>}
    />
    <Mensaje tipo="success">{exito}</Mensaje>
    <Mensaje>{error}</Mensaje>

    {mostrarForm && <section className="panel form-panel">
      <div className="panel-heading">
        <div><h3>{editandoId ? 'Editar lector' : 'Registrar lector'}</h3><p>Completa los datos de identificación y contacto.</p></div>
        <button className="icon-button" onClick={cancelar} aria-label="Cerrar formulario"><X size={16} /></button>
      </div>
      <form className="form-grid" onSubmit={guardar}>
        <label>Código del lector<input name="codigo" value={form.codigo} onChange={cambiarCampo} placeholder="Ej. 2026010" required maxLength="30" /></label>
        <label>Nombre completo<input name="nombre" value={form.nombre} onChange={cambiarCampo} placeholder="Nombres y apellidos" required maxLength="120" /></label>
        <label className="span-2">Correo electrónico<input name="correo" type="email" value={form.correo} onChange={cambiarCampo} placeholder="estudiante@institucion.edu" required maxLength="160" /></label>
        <div className="form-actions">
          <button className="button secondary" type="button" onClick={cancelar}>Cancelar</button>
          <button className="button primary" type="submit">{editandoId ? 'Guardar cambios' : 'Registrar lector'}</button>
        </div>
      </form>
    </section>}

    <section className="panel">
      <div className="list-toolbar">
        <div><h3>Directorio de lectores</h3><p>{filtrados.length} de {lectores.length} lector(es)</p></div>
        <div className="search-box"><Search size={15} /><input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por código, nombre o correo" aria-label="Buscar lectores" /></div>
      </div>
      {filtrados.length === 0 ? <div className="empty-state">{lectores.length === 0 ? 'Todavía no hay lectores registrados.' : 'No se encontraron lectores con esa búsqueda.'}</div> :
        <div className="table-scroll"><table>
          <thead><tr><th>Lector</th><th>Código</th><th>Correo electrónico</th><th>Acciones</th></tr></thead>
          <tbody>{filtrados.map((lector) => <tr key={lector.id}>
            <td><div className="reader-cell"><span className="reader-avatar">{lector.nombre.trim().charAt(0).toUpperCase()}</span><span><strong>{lector.nombre}</strong><small className="cell-sub">{lector.id}</small></span></div></td>
            <td><span className="code-pill">{lector.codigo}</span></td>
            <td>{lector.correo}</td>
            <td><div className="reader-actions"><button className="row-action action-button" onClick={() => editarLector(lector)}><Pencil size={13} /> Editar</button><button className="row-action action-button danger-action" onClick={() => eliminar(lector)}><Trash2 size={13} /> Eliminar</button></div></td>
          </tr>)}</tbody>
        </table></div>}
    </section>
    <p className="readers-note">Nota: por seguridad del historial, no se puede eliminar un lector que ya tenga préstamos registrados. Puedes editar sus datos cuando sea necesario.</p>
  </>;
}

function Prestamos() {
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const filtroInicial = params.get('estado') === 'VENCIDO' ? 'VENCIDO' : 'TODOS';
  const [prestamos, setPrestamos] = useState([]);
  const [materiales, setMateriales] = useState([]);
  const [lectores, setLectores] = useState([]);
  const [filtro, setFiltro] = useState(filtroInicial);
  const [busqueda, setBusqueda] = useState('');
  const [mostrarForm, setMostrarForm] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ materialId: '', lectorId: '', fechaPrestamo: hoyLocal(), fechaDevolucionPrevista: fechaMasDias(7), observacion: '' });
  async function cargar() { try { const [p, m, l] = await Promise.all([api.prestamos(), api.materiales(), api.lectores()]); setPrestamos(p); setMateriales(m); setLectores(l); setError(''); } catch (e) { setError(e.message); } }
  useEffect(() => { cargar(); }, []);
  const filtrados = prestamos.filter((p) => (filtro === 'TODOS' || p.estado === filtro) && `${p.id} ${p.material?.titulo || ''} ${p.lector?.nombre || ''}`.toLowerCase().includes(busqueda.toLowerCase()));
  function cambiarCampo(e) { setForm({ ...form, [e.target.name]: e.target.value }); }
  async function guardar(e) {
    e.preventDefault(); setError('');
    try { const nuevo = await api.crearPrestamo(form); setMostrarForm(false); await cargar(); navigate(`/prestamo/${nuevo.id}`); }
    catch (err) { setError(err.message); }
  }
  const disponibles = materiales.filter((m) => m.disponibles > 0);
  return <>
    <CabeceraPagina etiqueta="CIRCULACIÓN" titulo="Préstamos" descripcion="Registra salidas, revisa fechas límite y controla las devoluciones." accion={<button className="button primary" onClick={() => { setMostrarForm(!mostrarForm); setError(''); }}><Plus size={16} /> Nuevo préstamo</button>} />
    <Mensaje>{error}</Mensaje>
    {mostrarForm && <section className="panel form-panel"><div className="panel-heading"><div><h3>Registrar préstamo</h3><p>Selecciona un recurso con unidades disponibles y un lector.</p></div><button className="icon-button" onClick={() => setMostrarForm(false)} aria-label="Cerrar"><X size={16} /></button></div><form className="form-grid" onSubmit={guardar}><label className="span-2">Material<select name="materialId" value={form.materialId} onChange={cambiarCampo} required><option value="">Selecciona un material</option>{disponibles.map((m) => <option key={m.id} value={m.id}>{m.titulo} — {m.disponibles} disponible(s)</option>)}</select>{disponibles.length === 0 && <small className="field-hint">No hay materiales disponibles en este momento.</small>}</label><label className="span-2">Lector<select name="lectorId" value={form.lectorId} onChange={cambiarCampo} required><option value="">Selecciona un lector</option>{lectores.map((l) => <option key={l.id} value={l.id}>{l.nombre} ({l.codigo})</option>)}</select></label><label>Fecha del préstamo<input type="date" name="fechaPrestamo" value={form.fechaPrestamo} onChange={cambiarCampo} required /></label><label>Fecha límite de devolución<input type="date" name="fechaDevolucionPrevista" min={form.fechaPrestamo} value={form.fechaDevolucionPrevista} onChange={cambiarCampo} required /></label><label className="span-2">Observación (opcional)<textarea name="observacion" rows="2" value={form.observacion} onChange={cambiarCampo} placeholder="Nota sobre el préstamo…" /></label><div className="form-actions"><button className="button secondary" type="button" onClick={() => setMostrarForm(false)}>Cancelar</button><button className="button primary" type="submit" disabled={disponibles.length === 0}>Registrar préstamo</button></div></form></section>}
    <section className="panel"><div className="list-toolbar"><div><h3>Registro de préstamos</h3><p>{filtrados.length} resultado(s)</p></div><div className="toolbar-controls"><div className="search-box"><Search size={15} /><input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar préstamo…" /></div><select className="filter-select" value={filtro} onChange={(e) => setFiltro(e.target.value)} aria-label="Filtrar por estado"><option value="TODOS">Todos los estados</option><option value="PRESTADO">Prestados</option><option value="VENCIDO">Vencidos</option><option value="DEVUELTO">Devueltos</option></select></div></div>
      {filtrados.length === 0 ? <div className="empty-state">No hay préstamos que coincidan con esta búsqueda.</div> : <div className="table-scroll"><table><thead><tr><th>ID / Fecha</th><th>Material</th><th>Lector</th><th>Devolución prevista</th><th>Estado</th><th></th></tr></thead><tbody>{filtrados.map((p) => <tr key={p.id}><td><strong>{p.id}</strong><small className="cell-sub">{mostrarFecha(p.fechaPrestamo)}</small></td><td>{p.material?.titulo || 'Material eliminado'}</td><td>{p.lector?.nombre || 'Lector'}</td><td>{mostrarFecha(p.fechaDevolucionPrevista)}{p.fechaDevolucionReal && <small className="cell-sub">Real: {mostrarFecha(p.fechaDevolucionReal)}</small>}</td><td><Estado estado={p.estado} /></td><td><Link className="row-action" to={`/prestamo/${p.id}`}>Ver detalle <ArrowUpRight size={13} /></Link></td></tr>)}</tbody></table></div>}
    </section>
  </>;
}

function DetallePrestamo() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [prestamo, setPrestamo] = useState(null);
  const [fechaDevolucionPrevista, setFecha] = useState('');
  const [observacion, setObservacion] = useState('');
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [cargando, setCargando] = useState(true);
  async function cargar() {
    try { const p = await api.prestamo(id); setPrestamo(p); setFecha(p.fechaDevolucionPrevista); setObservacion(p.observacion || ''); setError(''); }
    catch (e) { setError(e.message); }
    finally { setCargando(false); }
  }
  useEffect(() => { cargar(); }, [id]);
  async function guardar(e) {
    e.preventDefault(); setError(''); setMensaje('');
    try { const actualizado = await api.actualizarPrestamo(id, { fechaDevolucionPrevista, observacion }); setPrestamo(actualizado); setMensaje('Los cambios se guardaron correctamente.'); }
    catch (e) { setError(e.message); }
  }
  async function devolver() {
    if (!window.confirm('¿Confirmas que el material fue devuelto?')) return;
    setError(''); setMensaje('');
    try { const actualizado = await api.devolverPrestamo(id); setPrestamo(actualizado); setMensaje('Devolución registrada. La disponibilidad del material ya fue actualizada.'); }
    catch (e) { setError(e.message); }
  }
  async function eliminar() {
    if (!window.confirm('¿Seguro que deseas eliminar este registro de préstamo?')) return;
    try { await api.eliminarPrestamo(id); navigate('/prestamos'); }
    catch (e) { setError(e.message); }
  }
  if (cargando) return <div className="panel empty-state">Cargando préstamo…</div>;
  if (!prestamo) return <><Link className="back-link" to="/prestamos"><ArrowLeft size={14} /> Volver a préstamos</Link><Mensaje>{error || 'No se encontró el préstamo.'}</Mensaje></>;
  return <>
    <Link className="back-link" to="/prestamos"><ArrowLeft size={14} /> Volver a préstamos</Link>
    <CabeceraPagina etiqueta={`DETALLE · ${prestamo.id}`} titulo="Detalle del préstamo" descripcion="Consulta los datos, modifica la fecha límite o registra la devolución." accion={<Estado estado={prestamo.estado} />} />
    <Mensaje tipo="success">{mensaje}</Mensaje><Mensaje>{error}</Mensaje>
    <div className="detail-grid"><section className="panel detail-panel"><div className="panel-heading"><div><h3>Información del préstamo</h3><p>Datos vinculados al material y al lector.</p></div></div><div className="detail-hero"><span className="detail-book-icon"><BookOpen size={23} /></span><div><h3>{prestamo.material?.titulo || 'Material eliminado'}</h3><p>{prestamo.material?.codigo || 'Sin código'} · {prestamo.material?.tipo || 'Material'}</p></div></div><div className="detail-fields"><div><span>LECTOR</span><strong>{prestamo.lector?.nombre || 'Lector eliminado'}</strong><small>{prestamo.lector?.codigo || ''}</small></div><div><span>FECHA DE PRÉSTAMO</span><strong>{mostrarFecha(prestamo.fechaPrestamo)}</strong></div><div><span>DEVOLUCIÓN PREVISTA</span><strong>{mostrarFecha(prestamo.fechaDevolucionPrevista)}</strong></div><div><span>DEVOLUCIÓN REAL</span><strong>{mostrarFecha(prestamo.fechaDevolucionReal)}</strong></div><div><span>DISPONIBILIDAD ACTUAL</span><strong>{prestamo.material ? `${prestamo.material.disponibles ?? '—'} de ${prestamo.material.cantidad}` : '—'}</strong></div></div><div className="observation-box"><span>OBSERVACIÓN</span><p>{prestamo.observacion || 'No se registraron observaciones.'}</p></div></section>
      <section className="panel edit-panel"><div className="panel-heading"><div><h3>Gestionar préstamo</h3><p>Actualiza la fecha límite o añade una nota.</p></div></div><form onSubmit={guardar} className="stacked-form"><label>Fecha límite de devolución<input type="date" min={prestamo.fechaPrestamo} value={fechaDevolucionPrevista} onChange={(e) => setFecha(e.target.value)} required disabled={prestamo.estado === 'DEVUELTO'} /></label><label>Observación<textarea rows="4" value={observacion} onChange={(e) => setObservacion(e.target.value)} placeholder="Añade una observación…" /></label><button className="button primary full-width" type="submit">Guardar cambios</button></form><div className="action-divider" /><div className="return-card"><div><strong>{prestamo.estado === 'DEVUELTO' ? 'Material devuelto' : 'Registrar devolución'}</strong><p>{prestamo.estado === 'DEVUELTO' ? `Devolución registrada el ${mostrarFecha(prestamo.fechaDevolucionReal)}.` : 'Confirma cuando el material sea entregado a la biblioteca.'}</p></div><button className="button success" onClick={devolver} disabled={prestamo.estado === 'DEVUELTO'}>{prestamo.estado === 'DEVUELTO' ? <><CheckCircle2 size={15} /> Devuelto</> : <><CheckCircle2 size={15} /> Marcar devuelto</>}</button></div><button className="delete-link" onClick={eliminar}>Eliminar registro de préstamo</button></section></div>
  </>;
}

function NoEncontrado() { return <section className="panel not-found"><div className="not-found-symbol"><CircleHelp size={25} /></div><h2>Página no encontrada</h2><p>La página que buscas no existe.</p><Link to="/" className="button primary"><Home size={15} /> Volver al inicio</Link></section>; }


function EstadoSolicitud({ estado }) {
  const mapa = {
    PENDIENTE: ['pending', 'Pendiente de revisión'],
    APROBADA: ['approved', 'Aprobada'],
    RECHAZADA: ['rejected', 'Rechazada']
  };
  const [clase, etiqueta] = mapa[estado] || ['pending', estado || 'Pendiente'];
  return <span className={`request-state ${clase}`}><span />{etiqueta}</span>;
}

function SolicitudesAdmin() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [filtro, setFiltro] = useState('PENDIENTE');
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState('');
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  async function cargar() {
    try { setSolicitudes(await api.solicitudes()); setError(''); }
    catch (e) { setError(e.message); }
    finally { setCargando(false); }
  }
  useEffect(() => { cargar(); }, []);
  async function resolver(id, accion) {
    setProcesando(id); setError(''); setMensaje('');
    try {
      if (accion === 'aprobar') await api.aprobarSolicitud(id);
      else await api.rechazarSolicitud(id);
      setMensaje(accion === 'aprobar' ? 'Solicitud aprobada y préstamo registrado.' : 'La solicitud fue rechazada.');
      await cargar();
    } catch (e) { setError(e.message); }
    finally { setProcesando(''); }
  }
  const visibles = solicitudes.filter((s) => filtro === 'TODAS' || s.estado === filtro);
  const pendientes = solicitudes.filter((s) => s.estado === 'PENDIENTE').length;
  return <>
    <CabeceraPagina etiqueta="ATENCIÓN AL ESTUDIANTE" titulo="Solicitudes de préstamo" descripcion="Revisa las peticiones enviadas desde el portal estudiantil y aprueba o rechaza cada solicitud." accion={<span className="pending-count"><ClipboardCheck size={16} /> {pendientes} pendiente(s)</span>} />
    <Mensaje>{error}</Mensaje><Mensaje tipo="success">{mensaje}</Mensaje>
    <section className="panel requests-admin-panel">
      <div className="list-toolbar"><div><h3>Solicitudes recibidas</h3><p>{visibles.length} solicitud(es)</p></div><select className="filter-select" value={filtro} onChange={(e) => setFiltro(e.target.value)} aria-label="Filtrar solicitudes"><option value="PENDIENTE">Pendientes</option><option value="APROBADA">Aprobadas</option><option value="RECHAZADA">Rechazadas</option><option value="TODAS">Todas</option></select></div>
      {cargando ? <div className="empty-state">Cargando solicitudes…</div> : visibles.length === 0 ? <div className="empty-state request-empty"><span><ClipboardCheck size={25} /></span><strong>No hay solicitudes en esta categoría</strong><p>Cuando un estudiante solicite un material, aparecerá aquí.</p></div> : <div className="request-list-admin">{visibles.map((s) => <article className="request-admin-card" key={s.id}><div className="request-admin-icon"><BookOpen size={22} /></div><div className="request-admin-main"><div className="request-admin-heading"><strong>{s.material?.titulo || 'Material no disponible'}</strong><EstadoSolicitud estado={s.estado} /></div><p><UserRound size={14} /> {s.lector?.nombre || 'Estudiante'} · {s.lector?.codigo || ''}</p><div className="request-admin-meta"><span><CalendarDays size={14} /> Solicitado: {mostrarFecha(s.fechaSolicitud)}</span><span><Clock3 size={14} /> Devolución propuesta: {mostrarFecha(s.fechaDevolucionPrevista)}</span></div>{s.observacion && <small className="request-note">Nota del estudiante: {s.observacion}</small>}{s.prestamo && <small className="request-note">Préstamo generado: {s.prestamo.id}</small>}</div>{s.estado === 'PENDIENTE' && <div className="request-admin-actions"><button className="button success" disabled={procesando === s.id} onClick={() => resolver(s.id, 'aprobar')}><Check size={15} /> Aprobar</button><button className="button reject-button" disabled={procesando === s.id} onClick={() => resolver(s.id, 'rechazar')}><XCircle size={15} /> Rechazar</button></div>}</article>)}</div>}
    </section>
  </>;
}

function Acceso({ modo = 'login', onAutenticado }) {
  const esRegistro = modo === 'registro';
  const navigate = useNavigate();
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  async function enviar(e) {
    e.preventDefault(); setError('');
    if (esRegistro && password !== confirmacion) { setError('Las contraseñas no coinciden.'); return; }
    setEnviando(true);
    try {
      const resultado = esRegistro
        ? await api.registrar({ nombre, email, password })
        : await api.iniciarSesion({ email, password });
      onAutenticado(resultado);
      navigate(resultado.usuario.rol === 'admin' ? '/' : '/catalogo', { replace: true });
    } catch (err) { setError(err.message); }
    finally { setEnviando(false); }
  }
  return <div className="auth-page"><section className="auth-story"><Link to="/login" className="auth-brand"><span className="auth-brand-mark"><Library size={24} /></span><span><strong>Biblioteca</strong><small>Lectura que conecta</small></span></Link><div className="auth-story-content"><span className="auth-overline">TU ESPACIO DE LECTURA</span><h1>Un buen libro puede abrirte un mundo.</h1><p>Explora los materiales de la biblioteca, solicita préstamos y revisa tus fechas de devolución desde un solo lugar.</p><div className="auth-feature-list"><span><BookOpen size={17} /> Catálogo de materiales</span><span><CalendarDays size={17} /> Fechas de devolución claras</span><span><ShieldCheck size={17} /> Solicitudes con seguimiento</span></div></div><div className="auth-story-footer">Biblioteca estudiantil · Portal web</div></section><section className="auth-form-side"><div className="auth-card"><div className="auth-icon"><GraduationCap size={24} /></div><span className="eyebrow">PORTAL ESTUDIANTIL</span><h2>{esRegistro ? 'Crea tu cuenta' : 'Qué gusto verte de nuevo'}</h2><p className="auth-subtitle">{esRegistro ? 'Regístrate para consultar el catálogo y solicitar libros.' : 'Inicia sesión para consultar tus libros y solicitudes.'}</p><Mensaje>{error}</Mensaje><form onSubmit={enviar} className="auth-form">{esRegistro && <label>Nombre completo<span className="auth-input"><UserRound size={17} /><input autoComplete="name" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Ana Torres" required minLength={2} /></span></label>}<label>Correo electrónico<span className="auth-input"><Mail size={17} /><input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" required /></span></label><label>Contraseña<span className="auth-input"><LockKeyhole size={17} /><input type="password" autoComplete={esRegistro ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={esRegistro ? 'Mínimo 8 caracteres' : 'Ingresa tu contraseña'} required minLength={esRegistro ? 8 : undefined} /></span></label>{esRegistro && <label>Confirmar contraseña<span className="auth-input"><LockKeyhole size={17} /><input type="password" autoComplete="new-password" value={confirmacion} onChange={(e) => setConfirmacion(e.target.value)} placeholder="Repite tu contraseña" required minLength={8} /></span></label>}<button className="button primary auth-submit" type="submit" disabled={enviando}>{enviando ? 'Procesando…' : esRegistro ? 'Crear cuenta' : 'Iniciar sesión'} <ArrowRight size={17} /></button></form><p className="auth-switch">{esRegistro ? '¿Ya tienes cuenta?' : '¿Todavía no tienes cuenta?'} <Link to={esRegistro ? '/login' : '/registro'}>{esRegistro ? 'Inicia sesión' : 'Regístrate aquí'}</Link></p>{!esRegistro && <div className="admin-demo-tip"><ShieldCheck size={16} /><span><strong>Acceso de administrador de demostración</strong><small>Correo: admin@biblioteca.local · Contraseña: Admin123!</small><small>Cambia estas credenciales antes de publicar el proyecto.</small></span></div>}</div></section></div>;
}

function StudentLayout({ usuario, onLogout }) {
  return <div className="student-shell"><aside className="student-sidebar"><Link className="student-brand" to="/catalogo"><span className="student-brand-mark"><Library size={24} /></span><span><strong>Biblioteca</strong><small>Portal estudiantil</small></span></Link><div className="nav-label">MI BIBLIOTECA</div><nav className="student-nav"><NavLink to="/catalogo" className={({ isActive }) => isActive ? 'student-nav-link active' : 'student-nav-link'}><BookOpen size={18} /> Catálogo</NavLink><NavLink to="/mis-prestamos" className={({ isActive }) => isActive ? 'student-nav-link active' : 'student-nav-link'}><BookMarked size={18} /> Mis préstamos</NavLink></nav><div className="student-side-note"><BookOpen size={18} /><strong>Un libro a la vez, un mundo nuevo.</strong><p>Recuerda revisar tus fechas de devolución.</p></div><button className="student-logout" onClick={onLogout}><LogOut size={16} /> Cerrar sesión</button></aside><main className="student-main"><header className="student-topbar"><div><span className="eyebrow">BIBLIOTECA ESTUDIANTIL</span><h1>Hola, {usuario.nombre.split(' ')[0]} 👋</h1></div><div className="student-profile"><span className="student-profile-avatar"><UserRound size={19} /></span><span><strong>{usuario.nombre}</strong><small>Estudiante</small></span></div><button className="student-mobile-logout" onClick={onLogout} aria-label="Cerrar sesión"><LogOut size={18} /></button></header><div className="student-content"><Routes><Route path="/catalogo" element={<CatalogoEstudiante usuario={usuario} />} /><Route path="/mis-prestamos" element={<MisPrestamosEstudiante />} /><Route path="*" element={<Navigate to="/catalogo" replace />} /></Routes></div></main></div>;
}

function CatalogoEstudiante({ usuario }) {
  const [materiales, setMateriales] = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [tipo, setTipo] = useState('TODOS');
  const [seleccionado, setSeleccionado] = useState(null);
  const [fechaDevolucionPrevista, setFecha] = useState(fechaMasDias(7));
  const [observacion, setObservacion] = useState('');
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  async function cargar() {
    try { const [m, s] = await Promise.all([api.catalogo(), api.solicitudes()]); setMateriales(m); setSolicitudes(s); setError(''); }
    catch (e) { setError(e.message); }
    finally { setCargando(false); }
  }
  useEffect(() => { cargar(); }, [usuario.id]);
  const tipos = ['TODOS', ...new Set(materiales.map((m) => m.tipo).filter(Boolean))];
  const visibles = materiales.filter((m) => (tipo === 'TODOS' || m.tipo === tipo) && `${m.titulo} ${m.autor} ${m.tipo} ${m.codigo}`.toLowerCase().includes(busqueda.toLowerCase()));
  const pendientes = solicitudes.filter((s) => s.estado === 'PENDIENTE').length;
  const activos = solicitudes.filter((s) => s.estado === 'APROBADA' && s.prestamo && !s.prestamo.fechaDevolucionReal).length;
  async function enviarSolicitud(e) {
    e.preventDefault(); if (!seleccionado) return;
    setEnviando(true); setError(''); setExito('');
    try {
      await api.crearSolicitud({ materialId: seleccionado.id, fechaDevolucionPrevista, observacion });
      setSeleccionado(null); setObservacion(''); setFecha(fechaMasDias(7));
      setExito('Tu solicitud fue enviada. El administrador debe aprobarla antes de que el préstamo quede registrado.');
      await cargar();
    } catch (e) { setError(e.message); }
    finally { setEnviando(false); }
  }
  return <>
    <section className="student-welcome"><div className="student-welcome-copy"><span className="student-eyebrow">DESCUBRE · APRENDE · COMPARTE</span><h2>Encuentra tu próxima lectura.</h2><p>Explora los materiales, consulta su disponibilidad y solicita tu préstamo en unos pasos.</p><div className="student-welcome-stats"><span><strong>{materiales.length}</strong><small>materiales</small></span><span><strong>{materiales.reduce((sum, m) => sum + (m.disponibles || 0), 0)}</strong><small>unidades disponibles</small></span><span><strong>{activos}</strong><small>mis préstamos activos</small></span></div></div><div className="student-welcome-art"><div className="book-stack book-stack-one"><BookOpen size={34} /></div><div className="book-stack book-stack-two"><BookMarked size={30} /></div><div className="student-art-circle"><Library size={42} /></div></div></section>
    <div className="student-section-heading"><div><span className="eyebrow">ELIGE ALGO NUEVO</span><h2>Catálogo de materiales</h2><p>Los libros disponibles pueden solicitarse para préstamo.</p></div><span className="student-result-count">{visibles.length} resultado(s)</span></div>
    <Mensaje>{error}</Mensaje><Mensaje tipo="success">{exito}</Mensaje>
    <div className="student-catalog-controls"><div className="search-box"><Search size={16} /><input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por título, autor o código…" /></div><select className="filter-select" value={tipo} onChange={(e) => setTipo(e.target.value)} aria-label="Filtrar por tipo">{tipos.map((t) => <option key={t} value={t}>{t === 'TODOS' ? 'Todos los tipos' : t}</option>)}</select></div>
    {cargando ? <div className="empty-state">Cargando catálogo…</div> : visibles.length === 0 ? <div className="panel empty-state request-empty"><span><BookOpen size={25} /></span><strong>No encontramos materiales</strong><p>Prueba con otro título, autor o categoría.</p></div> : <div className="student-book-grid">{visibles.map((m, i) => {
      const pendiente = solicitudes.some((s) => s.materialId === m.id && s.estado === 'PENDIENTE');
      const activo = solicitudes.some((s) => s.materialId === m.id && s.estado === 'APROBADA' && s.prestamo && !s.prestamo.fechaDevolucionReal);
      const sinStock = m.disponibles < 1;
      return <article className="student-book-card" key={m.id}><div className={`student-book-cover cover-${i % 4}`}><span className="cover-lines" /><BookOpen size={40} strokeWidth={1.5} /></div><div className="student-book-body"><span className="student-book-type">{m.tipo}</span><h3>{m.titulo}</h3><p className="student-book-author">{m.autor}</p><p className="student-book-code">Código {m.codigo}</p><div className="student-book-footer"><span className={`stock-label ${sinStock ? 'out' : 'in'}`}><span />{sinStock ? 'No disponible' : `${m.disponibles} disponible(s)`}</span><button className="button primary student-request-button" disabled={sinStock || pendiente || activo} onClick={() => { setSeleccionado(m); setFecha(fechaMasDias(7)); setObservacion(''); setError(''); }}>{pendiente ? 'Solicitud enviada' : activo ? 'Ya lo tienes prestado' : sinStock ? 'Agotado' : 'Solicitar'} {!pendiente && !activo && !sinStock && <ArrowRight size={15} />}</button></div></div></article>;
    })}</div>}
    {seleccionado && <div className="student-modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setSeleccionado(null); }}><section className="student-modal" role="dialog" aria-modal="true" aria-labelledby="solicitud-title"><button className="student-modal-close" onClick={() => setSeleccionado(null)} aria-label="Cerrar"><X size={18} /></button><div className="auth-icon"><BookMarked size={24} /></div><span className="eyebrow">SOLICITUD DE PRÉSTAMO</span><h2 id="solicitud-title">{seleccionado.titulo}</h2><p className="modal-book-author">{seleccionado.autor} · {seleccionado.disponibles} unidad(es) disponibles</p><form className="auth-form" onSubmit={enviarSolicitud}><label>Fecha propuesta de devolución<input className="student-date-input" type="date" min={hoyLocal()} value={fechaDevolucionPrevista} onChange={(e) => setFecha(e.target.value)} required /></label><label>Nota para el bibliotecario (opcional)<textarea value={observacion} onChange={(e) => setObservacion(e.target.value)} placeholder="Escribe una breve nota…" rows={3} maxLength={250} /></label><div className="modal-info"><Clock3 size={16} /><span>La solicitud será revisada por el administrador. El préstamo no se confirma hasta que sea aprobado.</span></div><Mensaje>{error}</Mensaje><button className="button primary auth-submit" type="submit" disabled={enviando}>{enviando ? 'Enviando…' : 'Enviar solicitud'} <Send size={16} /></button></form></section></div>}
  </>;
}

function MisPrestamosEstudiante() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => { api.solicitudes().then(setSolicitudes).catch((e) => setError(e.message)).finally(() => setCargando(false)); }, []);
  const activos = solicitudes.filter((s) => s.estado === 'APROBADA' && s.prestamo && !s.prestamo.fechaDevolucionReal).length;
  const pendientes = solicitudes.filter((s) => s.estado === 'PENDIENTE').length;
  return <><section className="student-page-intro"><div><span className="eyebrow">TU ACTIVIDAD</span><h2>Mis préstamos</h2><p>Consulta tus solicitudes, el resultado de la revisión y las fechas de devolución.</p></div><div className="student-mini-stats"><span><strong>{activos}</strong><small>activos</small></span><span><strong>{pendientes}</strong><small>por aprobar</small></span><span><strong>{solicitudes.length}</strong><small>solicitudes</small></span></div></section><Mensaje>{error}</Mensaje>{cargando ? <div className="empty-state">Cargando tus préstamos…</div> : solicitudes.length === 0 ? <div className="panel empty-state request-empty"><span><BookMarked size={25} /></span><strong>Aún no has solicitado un libro</strong><p>Explora el catálogo y envía tu primera solicitud.</p><Link className="button primary" to="/catalogo"><BookOpen size={16} /> Explorar catálogo</Link></div> : <div className="student-loan-list">{solicitudes.map((s) => <article key={s.id} className="student-loan-card"><div className="student-loan-icon"><BookOpen size={24} /></div><div className="student-loan-info"><div className="student-loan-title-row"><h3>{s.material?.titulo || 'Material'}</h3><EstadoSolicitud estado={s.estado} /></div><p>{s.material?.autor || ''} {s.material?.tipo ? `· ${s.material.tipo}` : ''}</p><div className="student-loan-meta"><span><CalendarDays size={14} /> Solicitud: {mostrarFecha(s.fechaSolicitud)}</span><span><Clock3 size={14} /> Devolución: {mostrarFecha(s.prestamo?.fechaDevolucionPrevista || s.fechaDevolucionPrevista)}</span></div>{s.estado === 'PENDIENTE' && <small className="student-status-note">Tu solicitud está esperando la revisión del administrador.</small>}{s.estado === 'RECHAZADA' && <small className="student-status-note">Esta solicitud no fue aprobada. Puedes consultar otros materiales disponibles.</small>}{s.prestamo && <div className="approved-loan-detail"><span>Préstamo: {s.prestamo.id}</span><span className={`loan-return ${s.prestamo.estado === 'VENCIDO' ? 'late' : s.prestamo.estado === 'DEVUELTO' ? 'returned' : 'active'}`}>{s.prestamo.estado === 'DEVUELTO' ? `Devuelto el ${mostrarFecha(s.prestamo.fechaDevolucionReal)}` : s.prestamo.estado === 'VENCIDO' ? 'Devolución vencida' : 'Préstamo activo'}</span></div>}</div></article>)}</div>}</>;
}

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState(null);
  const [inicializando, setInicializando] = useState(true);
  useEffect(() => {
    const token = localStorage.getItem('biblioteca_token');
    if (!token) { setInicializando(false); return; }
    api.sesionActual().then((resultado) => setUsuario(resultado.usuario)).catch(() => {
      localStorage.removeItem('biblioteca_token'); setUsuario(null);
    }).finally(() => setInicializando(false));
  }, []);
  function autenticado(resultado) {
    localStorage.setItem('biblioteca_token', resultado.token);
    setUsuario(resultado.usuario);
  }
  function cerrarSesion() {
    localStorage.removeItem('biblioteca_token');
    setUsuario(null);
    navigate('/login', { replace: true });
  }
  if (inicializando) return <div className="app-loading"><Library size={28} /><span>Preparando tu biblioteca…</span></div>;
  if (location.pathname === '/login' || location.pathname === '/registro') {
    if (usuario) return <Navigate to={usuario.rol === 'admin' ? '/' : '/catalogo'} replace />;
    return <Acceso modo={location.pathname === '/registro' ? 'registro' : 'login'} onAutenticado={autenticado} />;
  }
  if (!usuario) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (usuario.rol === 'estudiante') {
    if (!['/catalogo', '/mis-prestamos'].includes(location.pathname)) return <Navigate to="/catalogo" replace />;
    return <StudentLayout usuario={usuario} onLogout={cerrarSesion} />;
  }
  if (location.pathname === '/catalogo' || location.pathname === '/mis-prestamos') return <Navigate to="/" replace />;
  return <Layout usuario={usuario} onLogout={cerrarSesion} />;
}

