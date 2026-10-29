# Biblioteca estudiantil — React + Vite + API REST + SQLite

Aplicación web SPA para administrar materiales, lectores y préstamos de una biblioteca estudiantil. El frontend usa React + Vite; el backend utiliza Node.js + Express y la información operativa se almacena en una base de datos SQLite.

## Funciones principales

- Panel de inicio con resumen de materiales, lectores, préstamos activos y vencidos.
- Catálogo de materiales con búsqueda, cantidad total y disponibilidad calculada.
- Dos interfaces diferenciadas: administración y portal del estudiante.
- Registro e inicio de sesión para estudiantes y cuentas con roles `admin` / `estudiante`.
- Contraseñas con hash `scrypt` y tokens firmados con HMAC de duración limitada.
- Registro y consulta de lectores, edición de datos y protección del historial de préstamos.
- Catálogo estudiantil con búsqueda, filtro por tipo y consulta de disponibilidad.
- Solicitudes de préstamo creadas por estudiantes, con aprobación o rechazo desde administración.
- Cuando el administrador aprueba una solicitud, se genera el préstamo real en SQLite.
- Detalle de préstamo en `/prestamo/:id` y acción para registrar la devolución real.
- Validación de fechas y disponibilidad antes de aprobar una solicitud o registrar un préstamo.
- Estados calculados como `PRESTADO`, `VENCIDO` o `DEVUELTO` y estados de solicitud `PENDIENTE`, `APROBADA` o `RECHAZADA`.
- Interfaz adaptable con iconos Lucide y paleta marrón, blanco y beige; el estilo se puede personalizar en `frontend/src/styles.css`.

## Tecnologías

- **React + Vite:** interfaz de la SPA.
- **Node.js + Express:** servidor y API REST.
- **SQLite + better-sqlite3:** persistencia local de los datos.
- **Git + GitHub:** control de versiones y colaboración.

## Requisitos

- Una versión compatible y actualmente soportada de Node.js. Para Vite, consulta los requisitos de la guía oficial: https://vite.dev/guide/.
- npm, incluido con Node.js.
- Visual Studio Code.
- Git y una cuenta de GitHub para publicar el repositorio.

Comprueba las instalaciones en la terminal de VS Code:

```bash
node -v
npm -v
git --version
```

## Instalación e inicio

### 1. Abrir el proyecto

Descomprime la carpeta `biblioteca-spa` y ábrela en Visual Studio Code mediante **Archivo → Abrir carpeta**.

### 2. Iniciar el backend y crear la base de datos

Abre una terminal integrada en VS Code (`Terminal → Nueva terminal`) y ejecuta:

```bash
cd backend
npm install
npm run dev
```

El ZIP de entrega incluye `backend/data/biblioteca.sqlite` con datos de demostración para que puedas comenzar a probar. El servidor crea las tablas si faltan. Si obtienes el proyecto desde un repositorio GitHub (donde la base de datos está excluida) o el archivo SQLite no existe, lo crea automáticamente e importa una sola vez los datos de `backend/data/db.json`. A partir de ese momento, las nuevas altas, modificaciones, préstamos y devoluciones se guardan en SQLite; el JSON queda únicamente como archivo de semilla y no se actualiza con cada operación.

La API debe iniciar en `http://localhost:3000`. Comprueba su estado abriendo `http://localhost:3000/api/health`.

Al iniciar por primera vez una base de datos nueva, se crea automáticamente una cuenta administrativa de demostración si aún no existe ninguna cuenta con rol administrador:

- **Correo:** `admin@biblioteca.local`
- **Contraseña:** `Admin123!`

Estas credenciales son solamente para desarrollo local. Antes de publicar la aplicación, establece `ADMIN_EMAIL`, `ADMIN_PASSWORD` y un valor aleatorio largo para `AUTH_SECRET` en el entorno del servidor. Por ejemplo, en PowerShell puedes definirlos antes de `npm run dev`:

```powershell
$env:ADMIN_EMAIL="bibliotecario@tu-centro.edu"
$env:ADMIN_PASSWORD="UnaClaveLargaYUnica"
$env:AUTH_SECRET="ReemplazaEstoPorUnSecretoAleatorioLargo"
npm run dev
```

La cuenta inicial se crea solo cuando la base de datos no tiene usuarios administradores; cambiar las variables después no restablece la contraseña de una cuenta existente.

### 3. Iniciar el frontend

Deja el backend funcionando. Abre otra terminal con el botón `+` del panel Terminal y ejecuta:

```bash
cd frontend
npm install
npm run dev
```

Abre la dirección que Vite muestre (normalmente `http://localhost:5173`). Mantén activas ambas terminales mientras utilizas la aplicación.

## Modelo de base de datos

El archivo `backend/schema.sql` define las tablas y sus relaciones:

- **`materiales`:** `id`, `codigo`, `titulo`, `autor`, `tipo`, `cantidad`.
- **`lectores`:** `id`, `codigo`, `nombre`, `correo`.
- **`prestamos`:** `id`, `materialId`, `lectorId`, `fechaPrestamo`, `fechaDevolucionPrevista`, `fechaDevolucionReal`, `observacion`.
- **`usuarios`:** cuentas de acceso con correo, hash de contraseña, rol y referencia opcional al lector.
- **`solicitudes`:** solicitudes de estudiantes con estado, fecha propuesta y referencia al préstamo que se genera al aprobarlas.
- **`app_meta`:** registra que los datos de demostración ya se importaron, evitando repetir la carga al reiniciar el servidor.

Cada préstamo referencia un material y un lector mediante claves foráneas. SQLite tiene habilitada la comprobación de estas relaciones. Los materiales y lectores con historial de préstamos no se pueden eliminar, para preservar la integridad de los datos. Los códigos de materiales y lectores son únicos sin distinguir mayúsculas de minúsculas.

La disponibilidad se calcula restando la cantidad de préstamos sin fecha de devolución real a la cantidad total de unidades. Los préstamos vencidos siguen contando como prestados hasta que se registra su devolución.

## Endpoints principales de la API REST

Las rutas administrativas necesitan un token válido con rol de administrador. Las rutas de catálogo y solicitudes requieren iniciar sesión; un estudiante solo consulta sus propias solicitudes.

| Método | Endpoint | Acceso / función |
|---|---|---|
| GET | `/api/health` | Público: verificar API y SQLite |
| POST | `/api/auth/register` | Público: registrar una cuenta de estudiante y su ficha de lector |
| POST | `/api/auth/login` | Público: iniciar sesión |
| GET | `/api/auth/me` | Autenticado: validar sesión actual |
| GET | `/api/catalogo` | Autenticado: consultar materiales disponibles |
| GET | `/api/solicitudes` | Admin: todas; estudiante: solo las propias |
| POST | `/api/solicitudes` | Estudiante: crear solicitud pendiente |
| PATCH | `/api/solicitudes/:id/aprobar` | Admin: crear el préstamo y aprobar la solicitud en una transacción |
| PATCH | `/api/solicitudes/:id/rechazar` | Admin: rechazar solicitud pendiente |
| GET | `/api/materiales` | Admin: listar materiales y disponibilidad |
| POST | `/api/materiales` | Admin: registrar material |
| PUT | `/api/materiales/:id` | Admin: actualizar material |
| DELETE | `/api/materiales/:id` | Admin: eliminar si no tiene historial |
| GET | `/api/lectores` | Admin: listar lectores |
| POST | `/api/lectores` | Admin: registrar lector manualmente |
| PUT | `/api/lectores/:id` | Admin: actualizar lector |
| DELETE | `/api/lectores/:id` | Admin: eliminar si no tiene historial |
| GET | `/api/prestamos` | Admin: listar préstamos; admite `?estado=VENCIDO` |
| POST | `/api/prestamos` | Admin: registrar préstamo directamente |
| GET | `/api/prestamos/:id` | Admin: consultar un préstamo |
| PUT | `/api/prestamos/:id` | Admin: cambiar fecha prevista u observación |
| PATCH | `/api/prestamos/:id/devolver` | Admin: registrar devolución real |
| DELETE | `/api/prestamos/:id` | Admin: eliminar registro de préstamo |

## Flujos de uso

**Estudiante:** crea una cuenta desde `/registro`, inicia sesión, busca en `/catalogo`, envía una solicitud y consulta su estado en `/mis-prestamos`.

**Administrador:** inicia sesión en `/login` con la cuenta administrativa de desarrollo, revisa la sección `/solicitudes` y aprueba o rechaza. Al aprobar, se crea el préstamo en la misma operación de base de datos, sujeto a que haya una unidad disponible.

El token se guarda en `localStorage` para este proyecto académico. Para un despliegue real, se recomienda usar HTTPS, revisar la estrategia de sesión, limitar intentos de inicio de sesión, cambiar los valores por defecto y reforzar la configuración de seguridad.

## Vistas de la SPA

**Acceso:**
- `/login` — inicio de sesión para administrador y estudiante.
- `/registro` — registro de cuenta de estudiante.

**Administrador:**
- `/` — inicio y resumen de gestión.
- `/materiales` — inventario y disponibilidad.
- `/lectores` — directorio y administración de lectores.
- `/prestamos` — lista, filtros y creación directa de préstamos administrativos.
- `/prestamo/:id` — detalle, edición, devolución y eliminación de un préstamo.
- `/solicitudes` — revisión, aprobación y rechazo de solicitudes estudiantiles.

**Estudiante:**
- `/catalogo` — catálogo de materiales con búsqueda, filtro y solicitud.
- `/mis-prestamos` — solicitudes pendientes, aprobadas, rechazadas y estado de los préstamos aprobados.

Las rutas visibles por rol se controlan en el frontend para la experiencia de uso y, de forma importante, las operaciones sensibles también se protegen en el backend. La validación del servidor es la que impide que un estudiante use directamente un endpoint administrativo.

## Pruebas manuales sugeridas

1. Abre `/api/health` y confirma que la respuesta contiene `"baseDatos":"SQLite"`.
2. Abre `/login` e inicia sesión como administrador con las credenciales locales documentadas arriba.
3. Cierra sesión y entra a `/registro`; crea una cuenta nueva de estudiante.
4. Desde el catálogo estudiantil, solicita un material y confirma que aparece como pendiente en `Mis préstamos`.
5. Cierra la sesión del estudiante, vuelve a entrar como administrador y abre `/solicitudes`.
6. Aprueba la solicitud y comprueba que la solicitud cambie a aprobada y que se cree un registro real en Préstamos.
7. Vuelve a entrar como estudiante y verifica que aparece el préstamo y la fecha prevista de devolución.
8. Intenta entrar como estudiante a `/lectores` o `/prestamos`; debe volver a su catálogo. Comprueba también que las llamadas directas a endpoints administrativos sin token o con token de estudiante devuelven `401` o `403`.
9. En la vista de administrador, registra la devolución real y comprueba que la disponibilidad aumente.
10. Reinicia el backend y confirma que las cuentas, solicitudes y préstamos persisten en SQLite.

## Persistencia y copia de seguridad

La base de datos activa está en `backend/data/biblioteca.sqlite`. Para una copia de seguridad sencilla, detén el backend y copia ese archivo a una ubicación segura. No elimines ese archivo si necesitas conservar los datos reales registrados.

El archivo `backend/data/db.json` solo proporciona datos iniciales. Si necesitas reiniciar los datos de demostración desde cero durante las pruebas, detén el servidor y elimina `biblioteca.sqlite` (y, si existen, `biblioteca.sqlite-wal` y `biblioteca.sqlite-shm`). Al iniciar otra vez, el servidor volverá a crear la base de datos e importará los datos del JSON. **Esto borra los datos guardados en la base de datos**, así que no lo hagas si necesitas conservarlos.

## Git y GitHub

Desde la carpeta raíz del proyecto:

```bash
git init
git add .
git commit -m "feat: integrar base de datos SQLite"
git branch -M main
```

Crea un repositorio vacío en GitHub y copia su URL:

```bash
git remote add origin URL_DE_TU_REPOSITORIO
git push -u origin main
```

El archivo SQLite local está excluido de Git mediante `.gitignore`; se publica el esquema SQL y el JSON de datos iniciales, para que otra persona pueda instalar el proyecto y crear su propia base de datos al iniciar el backend.

Para colaborar, usen ramas por funcionalidad, commits claros y Pull Requests revisados. Las evidencias deben mostrar el historial real de commits, ramas, Pull Requests y el funcionamiento de la aplicación.

## Notas de seguridad

Este proyecto está preparado para aprendizaje y pruebas locales. Ya incluye autenticación, hash de contraseñas, tokens firmados y autorización por rol en el backend. Antes de usarlo en producción, cambia las credenciales de demostración, configura un `AUTH_SECRET` aleatorio y privado, despliega con HTTPS, añade límites de intentos de inicio de sesión, revisa la política de sesiones y configura copias de seguridad periódicas de SQLite.
