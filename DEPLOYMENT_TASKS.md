# CSM Hub Docente — Plan Maestro de Deployment
**Versión:** 1.3  
**Última actualización:** 21 noviembre 2026  
**Alcance:** 4 escuelas · ~80 docentes · deployment profesional, seguro y sostenible

---

## CÓMO USAR ESTE ARCHIVO
Este documento es el único punto de verdad del proyecto. Al inicio de cada sesión, leerlo completo
antes de escribir una sola línea de código. Contiene el estado actual, decisiones tomadas,
credenciales de staging, y el backlog priorizado de tareas pendientes.

---

## ✅ PROGRESO — SESIÓN 20 NOV 2026

### Lo que se hizo hoy

**1. Pull del repo**
Se hizo pull desde GitHub. Había 2 commits nuevos en `main` que no estaban en el PC:
- `feat: flechas para navegar entre días en Vigilancias del día`
- `chore: agregar enlace Lesson Plan a la semilla de enlaces`

**2. Análisis completo para deployment profesional**
Se identificaron todos los problemas de seguridad del estado actual:
- RLS desactivado en todas las tablas (cualquiera puede leer/escribir toda la data)
- Tabla `plans` sin `teacher_id` (los planes no tienen dueño)
- App completamente pública (sin login obligatorio)
- Sin separación por escuela

**3. Decisiones de arquitectura tomadas**
- ✅ **Google SSO** como método de auth (el colegio usa Google Workspace `@csm.edu.co`)
  - **PENDIENTE:** necesita aval del equipo de TI del colegio antes de implementar
  - **Durante desarrollo:** se usa email + contraseña con usuarios de prueba en staging
- ✅ **Multi-escuela** desde el diseño (tabla `schools`, `school_id` en todas las tablas)
- ✅ **Roles:** `super_admin`, `admin`, `coordinador`, `counselor`, `docente`
- ✅ **React Router** (hay que instalarlo — actualmente el routing es con `useState`)

**4. Entorno de desarrollo configurado**
- ✅ Rama `develop` creada en GitHub (todo el desarrollo nuevo va aquí)
- ✅ `main` intacto → producción sigue corriendo sin cambios
- ✅ Proyecto de staging creado en Supabase: `fnzbdlnngjxqdmwhhezd.supabase.co`
- ✅ `.env.local` configurado apuntando a staging (nunca va al repo, está en .gitignore)
- ✅ Vercel configurado: environment "Preview" usa staging, "Production" usa producción
- ✅ Push a `develop` → Vercel preview con staging. Push a `main` → producción sin cambios.

**5. Schema de base de datos desplegado en staging**
Se ejecutó `supabase-staging-schema.sql` en el SQL Editor de Supabase staging. Resultado: Success.
Tablas creadas: `schools`, `profiles`, `events`, `subjects`, `plans`, `counseling_sessions`,
`vigilancias_config`, `teacher_subjects`.
RLS habilitado en todas. Triggers, funciones auxiliares e índices creados.
Dato semilla: escuela "High School" insertada en tabla `schools`.

---

## ✅ PROGRESO — SESIÓN 21 NOV 2026 (desde el Mac)

**1. Entorno en el Mac**
- Se cambió a la rama `develop`.
- `.env.local` ahora apunta a **staging**. La config anterior (producción) quedó en `.env.backup-produccion.local`
  (Vite no la lee; solo es respaldo).
- Hay un commit local en `main` ("agregar enlace Salones y asistencia trimestrales") que **NO se subió** a propósito.

**2. Escuelas en staging**
- Columna `sort_order` agregada a `schools` y las 4 escuelas creadas:
  Early Childhood (1), Primary School (2), Middle School (3), High School (4).

**3. Usuario super_admin**
- Solo se creó `jbeltran2@csm.edu.co` como `super_admin` (school_id = High School).
  Los demás usuarios de prueba (admin, coordinador, docente) quedan pendientes; por ahora se usa la barra "Ver como".

**4. Código (commit en `develop`)**
- Barra amarilla **"Ver como"** para el super_admin: cambia de rol (Super admin, Admin, Coordinador, Counselor,
  Docente) y de escuela. Solo cambia la interfaz; los permisos RLS siguen siendo los reales.
  Archivos: `src/components/RoleSwitcher.jsx`, `src/hooks/useAuth.js` (`role` efectivo, `realRole`, `schoolId`).
- `super_admin` reconocido en AdminPanel y College Counseling. Ítem "Administración" en el sidebar para admin/super_admin.
- **Módulos por escuela** (`src/lib/schoolFeatures.js`): Vigilancias y College Counseling solo en High School.
- **Grados por escuela** (`src/lib/schoolGrades.js`) en Plan Semanal y Admin → Materias.
- Se probó un color de fondo por escuela y se descartó (no gustó).

---

## ✅ PROGRESO — SESIÓN 21 NOV 2026 (desde el PC)

**1. Datos por escuela (Tareas A, B, C, D)**
- `useStore` ahora acepta `{ userId, schoolId, schoolSlug }`. Mutations incluyen `school_id` y `teacher_id`.
- ✅ A: `addSubject()` guarda `school_id`; `savePlan()` guarda `teacher_id` y `school_id`.
- ✅ B: enlaces por escuela — clave `enlaces_<slug>` (ej. `enlaces_high_school`). Fallback a seed si no existe.
- ✅ C: `addCounselingSession()` guarda `school_id`.
- ✅ D: vigilancias por escuela — clave `main_<slug>` (ej. `main_high_school`).
- `loadAll` depende de `schoolSlug`: al cambiar de escuela en "Ver como", los datos se recargan automáticamente.
- ⚠️ Los datos de vigilancias guardados bajo `'main'` ya no se leen. Hay que re-subir el Excel en staging.

**2. Nueva vista: ¿Cómo va mi horario?**
- Componente `src/components/HorarioSemanal.jsx` con grilla semanal proporcional al tiempo real (1.5px/min).
- Línea de tiempo roja en vivo (actualiza cada 30s) mostrando la hora actual.
- Navegación de semanas con ‹ › (solo hacia adelante desde la semana actual). Fecha en cada columna.
- Horario de Sebastián cargado desde su Excel (`Horario_Sebastian_Beltran_2026-2027.xlsx`), incluyendo
  celdas mergeadas: Profundización (Mar P4–P6) y Proyecto 11° (Vie P4–P6) con rowSpan correcto.
- Barra "Buscar reemplazo" con modal (UI completa, pendiente conectar con horarios reales en BD).

**3. Eventos de coordinación en el horario (tabla `schedule_events`)**
- Nueva tabla `schedule_events` en Supabase staging con RLS (ver SQL en `supabase-staging-schema.sql`).
- Tab "Horario" en AdminPanel: crear, editar y borrar actividades (título, descripción, fecha, hora inicio +
  duración, alcance "Toda la escuela" vs cursos específicos con chips por grupo).
- Los eventos se superponen en la grilla del horario con overlay teal proporcional a su duración real.
- Si el evento cubre solo parte de un periodo, el overlay cubre exactamente esa fracción de la celda.
- Limpieza automática: al cargar, se borran eventos con fecha anterior a hoy (fire-and-forget, solo admins).
- Sección "Eventos de la semana" debajo de la grilla; navega con la semana visible.
- Eventos sincronizados al calendario del Dashboard (categoría `horario`, teal).
- Rol `director` (antes `coordinador`) puede crear/editar actividades; solo ve el tab Horario en AdminPanel.

**4. Rol `coordinador` → `director`**
- Renombrado en: `useAuth.js`, `Sidebar.jsx`, `RoleSwitcher.jsx`, `supabase-staging-schema.sql`.
- SQL ejecutado en staging para actualizar CHECK constraint, función `is_coordinator_or_above()`,
  política de `schedule_events` y política de `counseling_sessions`.
- Directores ven "Administración" en el sidebar pero solo el tab Horario.

**5. React Router (Fase 2.1) + Login obligatorio**
- Instalado `react-router-dom`. Rutas reales: `/`, `/horario`, `/planes`, `/counseling`, `/enlaces`, `/admin`.
- `src/App.jsx` refactorizado: `BrowserRouter` → `AppInner` con `useLocation`; routing por `<Routes>` y `<Route>`.
- `src/pages/LoginPage.jsx`: pantalla completa de login con logo CSM, email/contraseña y botón show/hide.
- `src/pages/PendingActivationPage.jsx`: pantalla para docentes con `active = false`.
- Flujo: sin sesión → `/login`; docente inactivo → pantalla pendiente; resto → app normal.
- `src/components/Sidebar.jsx` reescrito: usa `<Link>` y `useLocation`; sin `onNavigate`; sin botón login modal.
- `vercel.json` ya tenía `/* → index.html`; no se necesitaron cambios para el deploy.
- Modal `Login.jsx` ya no se usa (puede eliminarse en limpieza futura).

---

## 🔜 PRÓXIMA SESIÓN — Por dónde arrancar

**El login funciona. Ahora toca que cada docente vea solo sus propios datos:**

```
[ ] 1. LessonPlan.jsx: mostrar solo las materias asignadas al docente (tabla teacher_subjects)
       - Si no tiene materias asignadas: banner "El admin aún no ha asignado tus materias"
       - Toggle "Ver todas las materias del grado" para casos excepcionales
[ ] 2. AdminPanel: tab "Usuarios" para activar docentes y asignarles escuela + materias
       - Lista de usuarios pendientes (active = false)
       - Formulario: asignar school_id y materias (teacher_subjects)
[ ] 3. Crear usuarios de prueba en staging:
       - director@test.com (rol director, High School)
       - docente@test.com (rol docente, High School, con materias asignadas)
[ ] 4. Eliminar Login.jsx (modal viejo, ya no se usa)
[ ] 5. Sidebar: reemplazar ícono genérico por inicial del nombre del usuario
```

**Usuarios de prueba pendientes** (staging → Authentication → Users → Add user → "Auto Confirm User",
luego asignar rol y school_id en tabla `profiles`):
- `director@test.com` → rol `director`, school_id = High School
- `docente@test.com`  → rol `docente`, school_id = High School, active = true

---

## CREDENCIALES Y REFERENCIAS TÉCNICAS

### Repositorio
- **GitHub:** https://github.com/sebastianbeltran/csm-hub
- **Rama de desarrollo:** `develop`
- **Rama de producción:** `main`

### Supabase Producción (NO TOCAR durante desarrollo)
- **URL:** `https://ouzimolmsvflalvbnvff.supabase.co`
- **Anon key:** en Vercel → Production environment variables
- **Dashboard:** supabase.com → proyecto `csm-hub-high`

### Supabase Staging (aquí trabajamos)
- **URL:** `https://fnzbdlnngjxqdmwhhezd.supabase.co`
- **Anon key:** `sb_publishable_mltSaZwa9BA5FsEUot2JVg_VZMq1nr-`
- **Dashboard:** supabase.com → proyecto staging
- **Schema aplicado:** ✅ `supabase-staging-schema.sql` (20 nov 2026)

### Vercel
- **Producción:** https://csm-hub-high.vercel.app → rama `main` → Supabase producción
- **Preview:** rama `develop` → Supabase staging
- **Env vars Preview:** `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` con valores de staging

### Archivos clave del proyecto
- `.env.local` — credenciales de staging (nunca al repo)
- `supabase-staging-schema.sql` — schema completo, ya ejecutado en staging
- `DEPLOYMENT_TASKS.md` — este archivo

---

## DECISIONES TOMADAS (no reabrir sin motivo)

| Decisión | Detalle |
|---|---|
| Auth provider | Google SSO para producción. Email/contraseña para desarrollo hasta tener aval del colegio. |
| Multi-escuela | Tabla `schools` + `school_id` en todas las tablas relevantes desde el inicio |
| Roles | `super_admin`, `admin`, `coordinador`, `counselor`, `docente` |
| Onboarding docentes | Google SSO: se registran solos al primer login. Admin activa la cuenta asignando escuela y materias. |
| Planes sin dueño | Los 386 planes existentes en producción se migrarán asignándolos a `jbeltran2@csm.edu.co` como datos históricos |
| IDs de eventos | Cambiar de `Date.now()` a UUID generado por Supabase |
| Router | Instalar `react-router-dom` antes de empezar las vistas nuevas |
| Escuelas | Early Childhood, Primary School, Middle School, High School (tabla `schools`, ordenadas por `sort_order`) |
| Grados por escuela | Early Childhood: Prekínder, Kínder, Transición · Primary: 1°–5° · Middle: 6°–8° · High: 9°–11° (`src/lib/schoolGrades.js`). En BD se guardan como `prekinder`, `kinder`, `transicion`, `1`…`11` |
| Enlaces de interés | **Por escuela**: cada escuela tiene su propia lista (pendiente de implementar) |
| Lesson plan | **Por escuela**: materias y planes separados por `school_id` (pendiente de implementar) |
| Módulos por escuela | Vigilancias y College Counseling existen **solo en High School** (`src/lib/schoolFeatures.js`) |
| Vista previa de roles | El super_admin tiene una barra "Ver como" para cambiar de rol y escuela. Solo cambia la interfaz, no los permisos RLS |
| App en producción | Se mantiene en línea y funcional durante todo el desarrollo. Solo se toca cuando una fase completa esté probada en staging. |

---

> **Decisión confirmada:** El colegio usa **Google Workspace** con correos `@csm.edu.co`.
> La autenticación final será via **Google OAuth (SSO)** — pendiente aval del equipo de TI.
> Durante el desarrollo se usa email + contraseña con usuarios de prueba en staging.

---

## ESTADO ACTUAL DEL PROYECTO (punto de partida)

Antes de listar tareas, es importante entender qué existe hoy y cuáles son los riesgos reales:

- **Frontend:** React + Vite + Tailwind v4, desplegado en Vercel
- **Base de datos:** Supabase (PostgreSQL), plan gratuito
- **Auth:** Supabase Auth configurado SOLO para admin y counselor. El resto de la app es pública — cualquier persona con el URL puede acceder y leer toda la data
- **RLS (Row Level Security):** DESACTIVADO en todas las tablas. Hoy cualquier persona con el anon key puede leer y escribir todos los planes de todos los docentes desde cualquier cliente HTTP
- **Tabla `plans`:** No tiene `teacher_id`. Los planes no tienen dueño — no hay forma de saber a quién pertenece cada plan
- **Multi-escuela:** No existe ninguna separación por escuela. Toda la data es global
- **IDs de eventos:** Se generan con `Date.now()` en lugar de UUIDs de Supabase
- **Routing:** Basado en estado React (`useState`), no React Router. La única ruta real es `/admin`
- **Datos existentes:** 386 planes cargados desde Excel, sin teacher_id ni school_id

---

## ÍNDICE DE FASES

```
FASE 0 — Arquitectura y decisiones previas (hacer primero, bloquea todo lo demás)
FASE 1 — Base de datos y seguridad (crítico, antes de crear cualquier cuenta)
FASE 2 — Autenticación obligatoria y flujos de usuario
FASE 3 — Multi-escuela y perfiles por docente
FASE 3.5 — Builder de Horarios (admin crea y publica horarios de docentes desde la app)
FASE 4 — Funcionalidades nuevas (admin de escuela, director, gestión de usuarios)
FASE 5 — Calidad de código y robustez
FASE 5.5 — Seguridad técnica (auditoría OWASP, rate limiting, revisión de secretos)
FASE 6 — Performance y escalabilidad
FASE 7 — Infraestructura y deployment
FASE 8 — Legal y compliance (Colombia)
FASE 9 — Documentación
FASE 10 — Modelo comercial
FASE 11 — Capacitación y entrega (ocurre una vez el cliente compra el software)
```

---

## FASE 0 — ARQUITECTURA Y DECISIONES PREVIAS
> Estas decisiones deben tomarse ANTES de escribir una sola línea de código nuevo.
> Equivocarse aquí implica rehacer trabajo.

### 0.1 — Definir la estructura de las 4 escuelas
Decidir qué son exactamente las "4 escuelas":
- ¿Son 4 secciones/ciclos del mismo colegio (Preescolar, Primaria Ciclo 1, Primaria Ciclo 2, Bachillerato)?
- ¿Son 4 campus físicos diferentes con docentes completamente distintos?
- ¿Comparten algo entre sí (eventos globales, materias, etc.)?

**Impacto en arquitectura:** Si comparten eventos, se necesita el concepto de "eventos globales" vs "eventos por escuela". Si son completamente independientes, la separación es total.

### 0.2 — Definir el catálogo completo de roles
Hoy existen: `admin`, `counselor`, `docente`.

Propuesta para el sistema final:
- **`super_admin`** — Sebastián (tú). Acceso total a todas las escuelas. Puede crear admins.
- **`admin`** — Un coordinador/directivo por escuela. Gestiona su escuela: usuarios, eventos, vigilancias, materias.
- **`coordinador`** — Perfil intermedio dentro de una escuela. Puede ver todos los planes de los docentes de su escuela (read-only) y generar reportes, pero NO puede crear usuarios ni editar datos maestros.
- **`counselor`** — Acceso exclusivo a College Counseling. Puede existir uno o más por escuela.
- **`docente`** — Acceso básico. Ve solo sus propios planes, el calendario de su escuela, vigilancias de su escuela, enlaces, counseling (read-only).

**Decisión requerida:** ¿El "admin de escuela" puede o no puede crear usuarios? ¿O eso siempre lo hace el super_admin? Esto define si se necesita Edge Function de creación de usuarios o si se hace manualmente.

### 0.3 — Definir qué datos son por escuela vs globales
Propuesta:
- **Por escuela:** subjects, plans, vigilancias, counseling_sessions, perfiles de docentes, **enlaces de interés** ✅ (decidido 21 nov)
- **Globales o por escuela (a decidir):** events (¿el calendario es del colegio completo o por sección?), enlaces de interés
- **Siempre globales:** schools (la lista de escuelas en sí)

### 0.4 — Estrategia de onboarding de los 80 docentes ✅ DECIDIDO
**Google SSO (OAuth con Google Workspace)**

El colegio usa Google Workspace con correos `@csm.edu.co`. Los docentes autentican con su cuenta institucional existente — sin contraseñas nuevas, sin emails de invitación, sin setup adicional.

**Flujo completo:**
1. Docente entra a la app → clic en "Continuar con Google"
2. Google autentica (el docente ya tiene sesión de Google en su computador del colegio)
3. Supabase registra el usuario automáticamente en la tabla `auth.users` la primera vez
4. Un trigger de base de datos crea su fila en `profiles` con rol `docente` pendiente de activación
5. El admin de su escuela ve al docente en la lista de "pendientes" y le asigna escuela + materias
6. El docente puede usar la app completa

**Restricción de dominio (obligatoria):**
Un trigger en Supabase verifica que el email del OAuth sea `@csm.edu.co`. Si no lo es, se bloquea el acceso antes de crear el perfil.

**Lo que esto elimina del plan de desarrollo:**
- ~~Importación CSV de usuarios~~
- ~~Edge Function `create-user` y `import-users`~~
- ~~Flujo de recuperación de contraseña~~
- ~~`ResetPasswordPage.jsx`~~
- ~~`ForgotPasswordPage.jsx`~~
- ~~Emails de invitación personalizados~~
- ~~Setup de contraseña en el primer login~~

**Lo que sí requiere (coordinación con el colegio):**
- El administrador de Google Workspace del colegio debe habilitar que apps de terceros puedan autenticar con las cuentas institucionales (OAuth consent). Normalmente ya está habilitado por defecto en Google Workspace Education.

### 0.5 — Decidir qué pasa con los 386 planes existentes
Los planes actuales no tienen `teacher_id` ni `school_id`. Opciones:
- **Asignarlos al admin actual** (`jbeltran2@csm.edu.co`) como datos históricos
- **Marcarlos como "legacy"** (campo `is_legacy = true`) y hacerlos visibles solo al admin
- **Eliminarlos** y pedir a los docentes que re-suban sus planes

**Impacto:** La migración de la columna `teacher_id` debe elegir uno de estos caminos.

### 0.6 — Decidir si se agrega React Router
Hoy el routing es con `useState`. Con múltiples roles y vistas nuevas (setup de cuenta, reset de contraseña, etc.) se vuelve difícil de manejar sin un router real.

**Recomendación:** Agregar `react-router-dom` antes de empezar las fases 2-4. Rutas propuestas:
- `/` → Dashboard (requiere auth)
- `/planes` → Lesson Plan (requiere auth)
- `/counseling` → College Counseling (requiere auth)
- `/enlaces` → Enlaces (requiere auth)
- `/admin` → Admin Panel (requiere rol admin+)
- `/login` → Página de login (pública)
- `/recuperar-contrasena` → Forgot password (pública)
- `/reset-password` → Reset password (pública, con token en URL)
- `/setup` → First login setup (requiere auth, antes de usar la app)

---

## FASE 1 — BASE DE DATOS Y SEGURIDAD
> CRÍTICO. Ninguna cuenta de docente debe crearse hasta que esta fase esté completa.
> Un RLS mal configurado expone los datos de todos los docentes entre sí.

### 1.1 — Crear tabla `schools`
Nueva tabla para representar las 4 escuelas:

```sql
CREATE TABLE schools (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,           -- "High School"
  slug       TEXT UNIQUE NOT NULL,    -- "high_school"
  active     BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

Insertar las 4 escuelas como datos semilla (seed).

### 1.2 — Modificar tabla `profiles`
Agregar columnas faltantes:

```sql
ALTER TABLE profiles
  ADD COLUMN school_id  UUID REFERENCES schools(id),
  ADD COLUMN email      TEXT,
  ADD COLUMN active     BOOLEAN DEFAULT TRUE,
  ADD COLUMN last_login TIMESTAMPTZ;
```

Actualizar el `role` de las cuentas existentes:
- `jbeltran2@csm.edu.co` → pasar de `admin` a `super_admin`
- Crear un usuario `admin` de High School para el coordinador real

### 1.3 — Crear tabla `teacher_subjects`
Junction table para asignar materias a docentes:

```sql
CREATE TABLE teacher_subjects (
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id TEXT NOT NULL REFERENCES subjects(id)   ON DELETE CASCADE,
  PRIMARY KEY (teacher_id, subject_id)
);
```

### 1.4 — Modificar tabla `plans` — agregar teacher_id y school_id

```sql
ALTER TABLE plans
  ADD COLUMN teacher_id UUID REFERENCES auth.users(id),
  ADD COLUMN school_id  UUID REFERENCES schools(id);
```

**Importante:** No agregar NOT NULL todavía — primero migrar los datos existentes (tarea 1.14), luego agregar el constraint.

### 1.5 — Modificar tabla `events` — agregar school_id

```sql
ALTER TABLE events
  ADD COLUMN school_id UUID REFERENCES schools(id);
-- NULL = evento global visible para todas las escuelas
```

### 1.6 — Modificar tabla `subjects` — agregar school_id

```sql
ALTER TABLE subjects
  ADD COLUMN school_id UUID REFERENCES schools(id);
```

### 1.7 — Modificar tabla `counseling_sessions` — agregar school_id

```sql
ALTER TABLE counseling_sessions
  ADD COLUMN school_id UUID REFERENCES schools(id);
```

### 1.8 — Crear funciones auxiliares de RLS en Supabase
Estas funciones se usan dentro de las políticas RLS para no repetir lógica:

```sql
-- Retorna el school_id del usuario actual (desde la tabla profiles)
CREATE OR REPLACE FUNCTION auth.school_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT school_id FROM profiles WHERE id = auth.uid()
$$;

-- Retorna el rol del usuario actual
CREATE OR REPLACE FUNCTION auth.user_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$;

-- ¿Es el usuario admin o super_admin?
CREATE OR REPLACE FUNCTION auth.is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT auth.user_role() IN ('admin', 'super_admin')
$$;

-- ¿Es super_admin?
CREATE OR REPLACE FUNCTION auth.is_super_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT auth.user_role() = 'super_admin'
$$;

-- ¿Es el usuario coordinador o superior?
CREATE OR REPLACE FUNCTION auth.is_coordinator_or_above()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT auth.user_role() IN ('coordinador', 'admin', 'super_admin')
$$;
```

### 1.9 — Habilitar RLS en tabla `profiles`

```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Un usuario puede leer su propio perfil
CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  USING (id = auth.uid());

-- Admin puede leer perfiles de su escuela
CREATE POLICY "profiles_select_school_admin"
  ON profiles FOR SELECT
  USING (auth.is_admin() AND school_id = auth.school_id());

-- Super admin puede leer todos
CREATE POLICY "profiles_select_super_admin"
  ON profiles FOR SELECT
  USING (auth.is_super_admin());

-- Usuario puede actualizar su propio perfil (nombre, contraseña no aplica aquí)
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

-- Admin puede actualizar perfiles de su escuela
CREATE POLICY "profiles_update_admin"
  ON profiles FOR UPDATE
  USING (auth.is_admin() AND school_id = auth.school_id());

-- Solo super_admin puede crear perfiles (los crea la Edge Function)
CREATE POLICY "profiles_insert_super_admin"
  ON profiles FOR INSERT
  WITH CHECK (auth.is_super_admin());
```

### 1.10 — Habilitar RLS en tabla `plans`

```sql
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

-- Docente puede CRUD sus propios planes
CREATE POLICY "plans_select_own"
  ON plans FOR SELECT
  USING (teacher_id = auth.uid());

CREATE POLICY "plans_insert_own"
  ON plans FOR INSERT
  WITH CHECK (teacher_id = auth.uid() AND school_id = auth.school_id());

CREATE POLICY "plans_update_own"
  ON plans FOR UPDATE
  USING (teacher_id = auth.uid());

CREATE POLICY "plans_delete_own"
  ON plans FOR DELETE
  USING (teacher_id = auth.uid());

-- Coordinador/admin puede leer todos los planes de su escuela
CREATE POLICY "plans_select_coordinator"
  ON plans FOR SELECT
  USING (auth.is_coordinator_or_above() AND school_id = auth.school_id());

-- Super admin puede leer todo
CREATE POLICY "plans_select_super_admin"
  ON plans FOR SELECT
  USING (auth.is_super_admin());
```

### 1.11 — Habilitar RLS en tabla `events`

```sql
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Todos los autenticados leen eventos de su escuela + eventos globales (school_id IS NULL)
CREATE POLICY "events_select_authenticated"
  ON events FOR SELECT
  USING (auth.uid() IS NOT NULL AND (school_id IS NULL OR school_id = auth.school_id()));

-- Solo admin/super_admin pueden crear, editar y eliminar eventos
CREATE POLICY "events_insert_admin"
  ON events FOR INSERT
  WITH CHECK (auth.is_admin());

CREATE POLICY "events_update_admin"
  ON events FOR UPDATE
  USING (auth.is_admin());

CREATE POLICY "events_delete_admin"
  ON events FOR DELETE
  USING (auth.is_admin());
```

### 1.12 — Habilitar RLS en tabla `subjects`

```sql
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

-- Todos los autenticados leen materias de su escuela
CREATE POLICY "subjects_select_authenticated"
  ON subjects FOR SELECT
  USING (auth.uid() IS NOT NULL AND school_id = auth.school_id());

-- Solo admin puede crear/editar/eliminar materias
CREATE POLICY "subjects_insert_admin"
  ON subjects FOR INSERT
  WITH CHECK (auth.is_admin());

CREATE POLICY "subjects_update_admin"
  ON subjects FOR UPDATE
  USING (auth.is_admin());

CREATE POLICY "subjects_delete_admin"
  ON subjects FOR DELETE
  USING (auth.is_admin());
```

### 1.13 — Habilitar RLS en tabla `counseling_sessions`

```sql
ALTER TABLE counseling_sessions ENABLE ROW LEVEL SECURITY;

-- Counselor y admins de la misma escuela pueden CRUD
CREATE POLICY "counseling_select_staff"
  ON counseling_sessions FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND
    school_id = auth.school_id() AND
    auth.user_role() IN ('counselor', 'admin', 'super_admin', 'coordinador')
  );

CREATE POLICY "counseling_insert_counselor"
  ON counseling_sessions FOR INSERT
  WITH CHECK (
    school_id = auth.school_id() AND
    auth.user_role() IN ('counselor', 'admin', 'super_admin')
  );

CREATE POLICY "counseling_update_counselor"
  ON counseling_sessions FOR UPDATE
  USING (
    school_id = auth.school_id() AND
    auth.user_role() IN ('counselor', 'admin', 'super_admin')
  );

CREATE POLICY "counseling_delete_counselor"
  ON counseling_sessions FOR DELETE
  USING (
    school_id = auth.school_id() AND
    auth.user_role() IN ('counselor', 'admin', 'super_admin')
  );
```

### 1.14 — Habilitar RLS en tabla `vigilancias_config`

```sql
ALTER TABLE vigilancias_config ENABLE ROW LEVEL SECURITY;

-- Todos los autenticados de la escuela correspondiente pueden leer
-- (Los keys de vigilancias_config incluirán school_id como prefijo: 'main_high_school')
CREATE POLICY "vigilancias_select_authenticated"
  ON vigilancias_config FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "vigilancias_insert_admin"
  ON vigilancias_config FOR INSERT
  WITH CHECK (auth.is_admin());

CREATE POLICY "vigilancias_update_admin"
  ON vigilancias_config FOR UPDATE
  USING (auth.is_admin());
```

### 1.15 — Habilitar RLS en tabla `teacher_subjects`

```sql
ALTER TABLE teacher_subjects ENABLE ROW LEVEL SECURITY;

-- Un docente puede leer sus propias asignaciones de materias
CREATE POLICY "teacher_subjects_select_own"
  ON teacher_subjects FOR SELECT
  USING (teacher_id = auth.uid());

-- Admin puede leer las de su escuela (join con profiles para verificar school_id)
CREATE POLICY "teacher_subjects_select_admin"
  ON teacher_subjects FOR SELECT
  USING (
    auth.is_admin() AND
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = teacher_subjects.teacher_id
        AND p.school_id = auth.school_id()
    )
  );

-- Solo admin puede asignar/desasignar materias
CREATE POLICY "teacher_subjects_insert_admin"
  ON teacher_subjects FOR INSERT
  WITH CHECK (auth.is_admin());

CREATE POLICY "teacher_subjects_delete_admin"
  ON teacher_subjects FOR DELETE
  USING (auth.is_admin());
```

### 1.16 — Crear índices de performance en Supabase

```sql
CREATE INDEX idx_plans_teacher_id    ON plans(teacher_id);
CREATE INDEX idx_plans_school_week   ON plans(school_id, week_start);
CREATE INDEX idx_events_school_date  ON events(school_id, date);
CREATE INDEX idx_profiles_school     ON profiles(school_id);
CREATE INDEX idx_subjects_school_grade ON subjects(school_id, grade);
CREATE INDEX idx_counseling_school_date ON counseling_sessions(school_id, session_date);
CREATE INDEX idx_teacher_subjects_teacher ON teacher_subjects(teacher_id);
```

### 1.17 — Migración de datos existentes

Ejecutar scripts de migración en este orden:

1. **Crear la escuela "High School"** en la tabla `schools`
2. **Actualizar `subjects`** existentes: asignar `school_id = <id del High School>`
3. **Actualizar `events`** existentes: asignar `school_id = <id del High School>`
4. **Actualizar `counseling_sessions`** existentes: asignar `school_id = <id del High School>`
5. **Actualizar `plans`** existentes:
   - Asignar `school_id = <id del High School>`
   - Asignar `teacher_id = <id de jbeltran2>` (como datos históricos cargados por el admin)
6. Después de migrar, agregar constraints NOT NULL en `plans.teacher_id` y `plans.school_id`

### 1.18 — Cambiar generación de IDs en `addEvent`
Hoy: `id: Date.now().toString()`  
Cambiar a: eliminar el campo `id` del insert y dejar que Supabase use `DEFAULT gen_random_uuid()`

Verificar que la columna `id` de `events` sea `UUID DEFAULT gen_random_uuid()`. Si es TEXT, migrar a UUID o mantener como TEXT pero quitando el `Date.now()`.

### 1.19 — Auditoría de seguridad post-RLS
Una vez habilitado el RLS, hacer pruebas manuales con cuentas de cada rol:

- Crear cuenta de prueba con rol `docente`
- Verificar desde Supabase Dashboard > Table Editor que esa cuenta NO puede ver planes de otros docentes
- Desde la app, verificar que el anon key tampoco puede leer datos (desloguear y hacer fetch manual)
- Verificar que un docente no puede hacer INSERT en `events`
- Verificar que un admin solo ve datos de su escuela, no de otras escuelas
- Intentar pasar un `school_id` falso en un INSERT → debe fallar por la política

---

## FASE 2 — AUTENTICACIÓN OBLIGATORIA CON GOOGLE SSO
> La app deja de ser pública. Todo docente entra con su cuenta de Google `@csm.edu.co`.
> No hay contraseñas propias, no hay emails de invitación, no hay recuperación de contraseña.

### 2.1 — Instalar React Router
```bash
npm install react-router-dom
```

Refactorizar `App.jsx` para usar `<BrowserRouter>`, `<Routes>` y `<Route>`. Reemplazar el routing basado en `useState` por rutas reales. Configurar Vercel para que todas las rutas sirvan `index.html` (añadir `vercel.json` con rewrites si no existe).

**Rutas:**
- `/` → Dashboard (requiere auth)
- `/planes` → Lesson Plan (requiere auth)
- `/counseling` → College Counseling (requiere auth)
- `/enlaces` → Enlaces (requiere auth)
- `/admin` → Admin Panel (requiere rol admin+)
- `/login` → Página de login (pública)
- `/pendiente` → Pantalla "cuenta pendiente de activación" (requiere auth, perfil sin escuela asignada)

### 2.2 — Habilitar Google OAuth en Supabase
En Supabase Dashboard > Authentication > Providers > Google:

1. Activar el proveedor Google
2. Crear un proyecto en Google Cloud Console (`console.cloud.google.com`):
   - Crear OAuth 2.0 credentials (tipo "Web application")
   - Authorized redirect URI: `https://[proyecto].supabase.co/auth/v1/callback`
   - También agregar la URL de staging si existe
3. Copiar Client ID y Client Secret a Supabase
4. En Supabase Auth Settings > Site URL: `https://hub.csm.edu.co`
5. En Redirect URLs: agregar `https://hub.csm.edu.co/**` y la URL de Vercel preview

**Coordinación necesaria con el colegio:**
- El administrador de Google Workspace del colegio debe verificar que las cuentas `@csm.edu.co` pueden autenticarse en apps OAuth de terceros (en Google Workspace Admin Console > Security > API Controls)
- Normalmente está habilitado por defecto en Google Workspace Education, pero confirmarlo antes del lanzamiento

### 2.3 — Crear trigger en Supabase: restricción de dominio
Al autenticar con Google, Supabase crea el usuario en `auth.users`. Agregar un trigger que, en el momento del signup, verifique que el email termina en `@csm.edu.co`. Si no, eliminar el usuario recién creado y retornar error:

```sql
CREATE OR REPLACE FUNCTION restrict_to_csm_domain()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.email NOT LIKE '%@csm.edu.co' THEN
    RAISE EXCEPTION 'Solo se permiten cuentas del dominio @csm.edu.co';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_csm_domain
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION restrict_to_csm_domain();
```

### 2.4 — Crear trigger en Supabase: auto-creación de perfil al primer login
Cuando un docente se autentica por primera vez con Google, crear automáticamente su fila en `profiles`:

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role, active)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',  -- Google provee el nombre completo
    'docente',    -- rol por defecto
    false         -- inactivo hasta que el admin le asigne escuela y materias
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

**Flujo resultante:** El docente se autentica con Google → su perfil se crea con `active = false` y sin `school_id` → el admin lo ve en la lista de "pendientes de activación" → el admin le asigna escuela y materias → el perfil queda `active = true` → el docente puede usar la app.

### 2.5 — Crear `LoginPage.jsx` (página completa, reemplaza el modal)
Página limpia con:
- Logo CSM grande centrado
- Título "CSM Hub Docente"
- Sub-título de la escuela (si aplica)
- Botón único: **"Continuar con Google"** (con ícono de Google)
- Texto pequeño: "Usa tu cuenta institucional @csm.edu.co"
- Copyright CSM en el footer
- Colores institucionales (verde `#166534`)

El botón llama a:
```javascript
supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${window.location.origin}/`,
    hd: 'csm.edu.co'  // hint para Google: solo mostrar cuentas de este dominio
  }
})
```

El parámetro `hd` (hosted domain) hace que Google pre-seleccione solo cuentas `@csm.edu.co` en el selector de cuenta de Google.

### 2.6 — Crear `AuthGuard.jsx`
Componente que envuelve todas las rutas protegidas:
- Si no hay sesión → redirige a `/login`
- Si hay sesión pero `profile.active === false` → redirige a `/pendiente`
- Si hay sesión y `profile.active === true` → muestra el contenido

```jsx
<Route path="/" element={<AuthGuard><Dashboard /></AuthGuard>} />
```

### 2.7 — Crear `RoleGuard.jsx`
Componente que verifica roles:
```jsx
<Route path="/admin" element={
  <AuthGuard>
    <RoleGuard roles={['admin', 'super_admin']}>
      <AdminPanel />
    </RoleGuard>
  </AuthGuard>
} />
```

### 2.8 — Crear `PendingActivationPage.jsx`
Pantalla que ve el docente después de autenticarse con Google por primera vez, mientras el admin aún no le ha asignado escuela y materias:

- Mensaje: "Tu cuenta está siendo configurada"
- Instrucción: "El administrador de tu sección activará tu cuenta en breve. Si tienes urgencia, escríbele a [email del admin]"
- Botón "Cerrar sesión"
- Se actualiza automáticamente cuando el admin activa la cuenta (polling cada 30s o Supabase Realtime)

### 2.9 — Actualizar `useAuth.js` para Google SSO

```javascript
{
  user,           // objeto de Supabase Auth
  profile,        // fila de profiles: role, school_id, full_name, active
  authLoading,
  
  signInWithGoogle(),   // llama a signInWithOAuth con provider 'google'
  signOut(),
  updateProfile(fields),  // actualiza nombre u otros campos editables
  
  isAdmin,
  isSuperAdmin,
  isCoordinator,
  isCounselor,
  isDocente,
  isPending,       // true si active === false (esperando activación)
}
```

### 2.10 — Eliminar `Login.jsx` (el modal actual)
Una vez que `LoginPage.jsx` y Google SSO estén en su lugar:
- Eliminar `src/components/Login.jsx`
- Eliminar todos los `showLogin` / `setShowLogin` de `App.jsx`
- Limpiar el botón de "Iniciar sesión" del Sidebar (ya no tiene sentido — el login es en la LoginPage)

### 2.11 — Actualizar el Sidebar con información del usuario logueado
- Avatar con la foto de perfil de Google del docente (disponible via `user.user_metadata.avatar_url`)
- Si no hay foto: círculo verde con la inicial del nombre
- Nombre completo del docente (viene de Google)
- Sub-texto con el nombre de la escuela asignada
- Botón "Cerrar sesión" visible siempre al fondo del sidebar
- Opciones de Admin solo visibles para roles admin/super_admin

### 2.12 — Manejar cuenta inactiva (`active = false`)
Después del login de Google, antes de mostrar cualquier vista:
- Leer el perfil del usuario desde la tabla `profiles`
- Si `active = false` o `school_id IS NULL` → redirigir a `/pendiente` (tarea 2.8)
- Si `active = true` → mostrar la app normalmente

### 2.13 — Configurar JWT expiry
En Supabase Auth Settings:
- **JWT expiry:** Aumentar de 3600s (1h) a 28800s (8h) para que la sesión de Google no expire durante una jornada escolar completa
- Los tokens de Supabase se refrescan automáticamente vía `supabase-js`, pero un valor de 8h evita fricciones innecesarias

---

## FASE 3 — MULTI-ESCUELA Y PERFILES POR DOCENTE
> Cada docente pertenece a una escuela y solo ve los datos de esa escuela.

### 3.1 — Crear `useSchool.js` hook
Hook que expone el contexto de la escuela actual del usuario:

```javascript
const { schoolId, schoolName, schoolSlug } = useSchool()
```

Derivado del `profile.school_id` del usuario logueado. Usado por todos los componentes para filtrar queries.

### 3.2 — Actualizar `useStore.js` — queries filtradas por escuela y usuario

Cambios críticos:
- `events`: `.or('school_id.is.null,school_id.eq.${schoolId}')` — eventos globales + de la escuela
- `subjects`: `.eq('school_id', schoolId)`
- `plans`: para docentes → `.eq('teacher_id', userId)`; para coordinador/admin → `.eq('school_id', schoolId)`
- `counseling_sessions`: `.eq('school_id', schoolId)` (y solo para roles que tienen acceso)
- Pasar `userId` y `schoolId` como parámetros al hook (desde el contexto de auth)

### 3.3 — Actualizar `savePlan()` en useStore — incluir teacher_id y school_id

```javascript
const savePlan = async (plan) => {
  const row = {
    ...plan,
    teacher_id: user.id,      // NUEVO: ownership del plan
    school_id: schoolId,       // NUEVO: escuela del docente
    saved_at: new Date().toISOString()
  }
  // ... resto igual
}
```

Revisar también el upsert key: actualmente usa `id`. Verificar que el upsert no permita a un docente sobreescribir el plan de otro si el `id` coincide por casualidad.

### 3.4 — Actualizar `LessonPlan.jsx` — mostrar solo materias del docente

- Al cargar la vista, hacer query a `teacher_subjects` para obtener las materias del docente logueado
- Mostrar en el selector de materia solo las materias asignadas al docente por defecto
- Agregar toggle "Ver todas las materias del grado" para docentes que temporalmente necesiten ver otras materias
- Si el docente no tiene materias asignadas: mostrar banner "El administrador aún no ha asignado tus materias. Contacta al admin."

### 3.5 — Actualizar `Dashboard.jsx` — personalización por docente
- Saludo personalizado: "Bienvenido, [Nombre del docente]"
- Eventos filtrados por escuela (ya lo hace el nuevo useStore)
- En el widget de vigilancias: si el nombre del docente coincide con alguna vigilancia del día, resaltar esa fila
- Mostrar indicador de "Semana actual" en el plan semanal: si el docente ya llenó el plan de esta semana, mostrar check verde; si no, mostrar recordatorio

### 3.6 — Actualizar `AdminPanel.jsx` — scope por escuela
- El admin de una escuela solo ve datos de su escuela
- Reemplazar el check `role === 'admin'` por `role === 'admin' || role === 'super_admin'`
- Agregar filtro visual de escuela para el super_admin (puede cambiar la escuela que está viendo)
- El tab "Eventos" al crear un evento debe pre-seleccionar la escuela del admin como `school_id`
- El tab "Materias" solo muestra las materias de la escuela del admin
- El tab "Vigilancias" opera sobre los datos de vigilancias de la escuela del admin

### 3.7 — Actualizar `CollegeCounselor.jsx` — scope por escuela
- Queries filtradas por `school_id` (ya se hace en useStore con el cambio de tarea 3.2)
- Verificar que el botón de "nueva cita" solo aparece para `counselor`, `admin`, `super_admin`
- El `coordinador` puede ver sessions pero NO crear/editar/eliminar

### 3.8 — Adaptar vigilancias para multi-escuela
La tabla `vigilancias_config` usa IDs de texto como `'main'` y `'enlaces'`. Para multi-escuela, cambiar a IDs con prefijo de escuela: `'main_high_school'`, `'main_primaria'`, etc.

Actualizar `loadVigilancias()` y `saveVigilancias()` para incluir el school slug como parte del ID.

Actualizar el parser y el componente `ViglanciasHoy.jsx` para leer del key correcto según la escuela del usuario.

---

## FASE 3.5 — BUILDER DE HORARIOS
> Hoy los horarios están hardcodeados (un Excel parseado por docente). Esta fase los lleva a la BD y los hace gestionables desde la misma app.

### 3.5.1 — Tabla `schedule_slots` en Supabase
```sql
CREATE TABLE schedule_slots (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id  UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id   UUID REFERENCES schools(id),
  day_of_week INT NOT NULL,   -- 0=Lun, 4=Vie
  period_id   TEXT NOT NULL,  -- 'P1', 'P2', … 'DG', 'recreo'
  time_start  TEXT NOT NULL,
  time_end    TEXT NOT NULL,
  label       TEXT,           -- 'Proy 10A', '8B', etc.
  course      TEXT,           -- grupo objetivo: '10A', '8B' (para matching de eventos)
  grade       TEXT,
  is_ms       BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.5.2 — UI de builder para admin/coordinador
Grilla visual (días × periodos) donde el admin asigna clases a cada docente. Requisitos:
- Selector de docente (lista de docentes de la escuela)
- Grilla editable: click en celda → modal de asignación (label, course, grade)
- Indicador de conflictos: mismo docente en dos slots simultáneos
- Cambios se guardan como borrador hasta publicar

### 3.5.3 — Flujo borrador → publicado
Columna `published` en `schedule_slots`. Mientras `published = false`, el docente no ve el horario en "¿Cómo va mi horario?". El admin hace clic en "Publicar horario" → todos los slots pasan a `published = true`.

### 3.5.4 — Migrar MY_SCHEDULE hardcodeado a BD
Una vez que el builder esté listo, el horario de Sebastián (actualmente en `MY_SCHEDULE` de `HorarioSemanal.jsx`) se carga desde `schedule_slots` filtrando por `teacher_id = userId`. El componente recibe `scheduleSlots` como prop desde `useStore`.

### 3.5.5 — Reemplazos con disponibilidad real
Con los horarios en BD, `loadVigilancias` puede hacer una query real: "¿qué teachers tienen `schedule_slots.period_id = X` vacío en la fecha Y?" en vez del placeholder actual.

---

## FASE 4 — FUNCIONALIDADES NUEVAS (ADMIN, COORDINADOR, GESTIÓN DE USUARIOS)
> Las vistas y flujos que hacen la app viable para 80 docentes.

### 4.1 — AdminPanel: Tab "Usuarios" (nuevo)
Nueva pestaña en el AdminPanel para gestionar los docentes de la escuela:

**Vista de lista:**
- Tabla con columnas: Avatar/inicial · Nombre completo · Email · Rol · Materias asignadas · Último acceso · Estado (activo/inactivo)
- Paginación o scroll infinito (si hay más de 20 usuarios)
- Buscador por nombre o email
- Filtro por rol (docente, coordinador, counselor)
- Filtro por estado (activo, inactivo)
- Botón "Crear usuario"
- Botón "Importar CSV"

**Acciones por usuario (dropdown o botones inline):**
- Editar (nombre, rol, materias asignadas)
- Resetear contraseña (envía email)
- Desactivar / Reactivar cuenta
- Ver planes del docente (redirige a la vista de coordinador)

### 4.2 — Modal "Crear usuario" en AdminPanel
Formulario dentro de un modal:
- Nombre completo (requerido)
- Email institucional (requerido, validar formato)
- Rol: dropdown con opciones disponibles para el admin de esa escuela (no puede crear super_admin)
- Materias asignadas: multi-select con las materias de la escuela (filtrado por grado puede ayudar)
- Preview del email de invitación que recibirá
- Botón "Crear y enviar invitación"

Al crear:
- Si hay Edge Function (opción A del onboarding): llamar a la Edge Function `create-user`
- Si es manual (opción C): crear el usuario desde el Supabase Dashboard y luego desde la app asignar perfil y materias
- Mostrar confirmación con el email enviado
- Si el email falla (inválido, ya registrado): mostrar error claro con instrucciones

### 4.3 — Modal "Editar usuario" en AdminPanel
Similar al de creación:
- Puede cambiar: nombre, rol, materias asignadas, estado activo/inactivo
- NO puede cambiar el email (limitación de Supabase Auth sin service key — para cambiarlo, desactivar y crear nuevo)
- Botón "Resetear contraseña" → llama a `supabase.auth.resetPasswordForEmail(email)` y muestra confirmación
- Botón "Desactivar cuenta" → con confirmación (`¿Estás seguro? El docente perderá acceso inmediatamente.`)

### 4.4 — ~~Importación masiva de usuarios vía CSV~~ — NO APLICA (Google SSO)
Con Google SSO, los docentes se registran solos al hacer su primer login con Google. No se necesita crear cuentas manualmente ni importar CSV. El proceso de "aprovisionamiento" es:

1. El docente entra a la app y hace clic en "Continuar con Google"
2. El trigger crea su perfil automáticamente con `active = false`
3. El admin lo ve en la lista de pendientes y lo activa asignándole escuela y materias

**Lo que sí necesita el admin antes del lanzamiento:** tener la lista de materias cargada en la base de datos para poder asignarlas. Eso ya está parcialmente hecho (tarea 1.17 de migración de subjects existentes).

### 4.5 — ~~Supabase Edge Function `create-user`~~ — NO APLICA (Google SSO)
No se necesita — Supabase y el trigger de la tarea 2.4 manejan la creación automáticamente.

### 4.6 — Desactivar docente desde AdminPanel (sin Edge Function)
Con Google SSO, desactivar un usuario es simplemente actualizar `profiles.active = false`. No se necesita revocar tokens de Supabase Auth porque:
- El `AuthGuard` (tarea 2.6) verifica `active` en cada carga de la app
- Si un docente con sesión activa tiene su cuenta desactivada, la próxima vez que cargue la app verá la pantalla de cuenta desactivada

```javascript
// En useStore o useAuth:
const deactivateUser = async (userId) => {
  await supabase.from('profiles').update({ active: false }).eq('id', userId)
}
```

No se necesita Edge Function para esto.

### 4.7 — Vista "Resumen Semanal" para coordinador/admin
Nueva vista accesible desde el sidebar para roles `coordinador`, `admin`, `super_admin`:

- Selector de semana (week picker)
- Por semana seleccionada: tabla de todos los docentes con indicador:
  - ✅ Verde: ya subió su plan esta semana
  - ⚠️ Amarillo: plan parcial (algunos grados/materias faltantes)
  - ❌ Rojo: sin plan aún
- Contador global: "X de Y docentes han subido su plan"
- Click en un docente → navega a la vista de su plan (read-only)
- Botón "Exportar resumen" → PDF con la tabla completa

### 4.8 — Vista "Plan de docente" (read-only) para coordinador/admin
Cuando el coordinador hace click en un docente desde el Resumen Semanal:
- Muestra la vista del plan de ese docente, en modo lectura
- Puede filtrar por semana, materia, grado
- Botón "Exportar PDF" del plan del docente
- Breadcrumb: "Resumen Semanal > [Nombre del docente]"

### 4.9 — AdminPanel: Tab "Escuelas" (solo super_admin)
Visible únicamente para el super_admin:
- Lista de las 4 escuelas: nombre, slug, N docentes, N eventos, estado (activa/inactiva)
- Crear nueva escuela (para expansión futura)
- Editar nombre de escuela
- Desactivar escuela
- Ver estadísticas básicas de uso por escuela

### 4.10 — AdminPanel: Tab "Planes" para admin/coordinador
Nueva pestaña en el AdminPanel:
- Tabla de todos los planes de la escuela
- Filtros: docente, materia, grado, semana
- Columnas: docente, materia, grado, semana, fecha de último guardado
- Exportación masiva: todos los planes de una semana como ZIP de PDFs (uno por docente) o como un solo PDF consolidado

### 4.11 — Adaptar `ViglanciasHoy.jsx` para multi-escuela
- El componente debe leer vigilancias del `school_id` del usuario logueado
- Si hay nombre del docente logueado en las vigilancias del día, resaltarlo visualmente
- Para el super_admin: selector de escuela para ver vigilancias de cualquier escuela

### 4.12 — Selector de escuela para super_admin
El super_admin necesita poder cambiar la escuela que está viendo sin cambiar de cuenta:
- Dropdown en el header o sidebar: "Viendo: [Escuela]"
- Al cambiar la escuela, toda la data se recarga con el nuevo `school_id` seleccionado
- Esto afecta eventos, materias, planes visibles, usuarios, etc.
- El `school_id` del super_admin en su propio perfil no cambia, solo el "contexto de vista"

---

## FASE 5 — CALIDAD DE CÓDIGO Y ROBUSTEZ
> Un software profesional no solo funciona — maneja los errores con gracia.

### 5.1 — Crear `ErrorBoundary.jsx`
React Error Boundary genérico que captura errores en el render tree:

```jsx
class ErrorBoundary extends React.Component {
  // Muestra: icono de alerta + "Algo salió mal en esta sección"
  // + botón "Recargar página"
  // + detalles técnicos (en modo dev)
}
```

Envolver cada vista principal con su propio ErrorBoundary:
- `<ErrorBoundary key="dashboard"><Dashboard /></ErrorBoundary>`
- `<ErrorBoundary key="plans"><LessonPlan /></ErrorBoundary>`
- `<ErrorBoundary key="counselor"><CollegeCounselor /></ErrorBoundary>`
- `<ErrorBoundary key="admin"><AdminPanel /></ErrorBoundary>`

### 5.2 — Implementar loading skeletons por vista
Reemplazar el spinner global por skeletons específicos de cada vista:

**Dashboard skeleton:** Grilla de calendario con celdas grises + lista de eventos con líneas grises  
**LessonPlan skeleton:** Formulario con campos grises y texto placeholder  
**CollegeCounselor skeleton:** Tabla con 5 filas de placeholder grises  
**AdminPanel skeleton:** Tabla con 5 filas de placeholder grises  
**Sidebar:** Mostrar inicial gris mientras carga el nombre del usuario

Implementar con CSS `animate-pulse` de Tailwind sobre div con `bg-slate-200 rounded`.

### 5.3 — Sistema de notificaciones toast
Implementar un sistema de toast notifications (sin librería externa si es posible — es simple):

Eventos a notificar:
- ✅ "Plan guardado" — al hacer save en LessonPlan
- ✅ "Evento creado/actualizado/eliminado" — en AdminPanel
- ✅ "Usuario creado" — en AdminPanel > Usuarios
- ✅ "Contraseña de restablecimiento enviada"
- ✅ "Sesión de counseling guardada"
- ❌ "Error al guardar" (con mensaje del error de Supabase)
- ❌ "Sin conexión a la base de datos"

El toast debe:
- Aparecer en la esquina superior derecha
- Auto-desaparecer en 4 segundos
- Poder cerrarse manualmente
- Stack múltiples toasts si hay varios en simultáneo

### 5.4 — Confirmaciones de acciones destructivas
Reemplazar los `window.confirm()` (si existen) por modales propios:

Acciones que requieren confirmación:
- Eliminar evento del calendario
- Eliminar materia
- Eliminar sesión de counseling
- Desactivar cuenta de docente
- Eliminar enlace de interés

Modal de confirmación con:
- Descripción clara de qué se va a eliminar
- Consecuencias si aplica ("Esta acción no se puede deshacer")
- Botón "Cancelar" (prominente) y botón "Eliminar" (rojo, menos prominente visualmente)

### 5.5 — Validación de formularios
**LessonPlan:** Antes de hacer upsert, validar que al menos el campo "Actividades" no esté vacío. Si faltan campos requeridos, resaltar los campos con borde rojo y no hacer el save.

**AdminPanel > Eventos:** Validar título (requerido), fecha (requerida, no puede ser pasada más de 7 días), categoría.

**AdminPanel > Crear usuario:** Validar email (formato y dominio @csm.edu.co si aplica), nombre no vacío.

**Formularios de auth:** Contraseña mínimo 8 caracteres, confirmación de contraseña coincide.

### 5.6 — Mejorar manejo de errores en `useStore.js`
Problemas actuales:
- Si falla `events` query, el `catch` lanza el error y bloquea toda la app
- Si `counseling_sessions` falla, se silencia — el docente no sabe que esa sección está rota
- No hay distinción entre "error de red" y "error de permisos (RLS)"

Mejoras:
- Errores por sección, no un único error global
- Error de RLS (403) → "No tienes permisos para ver esta información"
- Error de red → "Sin conexión. Reintentando..." con retry automático
- Cada sección de la app puede mostrar su propio error sin bloquear las demás

### 5.7 — Corregir la vulnerabilidad del `supabase` null
En `src/lib/supabase.js`:

```javascript
// Actual (problemático):
export const supabase = (url && key) ? createClient(url, key) : null

// Si supabase es null y se llama supabase.from('plans'), lanza TypeError en runtime
// sin un mensaje útil para el usuario
```

Cambio propuesto: si las env vars faltan, hacer que el cliente retorne errores amigables en lugar de null, o lanzar en el render una pantalla clara de "App mal configurada - contactar al administrador" antes de hacer cualquier query.

### 5.8 — Estados vacíos con call-to-action
Para cada vista que puede estar vacía:

- **LessonPlan sin planes aún:** "Aún no has guardado ningún plan esta semana. Comienza seleccionando una materia →"
- **Dashboard sin eventos próximos:** "No hay eventos próximos en el calendario"
- **CollegeCounselor sin citas:** "No hay citas registradas para los filtros seleccionados"
- **AdminPanel > Usuarios sin docentes:** "No hay docentes en esta escuela todavía. Importa tu lista de docentes →"
- **LessonPlan sin materias asignadas:** "El administrador aún no ha asignado tus materias. Escríbele a [email admin]"

### 5.9 — Pantalla 404 y manejo de rutas inválidas
Agregar una ruta catch-all en React Router:

```jsx
<Route path="*" element={<NotFoundPage />} />
```

`NotFoundPage`: logo CSM + "Página no encontrada" + botón para ir al Dashboard.

### 5.10 — Revisar y unificar el manejo de fechas
El proyecto usa `date-fns` para fechas. Verificar consistencia en:
- Todas las fechas de Supabase vienen en ISO 8601 — verificar que `parseISO()` se usa siempre
- El `startOfToday()` para las fechas relativas (ya implementado en commits anteriores)
- El formato de `week_start` en plans: asegurarse de que siempre es `YYYY-MM-DD` (lunes de la semana)
- Zona horaria: Supabase guarda en UTC. Para Colombia (UTC-5), verificar que los eventos del calendario no se muestran desplazados un día

### 5.11 — Lazy loading de vistas pesadas con React.lazy
```javascript
const AdminPanel = React.lazy(() => import('./components/AdminPanel'))
const CollegeCounselor = React.lazy(() => import('./components/CollegeCounselor'))
const LessonPlan = React.lazy(() => import('./components/LessonPlan'))
```

Envolver en `<Suspense fallback={<SkeletonView />}>`. Reduce el bundle inicial.

### 5.12 — Linting y code style
- Verificar que oxlint está configurado correctamente (`oxlint.json` o config en `package.json`)
- Agregar reglas mínimas: no `console.log` en producción, no variables no usadas, no `any` si se agrega TS
- Agregar step de lint en el pipeline de CI/CD (Vercel build debe fallar si hay errores de lint)

---

## FASE 5.5 — SEGURIDAD TÉCNICA
> Verificar que la app es segura antes de ponerla en manos de 80 docentes con datos institucionales reales.

### 5.5.1 — Auditoría OWASP Top 10
Revisar los riesgos más comunes en aplicaciones web:
- **Broken Access Control:** verificar que un docente no puede leer ni modificar datos de otro (ya cubierto por RLS, pero verificar manualmente con una cuenta de prueba).
- **Injection:** Supabase usa consultas parametrizadas — verificar que no hay concatenación de strings en queries.
- **XSS:** revisar que no se usa `dangerouslySetInnerHTML` con contenido de usuario. Los campos de descripción en eventos/actividades deben sanitizarse si se renderizan como HTML.
- **Security Misconfiguration:** verificar que el modo debug de Vite no está activo en producción, y que las variables de entorno correctas están en cada ambiente.
- **Sensitive Data Exposure:** verificar que el `anon key` no tiene acceso a datos sin RLS (simular una petición directa a Supabase con solo el anon key y sin sesión).

### 5.5.2 — Rate limiting
Sin rate limiting, un atacante puede hacer miles de intentos de login o de peticiones a la API:
- Activar **rate limiting en Supabase Auth** (Dashboard → Auth → Rate limits): limitar intentos de login, sign-up, y envío de emails.
- Para las queries de datos, Supabase no tiene rate limiting nativo en el plan free — considerar agregar un límite en la Edge Function si se implementa alguna.
- Vercel tiene protección básica contra DDoS en todos los planes.

### 5.5.3 — Revisión del anon key y RLS
El `VITE_SUPABASE_ANON_KEY` es visible en el bundle del frontend. Esto es normal y esperado en Supabase — la seguridad viene del RLS, no de ocultar la key. Verificar:
- Hacer `fetch` directo a Supabase con solo el anon key (sin sesión) y confirmar que todas las tablas devuelven error 403 o `[]`.
- Especialmente: `plans`, `profiles`, `counseling_sessions` NO deben ser legibles sin sesión.
- Si alguna tabla devuelve datos: RLS no está activado o la política está mal.

### 5.5.4 — Headers de seguridad HTTP
(Ya detallado en tarea 7.10 — se consolida aquí como parte de la auditoría):
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY` (previene clickjacking)
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Content-Security-Policy` básico

Configurar en `vercel.json` bajo la sección `headers`.

### 5.5.5 — Revisión de secretos en el bundle de producción
Después de cada `npm run build`, verificar que el bundle NO contiene:
- El `service_role` key de Supabase (da acceso total sin RLS — nunca debe ir al frontend).
- Credenciales de terceros.

Procedimiento: `npm run build` → abrir `dist/assets/*.js` en un editor y buscar `service_role` o el JWT del service role.

### 5.5.6 — Política de sesiones
- **JWT expiry:** aumentar de 3600s (1h) a 28800s (8h) en Supabase Auth Settings para que la sesión dure una jornada escolar sin interrupciones.
- **Refresh tokens:** `supabase-js` los maneja automáticamente — verificar que el comportamiento en tabs inactivos es correcto.
- **Logout en todos los dispositivos:** cuando un docente reporta pérdida de dispositivo, el admin puede revocar su sesión desde Supabase Dashboard → Auth → Users.

### 5.5.7 — Logging de accesos sospechosos
Supabase registra logs de Auth en Dashboard → Logs → Auth. Revisar periódicamente:
- Intentos de login fallidos repetidos (posible brute force).
- Logins desde IPs fuera de Colombia.
- Creación masiva de usuarios.

Para alertas automáticas, considerar Sentry (tarea 7.8) con una regla para errores 401/403 masivos.

---

## FASE 6 — PERFORMANCE Y ESCALABILIDAD
> Con 80 docentes concurrentes, el sistema debe responder sin degradarse.

### 6.1 — Paginar la query de planes para coordinadores/admins
Con 80 docentes x ~20 planes cada uno = ~1,600 planes. La query actual trae todo de una vez.

Para la vista de coordinador (tarea 4.7), implementar:
- Paginación de servidor: `.range(from, to)` con Supabase
- O filtrado obligatorio por semana antes de ejecutar la query (lo más simple y efectivo)

Para docentes individuales la query es pequeña (sus propios 20 planes), no necesita paginación.

### 6.2 — Revisar configuración de Supabase Realtime
El proyecto actualmente NO usa Realtime (subscriptions). Verificar que no hay listeners de Realtime activos inadvertidamente, ya que consumen connections del plan gratuito.

Si se quiere agregar Realtime (ej. para que el coordinador vea en tiempo real cuando un docente guarda su plan), eso es un feature separado que consume recursos — decidir conscientemente.

### 6.3 — Connection pooling en Supabase
Verificar en el Dashboard de Supabase > Settings > Database que el modo de conexión está en "Transaction" o "Session" pooling para soportar múltiples usuarios concurrentes sin agotar las conexiones directas de PostgreSQL.

### 6.4 — Verificar límites del plan gratuito de Supabase
Plan Free de Supabase (a noviembre 2026):
- **MAU (Monthly Active Users):** 50,000 — suficiente para ~80 docentes
- **Database size:** 500MB — suficiente para esta app durante años
- **Storage:** 1GB — solo relevante si se sube archivos adjuntos
- **Edge Function invocations:** 500,000/mes — suficiente
- **Bandwidth:** 5GB/mes — monitorear si se hacen exports masivos de PDF

Si el colegio paga por la app: considerar plan Pro de Supabase ($25/mes) para backups automáticos más frecuentes y soporte prioritario.

### 6.5 — Optimizar el bundle de producción
```bash
npm run build
```

Verificar el output del build. Si algún chunk supera los 500KB:
- Verificar que `xlsx` (librería de Excel) se importa dinámicamente solo cuando se necesita (en el parser de vigilancias)
- Verificar que `date-fns` no importa todo el locale (usar `import { es } from 'date-fns/locale/es'` no `from 'date-fns/locale'`)

---

## FASE 7 — INFRAESTRUCTURA Y DEPLOYMENT
> Lo que hace que la app sea confiable a largo plazo.

### 7.1 — Configurar dominio personalizado en Vercel
Coordinar con el área de tecnología del colegio:
1. El colegio agrega un CNAME en su DNS: `hub.csm.edu.co → cname.vercel-dns.com`
2. En Vercel > Project Settings > Domains: agregar `hub.csm.edu.co`
3. Vercel emite automáticamente un certificado SSL (Let's Encrypt)
4. Tiempo de propagación del DNS: 24-48h
5. Actualizar `Site URL` en Supabase Auth con el nuevo dominio

### 7.2 — Auditar variables de entorno en Vercel
Ir a Vercel > Project > Settings > Environment Variables:
- `VITE_SUPABASE_URL` — verificar que está en producción
- `VITE_SUPABASE_ANON_KEY` — verificar que está en producción
- `VITE_APP_ENV=production` — agregar para habilitar/deshabilitar comportamientos por ambiente

**Variables que NUNCA deben estar en el frontend:**
- `SUPABASE_SERVICE_ROLE_KEY` — solo va en Supabase Secrets (para las Edge Functions)

### 7.3 — Configurar `vercel.json` para React Router
Sin esto, hacer refresh en `/planes` o `/admin` da 404 en Vercel:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### 7.4 — Personalizar templates de email en Supabase
Ir a Supabase Dashboard > Authentication > Email Templates:

**Invite (el más importante — lo reciben los 80 docentes):**
```
Asunto: Bienvenido a CSM Hub Docente — [Nombre del docente]
Cuerpo: Logo CSM + nombre + instrucciones claras para activar cuenta + botón verde "Activar mi cuenta"
```

**Reset Password:**
```
Asunto: Restablece tu contraseña — CSM Hub
Cuerpo: Logo CSM + botón verde "Restablecer contraseña" + expira en 1 hora
```

**Magic Link** (si se activa):
```
Asunto: Tu enlace de acceso — CSM Hub
```

Colores: verde `#166534`, tipografía limpia, en español, logo CSM en el header del email.

### 7.5 — Configurar rama de staging (opcional pero recomendado)
Crear rama `develop` en GitHub. Configurar en Vercel para que:
- `main` → deploya en producción (`hub.csm.edu.co`)
- `develop` → deploya en staging (`csm-hub-staging.vercel.app`)

El proyecto de Supabase de staging debería ser diferente al de producción para no contaminar datos reales durante el desarrollo. Crear un segundo proyecto en Supabase (plan gratuito) para staging.

### 7.6 — Configurar GitHub Actions para CI
Crear `.github/workflows/ci.yml`:

```yaml
name: CI
on: [push, pull_request]
jobs:
  lint-and-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm run lint
      - run: npm run build
```

Esto asegura que nada que rompa el build llega a producción.

### 7.7 — Monitoreo de uptime
Configurar UptimeRobot (plan gratuito):
- Monitor tipo HTTPS apuntando a `https://hub.csm.edu.co` (o el dominio final)
- Intervalo: cada 5 minutos
- Alertas por email a `juansbeltran1997@gmail.com` cuando el sitio esté caído
- Alertas por email al administrador del colegio también

### 7.8 — Monitoreo de errores con Sentry
Integrar Sentry (plan gratuito: 5,000 errores/mes):

```bash
npm install @sentry/react
```

```javascript
// main.jsx
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.VITE_APP_ENV,
  tracesSampleRate: 0.1,  // 10% de transacciones
})
```

Configurar alertas en Sentry para:
- Errores nuevos (nunca vistos antes)
- Errores que afectan a más de 5 usuarios
- Errores en el flujo de login

### 7.9 — Verificar configuración de backups en Supabase
Plan gratuito: backups Point-in-Time Recovery no está disponible. Solo hay backups diarios básicos.

Opciones:
- **Aceptar el riesgo** (para 80 docentes y datos no críticos, puede ser suficiente)
- **Upgrade a Pro** ($25/mes) para PITR (Point-in-Time Recovery de hasta 7 días)
- **Backup manual periódico** usando `pg_dump` via la conexión directa de Supabase (exportar semanalmente)

Recomendación: documentar la política de backups en el contrato con el colegio para que sea una decisión consciente de ambas partes.

### 7.10 — Headers de seguridad HTTP
Agregar a `vercel.json`:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-XSS-Protection", "value": "1; mode=block" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://*.supabase.co https://sentry.io; img-src 'self' data:; font-src 'self'"
        }
      ]
    }
  ]
}
```

Nota: el CSP puede requerir ajustes finos al probarlo en producción.

### 7.11 — Revisar que el service key NO está en el bundle
Después de cada build de producción, abrir las DevTools del navegador > Network > buscar el nombre del archivo JS principal > buscarlo en el contenido por `service_role` o `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9` (inicio típico de un JWT de Supabase).

Si aparece: hay una fuga de secreto crítica. El service key da acceso total y sin restricciones de RLS a toda la base de datos.

### 7.12 — Configurar Supabase Auth para permitir solo correos del colegio (opcional)
Si todos los docentes tienen correos `@csm.edu.co`, se puede configurar Supabase para rechazar registros con otros dominios a nivel de Auth. Esto se hace via un trigger de base de datos o en la Edge Function de creación de usuarios, no nativamente en Supabase Auth.

Recomendación: implementarlo en la Edge Function (no en el cliente) para que el rechazo sea server-side y no salteable.

---

## FASE 8 — LEGAL Y COMPLIANCE (COLOMBIA)
> Requisitos legales no negociables para operar una plataforma con datos de personas.

### 8.1 — Aviso de privacidad en la app
Agregar un link "Política de privacidad" en el footer del login y en el sidebar. El texto mínimo debe cubrir:
- Quién es el responsable del tratamiento de datos (el Colegio Santa María, no el desarrollador)
- Qué datos se recopilan: nombre, email, horario de vigilancias, planes de clase
- Para qué se usan: gestión interna docente
- Tiempo de retención: mientras dure la relación laboral
- Derechos del titular: acceder, corregir, suprimir sus datos (contacto: email del colegio)

### 8.2 — Autorización específica para datos de estudiantes menores
La sección de College Counseling guarda: nombre del estudiante, grado, fecha de cita, notas de sesión.

Requisitos:
- Los estudiantes son menores de edad → se requiere autorización de los padres para sistemas de información
- Verificar con la Rectoría / Secretaría si la autorización anual de datos del colegio ya cubre sistemas de información internos digitales
- Si no cubre: actualizar el formato de autorización de padres para el año lectivo siguiente
- En la app: agregar advertencia visible en la vista de Counseling: "Información confidencial — solo para uso del equipo de orientación"

### 8.3 — Acuerdo de tratamiento de datos entre el desarrollador y el colegio
Según la Ley 1581 de 2012, el colegio (Responsable del tratamiento) debe tener un contrato con el desarrollador (Encargado del tratamiento) que establezca:
- Qué datos maneja el desarrollador
- Que el desarrollador solo trata los datos según instrucciones del colegio
- Medidas de seguridad implementadas
- Qué pasa con los datos al terminar el contrato (entrega o eliminación)

Esto se puede incluir como cláusula dentro del contrato comercial principal.

### 8.4 — Registro de la base de datos en la SIC (si aplica)
La Ley 1581 exige registrar las bases de datos con datos personales ante la Superintendencia de Industria y Comercio (SIC).

Verificar con el colegio:
- ¿Ya tienen registro de bases de datos en la SIC?
- ¿La app es una nueva base de datos o una extensión de sistemas existentes?

Si se requiere registro nuevo: el colegio (no el desarrollador) es quien hace el registro. El desarrollador provee la información técnica de la base de datos.

### 8.5 — Términos de uso de la plataforma
Un documento breve que el docente acepta en el `SetupAccountPage` (primer login):
- El uso de la plataforma es exclusivamente para fines institucionales
- No compartir credenciales con otras personas
- El colegio puede auditar el uso de la plataforma
- Consecuencias del uso indebido (según el reglamento interno del colegio)

Checkbox en el SetupAccount: "He leído y acepto los Términos de uso y la Política de privacidad"

---

## FASE 9 — DOCUMENTACIÓN

### 9.1 — Manual del docente (PDF o web)
Documento de ~10 páginas con capturas de pantalla:
1. Cómo activar mi cuenta (primer login)
2. Cómo cambiar mi contraseña
3. Qué veo en el Dashboard y qué significa
4. Cómo llenar el plan semanal paso a paso
5. Cómo exportar mi plan en PDF (opciones: solo esta semana, toda la materia, todo el grado)
6. Qué son las vigilancias y cómo leerlas
7. Cómo ver las citas de college counseling (si aplica para todos)
8. Cómo ver los enlaces de interés
9. Qué hacer si tengo un problema (contacto del admin)

### 9.2 — Manual del administrador de escuela (PDF o web)
Documento de ~20 páginas:
1. Acceder al panel de administración
2. Crear usuarios uno por uno
3. Importar usuarios masivamente (CSV)
4. Asignar o cambiar materias de un docente
5. Crear y editar eventos del calendario
6. Gestionar categorías y prioridades de eventos
7. Subir el archivo de vigilancias (Excel)
8. Gestionar sesiones de college counseling
9. Desactivar una cuenta de docente
10. Resetear la contraseña de un docente
11. Ver el resumen semanal de planes
12. Exportar el resumen semanal en PDF
13. Gestionar los enlaces de interés

### 9.3 — Guía de onboarding para docentes (1 página)
Instrucciones simples para imprimir o enviar por email el día del lanzamiento:
```
1. Revisa tu correo institucional — recibirás una invitación de CSM Hub
2. Haz clic en el botón del email para activar tu cuenta
3. Define tu contraseña (mínimo 8 caracteres)
4. Revisa tus materias asignadas
5. Acepta los términos de uso
6. ¡Ya puedes usar el Hub!

¿Problemas? Escribe a: [email del admin]
URL: https://hub.csm.edu.co
```

### 9.4 — Video tutorial para docentes (Loom, 5-7 minutos)
Grabación en pantalla cubriendo:
- Login y primer acceso
- Llenar el plan de una semana
- Exportar el plan en PDF
- Ver el calendario y las vigilancias

El video puede reemplazar parte de la capacitación presencial y queda disponible como recurso permanente.

### 9.5 — README técnico actualizado en GitHub
El `README.md` del repositorio debe documentar:
```
## CSM Hub Docente
Stack, propósito, cómo correr en desarrollo.

## Variables de entorno requeridas
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_APP_ENV=development|production
VITE_SENTRY_DSN=... (opcional)

## Base de datos
Esquema completo de tablas y relaciones.
Instrucciones para correr las migraciones.

## Edge Functions
Cómo hacer deploy de las Edge Functions.

## Deploy
Cómo hacer deploy en Vercel.
```

### 9.6 — Documentación del esquema de base de datos
Un diagrama ER (Entity-Relationship) de todas las tablas y sus relaciones. Puede hacerse en:
- Supabase tiene un visualizador de esquema nativo (Database > Schema Visualizer)
- Exportar como imagen e incluir en el README o documentación del admin

---

## FASE 11 — CAPACITACIÓN Y ENTREGA
> Ocurre una vez el cliente compra el software. No iniciar antes.

### 10.1 — Período de prueba piloto
Antes del rollout masivo, hacer pruebas con un grupo reducido:
- Seleccionar 3-5 docentes voluntarios (preferiblemente de diferentes materias)
- Crear sus cuentas y acompañarlos en el primer login
- Pedir que usen la app durante 1 semana normal
- Recoger feedback específico: ¿qué no fue claro? ¿qué falló? ¿qué les gustó?
- Corregir los bugs y fricciones encontradas ANTES del rollout masivo

### 10.2 — Plan de rollout por fases
```
Semana -2: Capacitar a los administradores de cada escuela
Semana -1: Crear todas las cuentas, enviar invitaciones
Semana 0:  Sesión de onboarding con docentes (presencial o video)
Semana 1:  Primer uso masivo — soporte activo disponible
Semana 2:  Segunda semana — resolver dudas y bugs menores
Semana 4:  Retrospectiva — qué funciona bien, qué mejorar
```

### 10.3 — Sesión de capacitación para administradores
Sesión de ~2 horas (presencial o videoconferencia):
- Demo en vivo de todas las funciones del AdminPanel
- Crear un usuario de prueba en vivo durante la sesión
- Importar un CSV pequeño de prueba
- Gestionar un evento del calendario
- Subir el Excel de vigilancias
- Ver el resumen semanal
- Dejar tiempo para preguntas (mínimo 30 min)

### 10.4 — Sesión de onboarding para docentes
Sesión de ~45 minutos por grupo (máximo 25 docentes por sesión para poder atender preguntas):
- Mostrar las pantallas principales en proyector
- Cada docente hace su primer login durante la sesión
- Llenar un plan de ejemplo en conjunto
- Exportar el PDF
- Resolver dudas en tiempo real

### 10.5 — Canal de soporte post-lanzamiento
Definir y comunicar claramente:
- **Canal principal:** WhatsApp/Telegram del administrador de cada escuela (no directo al desarrollador)
- **Para bugs técnicos:** email al desarrollador con plazo de respuesta de 48h
- **Para urgencias (app caída):** contacto directo con plazo de respuesta de 4h en días hábiles
- Documentar quién escala qué tipo de problema

### 10.6 — Checklist de lanzamiento (go-live checklist)
Antes de enviar las invitaciones a los 80 docentes, verificar:
- [ ] RLS habilitado y verificado en todas las tablas
- [ ] Un docente de prueba no puede ver planes de otro
- [ ] Login obligatorio funciona
- [ ] Recuperación de contraseña funciona (envía email correctamente)
- [ ] Primer login / setup de cuenta funciona
- [ ] Emails de invitación tienen el branding correcto (logo CSM, en español)
- [ ] El dominio personalizado está activo y con SSL
- [ ] Sentry está recibiendo el test de error
- [ ] UptimeRobot está monitoreando
- [ ] Manual del docente está distribuido
- [ ] Los administradores fueron capacitados
- [ ] Los 80 usuarios están creados y sus materias asignadas
- [ ] Backups verificados

---

## FASE 10 — MODELO COMERCIAL

### 11.1 — Definir la propuesta de valor y precio
Recomendación de estructura de precios:

**Licencia Anual por Escuela** (recomendado):
- Incluye: acceso para N docentes de esa escuela por 1 año
- Incluye: X horas de soporte y cambios menores (definir cuántas)
- Incluye: 1 sesión de capacitación de administradores + 1 de docentes
- Excluye: nuevas funcionalidades grandes (se cotizan aparte)

**Pago único** (menos recomendado):
- Sin compromiso de soporte continuo
- El colegio queda dueño de la versión entregada
- Riesgo: quedan con un software sin mantenimiento

### 11.2 — Contrato de desarrollo y licencia de uso
Incluir en el contrato:
- **Propiedad intelectual:** el código fuente es tuyo (desarrollador), el colegio tiene licencia de uso, NO el código
- **Uso permitido:** solo para el Colegio Santa María, no pueden revenderlo ni compartirlo
- **Soporte:** N horas/mes incluidas, adicionales a [tarifa/hora]
- **Actualizaciones:** del ciclo lectivo (nuevo Excel de vigilancias, nuevo calendario) incluidas en el soporte
- **Nuevas funcionalidades:** se cotizan aparte como proyectos separados
- **Confidencialidad:** tú como desarrollador no revelarás datos del colegio
- **Terminación:** al terminar el contrato, el colegio recibe exportación completa de sus datos en formato estándar (CSV/JSON)
- **SLA (Service Level Agreement):**
  - Uptime comprometido: 99% (Vercel + Supabase tienen historial de >99.9%)
  - Bugs críticos (app caída): respuesta en 4h, resolución en 24h en días hábiles
  - Bugs menores: resolución en 72h
  - Mejoras menores solicitadas: estimación en 5 días hábiles

### 11.3 — Modelo de expansión a otras escuelas
Si el colegio quiere usar la app para las otras 3 escuelas/ciclos:
- El sistema ya está construido para multi-escuela desde la Fase 1
- El costo incremental es menor (no hay rediseño)
- Cobrar por escuela adicional, no por docente individual
- Esto es el verdadero valor del modelo multi-tenant

### 11.4 — Facturación y medios de pago
Definir:
- ¿Facturas como persona natural o empresa?
- ¿En pesos colombianos?
- ¿Cuotas? (50% al firmar, 50% al lanzar)
- ¿Retención de IVA? (el colegio como empresa retendrá el IVA)

---

## APÉNDICE A — RESUMEN DE CAMBIOS AL ESQUEMA DE BASE DE DATOS

```
Tabla nueva:
  schools (id, name, slug, active, created_at)

Tablas modificadas:
  profiles     → + school_id, + email, + active, + last_login; role agrega 'super_admin', 'coordinador'
  plans        → + teacher_id (FK auth.users), + school_id (FK schools)
  events       → + school_id (FK schools, nullable para globales)
  subjects     → + school_id (FK schools)
  counseling_sessions → + school_id (FK schools)

Tabla nueva:
  teacher_subjects (teacher_id FK, subject_id FK, PK compuesto)

RLS habilitado en: schools, profiles, plans, events, subjects, counseling_sessions, 
                   vigilancias_config, teacher_subjects

Funciones auxiliares nuevas:
  auth.school_id(), auth.user_role(), auth.is_admin(), 
  auth.is_super_admin(), auth.is_coordinator_or_above()
```

---

## APÉNDICE B — RESUMEN DE ARCHIVOS NUEVOS EN EL FRONTEND

```
src/
  pages/
    LoginPage.jsx               (reemplaza el modal Login.jsx — solo botón de Google)
    PendingActivationPage.jsx   (pantalla para docentes sin escuela asignada aún)
    NotFoundPage.jsx
    # ForgotPasswordPage.jsx    ← NO SE NECESITA (Google SSO)
    # ResetPasswordPage.jsx     ← NO SE NECESITA (Google SSO)
    # SetupAccountPage.jsx      ← NO SE NECESITA (Google SSO)
  components/
    AuthGuard.jsx
    RoleGuard.jsx
    ErrorBoundary.jsx
    Toast.jsx                   (sistema de notificaciones)
    ConfirmModal.jsx            (modal genérico de confirmación)
    Skeleton.jsx                (componentes de loading skeleton)
    UserAvatar.jsx              (foto de Google o inicial con color)
    AdminUserList.jsx           (tab Usuarios del AdminPanel)
    AdminActivateUserModal.jsx  (asignar escuela + materias a un docente pendiente)
    AdminEditUserModal.jsx      (editar rol y materias de un docente activo)
    WeeklySummaryView.jsx       (vista de coordinador)
    TeacherPlanReadOnly.jsx     (plan de docente en read-only para coordinador)
  hooks/
    useSchool.js                (contexto de escuela del usuario)
    useToast.js                 (sistema de toasts)
  # lib/supabase-edge.js        ← NO SE NECESITA (sin Edge Functions)
supabase/
  # functions/                  ← NO SE NECESITAN (Google SSO maneja creación)
  migrations/
    001_add_schools.sql
    002_add_school_id_to_all_tables.sql
    003_add_teacher_id_to_plans.sql
    004_create_teacher_subjects.sql
    005_enable_rls_and_policies.sql
    006_triggers_google_sso.sql   (restricción dominio + auto-creación de perfil)
    007_seed_schools.sql
    008_migrate_existing_data.sql
    009_create_indexes.sql
```

---

## APÉNDICE C — ESTIMACIÓN DE TIEMPOS

| Fase | Descripción | Estimado |
|------|-------------|----------|
| 0    | Decisiones de arquitectura | 2-3 días |
| 1    | Base de datos y RLS | 3-4 días |
| 2    | Auth con Google SSO ~~(antes: flujos de contraseña)~~ | 2-3 días |
| 3    | Multi-escuela y perfiles | 3-4 días |
| 4    | Gestión de usuarios y coordinador | 4-5 días |
| 5    | Calidad y robustez | 3-4 días |
| 6    | Performance | 1-2 días |
| 7    | Infraestructura | 2-3 días |
| 8    | Legal | 2-3 días (mayormente coordinación, no código) |
| 9    | Documentación | 2-3 días |
| 10   | Capacitación y entrega | 1 semana (con el colegio) |
| 11   | Modelo comercial | 1-2 días |
| **Total** | **Google SSO ahorró ~1 semana de desarrollo** | **~28-38 días hábiles** |

---

*Documento generado: noviembre 2026*  
*Proyecto: CSM Hub Docente — github.com/sebastianbeltran/csm-hub*
