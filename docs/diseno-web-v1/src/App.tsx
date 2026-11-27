import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react'

type Role = 'ADMINISTRADOR' | 'COCINERO' | 'ALMACENERO' | 'MOZO'
type Theme = 'light' | 'dark' | 'auto'
type View =
  | 'panel'
  | 'carta'
  | 'insumos'
  | 'compras'
  | 'mermas'
  | 'personal'
  | 'mesas'
  | 'profile'
type Modal = 'dish' | 'ingredient' | 'purchase' | 'waste' | 'count' | 'supplier' | 'employee' | 'table' | null

type Ingredient = {
  id: number
  name: string
  unit: string
  stock: number
  min: number
  cost: number
  type: string
  expiry: string
}
type Dish = { id: number; name: string; category: string; price: number; active: boolean; recipe: { ingredientId: number; qty: number }[]; sold: number }
type Movement = { id: number; ingredientId: number; type: 'COMPRA' | 'CONSUMO' | 'MERMA' | 'CONTEO'; qty: number; date: string; note: string }
type Supplier = { id: number; name: string; contact: string; prices: Record<number, number> }
type Employee = { id: number; name: string; email: string; role: Role; active: boolean; pin?: string }
type Table = { id: number; number: number; capacity: number; zone: string; status: 'Libre' | 'Ocupada' | 'Reservada' }
type Waste = { id: number; ingredientId: number; qty: number; reason: string; date: string }
type AppData = { ingredients: Ingredient[]; dishes: Dish[]; movements: Movement[]; suppliers: Supplier[]; employees: Employee[]; tables: Table[]; wastes: Waste[] }

const money = (n: number) => `S/ ${n.toFixed(2).replace('.', ',')}`
const today = new Date().toISOString().slice(0, 10)
const uid = () => Date.now()

const initialData: AppData = {
  ingredients: [
    { id: 1, name: 'Arroz', unit: 'kg', stock: 18.4, min: 8, cost: 4.8, type: 'Abarrotes', expiry: '2026-08-30' },
    { id: 2, name: 'Pechuga de pollo', unit: 'kg', stock: 6.2, min: 7, cost: 15.9, type: 'Proteínas', expiry: '2026-04-03' },
    { id: 3, name: 'Aceite vegetal', unit: 'l', stock: 9.5, min: 4, cost: 8.4, type: 'Abarrotes', expiry: '2026-11-18' },
    { id: 4, name: 'Ají amarillo', unit: 'kg', stock: 3.8, min: 2, cost: 12.5, type: 'Verduras', expiry: '2026-04-01' },
    { id: 5, name: 'Cebolla roja', unit: 'kg', stock: 11.2, min: 5, cost: 3.9, type: 'Verduras', expiry: '2026-04-06' },
    { id: 6, name: 'Papa amarilla', unit: 'kg', stock: 14, min: 6, cost: 5.2, type: 'Tubérculos', expiry: '2026-04-12' },
    { id: 7, name: 'Limón', unit: 'kg', stock: 4.1, min: 4.5, cost: 6.8, type: 'Frutas', expiry: '2026-04-02' },
  ],
  dishes: [
    { id: 1, name: 'Arroz con pollo', category: 'Fondos', price: 32, active: true, sold: 34, recipe: [{ ingredientId: 1, qty: .2 }, { ingredientId: 2, qty: .25 }, { ingredientId: 3, qty: .02 }, { ingredientId: 4, qty: .03 }, { ingredientId: 5, qty: .05 }] },
    { id: 2, name: 'Ají de gallina', category: 'Fondos', price: 34, active: true, sold: 28, recipe: [{ ingredientId: 2, qty: .22 }, { ingredientId: 6, qty: .25 }, { ingredientId: 4, qty: .04 }, { ingredientId: 5, qty: .05 }] },
    { id: 3, name: 'Causa limeña', category: 'Entradas', price: 24, active: true, sold: 21, recipe: [{ ingredientId: 6, qty: .28 }, { ingredientId: 2, qty: .12 }, { ingredientId: 4, qty: .02 }, { ingredientId: 7, qty: .03 }] },
    { id: 4, name: 'Pollo a la plancha', category: 'Fondos', price: 31, active: false, sold: 12, recipe: [{ ingredientId: 2, qty: .3 }, { ingredientId: 6, qty: .2 }, { ingredientId: 3, qty: .015 }] },
  ],
  movements: [
    { id: 1, ingredientId: 2, type: 'CONSUMO', qty: -3.4, date: today, note: 'Producción del día' },
    { id: 2, ingredientId: 1, type: 'COMPRA', qty: 15, date: '2026-03-28', note: 'Mercado Santa Anita' },
    { id: 3, ingredientId: 7, type: 'MERMA', qty: -.8, date: today, note: 'Deterioro' },
    { id: 4, ingredientId: 4, type: 'CONTEO', qty: -.3, date: '2026-03-29', note: 'Ajuste por conteo físico' },
  ],
  suppliers: [
    { id: 1, name: 'Mercado Santa Anita', contact: 'Rosa Quispe · 987 441 220', prices: { 1: 4.5, 2: 15.5, 3: 8.2, 5: 3.6 } },
    { id: 2, name: 'Distribuidora Andina', contact: 'Luis Pérez · 946 008 114', prices: { 1: 4.7, 2: 15.2, 3: 8.6, 4: 11.9, 6: 4.9 } },
    { id: 3, name: 'Frescos del Valle', contact: 'ventas@frescos.pe', prices: { 2: 16.1, 4: 11.5, 5: 3.8, 6: 5, 7: 6.3 } },
  ],
  employees: [
    { id: 1, name: 'Mariana Salazar', email: 'mariana@gastromind.pe', role: 'ADMINISTRADOR', active: true },
    { id: 2, name: 'Carlos Rojas', email: 'carlos@gastromind.pe', role: 'COCINERO', active: true },
    { id: 3, name: 'Lucía Torres', email: 'lucia@gastromind.pe', role: 'ALMACENERO', active: true },
    { id: 4, name: 'Diego Flores', email: 'diego@gastromind.pe', role: 'MOZO', active: true, pin: '2841' },
  ],
  tables: [
    { id: 1, number: 1, capacity: 4, zone: 'Salón', status: 'Ocupada' },
    { id: 2, number: 2, capacity: 2, zone: 'Terraza', status: 'Libre' },
    { id: 3, number: 3, capacity: 6, zone: 'Salón', status: 'Reservada' },
    { id: 4, number: 4, capacity: 4, zone: 'Terraza', status: 'Libre' },
    { id: 5, number: 5, capacity: 4, zone: 'Salón', status: 'Libre' },
    { id: 6, number: 6, capacity: 8, zone: 'Privado', status: 'Ocupada' },
  ],
  wastes: [
    { id: 1, ingredientId: 7, qty: .8, reason: 'Deterioro', date: today },
    { id: 2, ingredientId: 2, qty: .45, reason: 'Preparación', date: today },
    { id: 3, ingredientId: 6, qty: .6, reason: 'Sobras', date: '2026-03-29' },
  ],
}

const navByRole: Record<Role, View[]> = {
  ADMINISTRADOR: ['panel', 'carta', 'insumos', 'compras', 'mermas', 'personal', 'mesas'],
  COCINERO: ['panel', 'carta', 'insumos'],
  ALMACENERO: ['panel', 'insumos'],
  MOZO: ['panel', 'carta'],
}
const viewLabel: Record<View, string> = {
  panel: 'Panel',
  carta: 'Carta y recetas',
  insumos: 'Insumos y kardex',
  compras: 'Compras',
  mermas: 'Mermas y reportes',
  personal: 'Personal',
  mesas: 'Mesas',
  profile: 'Mi perfil',
}

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    panel: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    carta: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M4 5.5v16M8 7h8M8 11h6"/></>,
    insumos: <><path d="m12 3 9 5-9 5-9-5z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/></>,
    compras: <><path d="M3 5h2l2 11h11l2-8H6"/><circle cx="9" cy="20" r="1"/><circle cx="17" cy="20" r="1"/></>,
    mermas: <><path d="M12 2s6 7 6 12a6 6 0 0 1-12 0c0-5 6-12 6-12Z"/><path d="M9 15c.6 1.3 1.6 2 3 2"/></>,
    personal: <><circle cx="9" cy="8" r="4"/><path d="M3 21v-2a6 6 0 0 1 12 0v2M17 11a4 4 0 0 1 4 4v2"/></>,
    mesas: <><path d="M4 9h16v7H4zM7 5v4M17 5v4M7 16v4M17 16v4"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></>,
    plus: <path d="M12 5v14M5 12h14"/>,
    download: <><path d="M12 3v12m0 0 5-5m-5 5-5-5M5 21h14"/></>,
    chevron: <path d="m9 18 6-6-6-6"/>,
    edit: <><path d="m14 5 5 5L8 21H3v-5z"/><path d="m12 7 5 5"/></>,
    more: <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
    close: <path d="M6 6l12 12M18 6 6 18"/>,
    check: <path d="m5 12 4 4L19 6"/>,
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></>,
    moon: <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z"/>,
    logout: <><path d="M10 17l5-5-5-5M15 12H3"/><path d="M14 3h7v18h-7"/></>,
    arrow: <path d="m5 12 5 5L20 7"/>,
    filter: <path d="M4 5h16M7 12h10M10 19h4"/>,
  }
  return <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{paths[name] || paths.more}</svg>
}

function Brand({ compact = false }: { compact?: boolean }) {
  return <div className={`brand ${compact ? 'compact' : ''}`}>
    <svg className="brand-mark" viewBox="0 0 48 48" aria-label="GastroMind">
      <path d="M12 27c1.8-2.4 3-5.3 3-9A9 9 0 0 1 33 18c0 3.7 1.2 6.6 3 9H12Z" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinejoin="round"/>
      <path d="M19 31c.8 2.1 2.5 3.4 5 3.4s4.2-1.3 5-3.4" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round"/>
      <path d="M18 17.5 11 12M30 17.5l7-5.5M24 9V4" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"/>
      <circle cx="10" cy="11.5" r="3.2" fill="#F2A93B"/><circle cx="38" cy="11.5" r="3.2" fill="#F2A93B"/><circle cx="24" cy="3.5" r="3.2" fill="#F2A93B"/>
    </svg>
    {!compact && <span>Gastro<span>Mind</span></span>}
  </div>
}

function Button({ children, variant = 'primary', icon, type = 'button', onClick, disabled, className = '' }: { children: ReactNode; variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; icon?: string; type?: 'button' | 'submit'; onClick?: () => void; disabled?: boolean; className?: string }) {
  return <button className={`btn ${variant} ${className}`} type={type} onClick={onClick} disabled={disabled}>{icon && <Icon name={icon}/>}<span>{children}</span></button>
}

function Status({ active, children }: { active?: boolean; children: ReactNode }) {
  return <span className={`status ${active === false ? 'muted' : ''}`}><i />{children}</span>
}

function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`card ${className}`}>{children}</section>
}

function Empty({ query }: { query?: string }) {
  return <div className="empty"><div className="empty-icon"><Icon name="search" size={24}/></div><strong>No encontramos resultados</strong><p>{query ? `No hay coincidencias para “${query}”.` : 'Aún no hay registros para mostrar.'}</p></div>
}

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return <label className="field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>
}

function App() {
  const [authScreen, setAuthScreen] = useState<'login' | 'forgot' | 'reset'>('login')
  const [logged, setLogged] = useState(false)
  const [role, setRole] = useState<Role>('ADMINISTRADOR')
  const [view, setView] = useState<View>('panel')
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('gm-theme') as Theme) || 'light')
  const [data, setData] = useState<AppData>(() => {
    try { return JSON.parse(localStorage.getItem('gm-data') || '') } catch { return initialData }
  })
  const [modal, setModal] = useState<Modal>(null)
  const [toast, setToast] = useState('')
  const [loading, setLoading] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)

  useEffect(() => { localStorage.setItem('gm-data', JSON.stringify(data)) }, [data])
  useEffect(() => {
    localStorage.setItem('gm-theme', theme)
    const dark = theme === 'dark' || (theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches)
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
  }, [theme])
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        document.querySelector<HTMLInputElement>('[data-global-search]')?.focus()
      }
    }
    addEventListener('keydown', fn)
    return () => removeEventListener('keydown', fn)
  }, [])

  const navigate = (next: View) => {
    setLoading(true); setView(next); setMoreOpen(false)
    window.setTimeout(() => setLoading(false), 260)
  }
  const notify = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 3200)
  }
  const update = (next: AppData, message: string) => { setData(next); setModal(null); notify(message) }

  if (!logged) return <Auth screen={authScreen} setScreen={setAuthScreen} onLogin={() => setLogged(true)} theme={theme} setTheme={setTheme}/>

  const allowed = navByRole[role]
  const visibleView = view !== 'profile' && !allowed.includes(view) ? 'panel' : view
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="sidebar-brand"><Brand/><Brand compact/></div>
      <nav aria-label="Navegación principal">
        {allowed.map(item => <button key={item} className={visibleView === item ? 'active' : ''} onClick={() => navigate(item)} title={viewLabel[item]}><Icon name={item}/><span>{viewLabel[item]}</span></button>)}
      </nav>
      <div className="sidebar-help"><span>Centro de ayuda</span><strong>¿Necesitas soporte?</strong><button onClick={() => notify('Te conectaremos con soporte en breve.')}>Contactar soporte</button></div>
      <button className="user-card" onClick={() => navigate('profile')}><span className="avatar">MS</span><span><strong>Mariana Salazar</strong><small>{role}</small></span><Icon name="more"/></button>
    </aside>

    <main>
      <header className="topbar">
        <div className="mobile-brand"><Brand/></div>
        <div className="global-search"><Icon name="search"/><input data-global-search placeholder="Buscar en GastroMind..." onKeyDown={e => { if (e.key === 'Enter') notify(`Buscando “${e.currentTarget.value}” en todo GastroMind`) }}/><kbd>Ctrl K</kbd></div>
        <div className="top-actions">
          <button className="icon-btn" aria-label="Alertas" onClick={() => navigate('panel')}><Icon name="bell"/><i /></button>
          <button className="avatar-btn" onClick={() => navigate('profile')}>MS</button>
        </div>
      </header>
      <div className="page">
        <div className="page-head">
          <div><p className="eyebrow">GastroMind · Sede Miraflores</p><h1>{viewLabel[visibleView]}</h1><p>{pageSubtitle(visibleView)}</p></div>
          <div className="page-actions">{visibleView === 'panel' && <Button variant="secondary" icon="download" onClick={() => exportCsv(data)}>Exportar</Button>}{actionFor(visibleView, setModal)}</div>
        </div>
        {loading ? <PageSkeleton/> : <>
          {visibleView === 'panel' && <Dashboard data={data} navigate={navigate}/>}
          {visibleView === 'carta' && <MenuPage data={data} setData={setData} setModal={setModal} notify={notify}/>}
          {visibleView === 'insumos' && <Inventory data={data} setData={setData} setModal={setModal}/>}
          {visibleView === 'compras' && <Purchases data={data} setModal={setModal} notify={notify}/>}
          {visibleView === 'mermas' && <Reports data={data}/>}
          {visibleView === 'personal' && <People data={data} setData={setData} notify={notify}/>}
          {visibleView === 'mesas' && <Tables data={data} setModal={setModal}/>}
          {visibleView === 'profile' && <Profile role={role} setRole={(r) => { setRole(r); setView('panel') }} theme={theme} setTheme={setTheme} onLogout={() => setLogged(false)} reset={() => { setData(initialData); notify('Datos de ejemplo restaurados.') }}/>}
        </>}
      </div>
    </main>

    <nav className="bottom-nav">
      {allowed.slice(0, 4).map(item => <button key={item} className={visibleView === item ? 'active' : ''} onClick={() => navigate(item)}><Icon name={item}/><span>{viewLabel[item].split(' ')[0]}</span></button>)}
      <button className={moreOpen ? 'active' : ''} onClick={() => setMoreOpen(!moreOpen)}><Icon name="more"/><span>Más</span></button>
    </nav>
    {moreOpen && <div className="more-menu">{allowed.slice(4).map(item => <button key={item} onClick={() => navigate(item)}><Icon name={item}/>{viewLabel[item]}</button>)}<button onClick={() => navigate('profile')}><span className="avatar tiny">MS</span>Mi perfil</button></div>}
    {modal && <ModalForm type={modal} data={data} close={() => setModal(null)} update={update}/>}
    {toast && <div className="toast"><span><Icon name="check"/></span>{toast}</div>}
  </div>
}

function pageSubtitle(view: View) {
  const text: Record<View, string> = {
    panel: 'Así está funcionando tu restaurante hoy.',
    carta: 'Controla precios, recetas y rentabilidad por platillo.',
    insumos: 'Stock actualizado y trazabilidad de cada movimiento.',
    compras: 'Compra mejor con precios comparados por proveedor.',
    mermas: 'Encuentra diferencias y oportunidades para reducir costos.',
    personal: 'Administra roles y accesos de tu equipo.',
    mesas: 'Visualiza la distribución y disponibilidad del salón.',
    profile: 'Preferencias, apariencia y sesión.',
  }
  return text[view]
}

function actionFor(view: View, setModal: (m: Modal) => void) {
  const actions: Partial<Record<View, [string, Modal]>> = { carta: ['Nuevo platillo', 'dish'], insumos: ['Nuevo insumo', 'ingredient'], compras: ['Registrar compra', 'purchase'], mermas: ['Registrar merma', 'waste'], personal: ['Registrar empleado', 'employee'], mesas: ['Nueva mesa', 'table'] }
  const action = actions[view]
  return action ? <Button icon="plus" onClick={() => setModal(action[1])}>{action[0]}</Button> : null
}

function Auth({ screen, setScreen, onLogin, theme, setTheme }: { screen: 'login' | 'forgot' | 'reset'; setScreen: (s: 'login' | 'forgot' | 'reset') => void; onLogin: () => void; theme: Theme; setTheme: (t: Theme) => void }) {
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    if (screen === 'login') {
      if (!form.get('email') || !form.get('password')) return setError('Ingresa tu correo y contraseña.')
      onLogin()
    } else if (screen === 'forgot') setSent(true)
    else { setSent(true); window.setTimeout(() => setScreen('login'), 900) }
  }
  return <div className="auth">
    <div className="auth-visual">
      <Brand/>
      <div className="auth-message"><span className="auth-chip"><i/> Control operativo en tiempo real</span><h1>Decisiones más rentables, <em>todos los días.</em></h1><p>Costos, inventario y mermas conectados en un solo lugar para que tu equipo opere con claridad.</p></div>
      <div className="auth-stats"><div><strong>−18%</strong><span>mermas en 90 días</span></div><div><strong>+7,4%</strong><span>margen promedio</span></div></div>
      <small>© 2026 GastroMind</small>
    </div>
    <div className="auth-form-wrap">
      <button className="theme-login" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Cambiar tema"><Icon name={theme === 'dark' ? 'sun' : 'moon'}/></button>
      <form className="auth-form" onSubmit={submit}>
        <div className="auth-mobile-logo"><Brand/></div>
        {screen === 'login' && <><span className="form-kicker">BIENVENIDO DE NUEVO</span><h2>Ingresa a tu cuenta</h2><p>Continúa con la operación de tu restaurante.</p>
          {error && <div className="form-error">{error}</div>}
          <Field label="Correo electrónico"><input name="email" type="email" defaultValue="admin@gastromind.pe" placeholder="nombre@restaurante.pe"/></Field>
          <Field label="Contraseña"><input name="password" type="password" defaultValue="gastromind" placeholder="••••••••"/></Field>
          <div className="form-row"><label className="checkbox"><input type="checkbox" defaultChecked/> Mantener mi sesión</label><button type="button" className="link" onClick={() => { setScreen('forgot'); setSent(false) }}>Olvidé mi contraseña</button></div>
          <Button type="submit" className="full">Ingresar <span aria-hidden>→</span></Button>
          <p className="secure-note">Acceso seguro y cifrado para tu equipo.</p>
        </>}
        {screen === 'forgot' && <><button type="button" className="back-link" onClick={() => setScreen('login')}>← Volver al ingreso</button><span className="form-kicker">RECUPERAR ACCESO</span><h2>Olvidé mi contraseña</h2><p>Te enviaremos un enlace seguro para crear una nueva contraseña.</p>
          {sent ? <div className="success-panel"><span><Icon name="check"/></span><strong>Revisa tu correo</strong><p>Enviamos las instrucciones. El enlace vencerá en 30 minutos.</p><Button variant="secondary" onClick={() => setScreen('reset')}>Continuar</Button></div> : <><Field label="Correo electrónico"><input name="email" type="email" required placeholder="nombre@restaurante.pe"/></Field><Button type="submit" className="full">Enviar enlace</Button></>}
        </>}
        {screen === 'reset' && <><span className="form-kicker">NUEVA CONTRASEÑA</span><h2>Restablecer contraseña</h2><p>Crea una contraseña segura para volver a ingresar.</p>
          {sent ? <div className="success-panel"><span><Icon name="check"/></span><strong>Contraseña actualizada</strong><p>Ya puedes ingresar con tu nueva contraseña.</p></div> : <><Field label="Nueva contraseña" hint="Mínimo 8 caracteres, una mayúscula y un número."><input name="password" type="password" minLength={8} required/></Field><Field label="Confirmar contraseña"><input name="confirm" type="password" minLength={8} required/></Field><Button type="submit" className="full">Guardar contraseña</Button></>}
        </>}
      </form>
    </div>
  </div>
}

function Dashboard({ data, navigate }: { data: AppData; navigate: (v: View) => void }) {
  const dishCost = (dish: Dish) => dish.recipe.reduce((sum, row) => sum + (data.ingredients.find(i => i.id === row.ingredientId)?.cost || 0) * row.qty, 0)
  const sales = data.dishes.reduce((s, d) => s + d.sold * d.price, 0)
  const cost = data.dishes.reduce((s, d) => s + d.sold * dishCost(d), 0)
  const alerts = data.ingredients.filter(i => i.stock <= i.min || new Date(i.expiry).getTime() - Date.now() < 6 * 86400000)
  const weeks = [62, 73, 67, 82, 76, 91, 88]
  return <div className="dashboard">
    <div className="metrics">
      <Metric label="Ventas del día" value={money(sales)} delta="+8,2%" positive spark={[30,35,32,43,48,44,58]}/>
      <Metric label="Costo de insumos" value={money(cost)} delta="+2,1%" spark={[42,38,45,40,44,49,46]}/>
      <Metric label="% de costo" value={`${(cost / sales * 100).toFixed(1).replace('.', ',')}%`} delta="-1,4 p.p." positive spark={[55,52,48,46,44,43,40]}/>
    </div>
    <div className="dashboard-grid">
      <Card className="sales-chart">
        <CardHead title="Ventas y costo por semana" detail="Últimos 7 días" />
        <div className="chart-legend"><span><i className="green"/>Ventas</span><span><i className="soft"/>Costo</span></div>
        <div className="bar-chart">{weeks.map((h, i) => <div className="bar-col" key={i}><div className="bars"><i style={{ height: `${h}%` }}/><i style={{ height: `${h * .36}%` }}/></div><span>{['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'][i]}</span></div>)}</div>
      </Card>
      <Card className="top-dishes">
        <CardHead title="Platillos más vendidos" detail="Hoy" />
        <div className="rank-list">{[...data.dishes].sort((a,b) => b.sold-a.sold).slice(0,4).map((d,i) => <div key={d.id}><span className="rank">{i+1}</span><span><strong>{d.name}</strong><small>{d.sold} unidades</small></span><b>{money(d.sold*d.price)}</b></div>)}</div>
      </Card>
      <Card className="waste-chart">
        <CardHead title="Merma por motivo" detail="Este mes" />
        <div className="donut-wrap"><div className="donut"><strong>2,8%</strong><span>del consumo</span></div><div className="legend-list"><span><i style={{ background: '#0F3D2E' }}/>Preparación <b>42%</b></span><span><i style={{ background: '#2A7A5F' }}/>Deterioro <b>34%</b></span><span><i style={{ background: '#94B8A9' }}/>Sobras <b>24%</b></span></div></div>
      </Card>
      <Card className="alerts">
        <CardHead title="Alertas de hoy" detail={`${alerts.length} pendientes`} />
        {alerts.length ? <div className="alert-list">{alerts.slice(0,4).map(i => {
          const low = i.stock <= i.min
          return <button key={i.id} onClick={() => navigate('insumos')}><span className={`alert-symbol ${low ? 'danger' : ''}`}><Icon name={low ? 'insumos' : 'bell'}/></span><span><strong>{i.name}</strong><small>{low ? `Stock: ${i.stock} ${i.unit} · mínimo ${i.min} ${i.unit}` : `Vence el ${new Date(i.expiry).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}`}</small></span><Icon name="chevron"/></button>
        })}</div> : <div className="all-good"><Icon name="check"/><span><strong>Todo en orden</strong><small>No hay alertas pendientes.</small></span></div>}
        <button className="card-link" onClick={() => navigate('insumos')}>Ver todos los insumos →</button>
      </Card>
    </div>
  </div>
}

function CardHead({ title, detail }: { title: string; detail: string }) {
  return <div className="card-head"><div><h3>{title}</h3><p>{detail}</p></div><button aria-label="Más opciones"><Icon name="more"/></button></div>
}
function Metric({ label, value, delta, positive, spark }: { label: string; value: string; delta: string; positive?: boolean; spark: number[] }) {
  return <Card className="metric"><span>{label}</span><div><strong>{value}</strong><small className={positive ? 'positive' : ''}>{delta}</small></div><svg viewBox="0 0 120 38" preserveAspectRatio="none"><polyline points={spark.map((n,i) => `${i*20},${38-n*.55}`).join(' ')} fill="none" stroke="currentColor" strokeWidth="2"/><polyline points={`0,38 ${spark.map((n,i) => `${i*20},${38-n*.55}`).join(' ')} 120,38`} fill="currentColor" opacity=".08" stroke="none"/></svg></Card>
}

function MenuPage({ data, setData, setModal, notify }: { data: AppData; setData: (d: AppData) => void; setModal: (m: Modal) => void; notify: (s: string) => void }) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<number | null>(data.dishes[0]?.id || null)
  const dishes = data.dishes.filter(d => d.name.toLowerCase().includes(query.toLowerCase()) || d.category.toLowerCase().includes(query.toLowerCase()))
  const activeDish = data.dishes.find(d => d.id === selected)
  const dishCost = (dish: Dish) => dish.recipe.reduce((sum, row) => sum + (data.ingredients.find(i => i.id === row.ingredientId)?.cost || 0) * row.qty, 0)
  return <div className="split-layout">
    <Card className="table-card">
      <div className="toolbar"><div className="search-input"><Icon name="search"/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar platillo o categoría..."/></div><select><option>Todos los estados</option><option>Activos</option><option>Inactivos</option></select></div>
      {dishes.length ? <div className="data-table dish-table"><div className="tr th"><span>Platillo</span><span>Precio</span><span>Costo</span><span>Margen</span><span>% costo</span><span>Estado</span><span/></div>
        {dishes.map(d => { const cost = dishCost(d); return <button className={`tr ${selected === d.id ? 'selected' : ''}`} key={d.id} onClick={() => setSelected(d.id)}>
          <span data-label="Platillo"><strong>{d.name}</strong><small>{d.category}</small></span><span data-label="Precio">{money(d.price)}</span><span data-label="Costo">{money(cost)}</span><span data-label="Margen" className="margin">{money(d.price-cost)}</span><span data-label="% costo">{(cost/d.price*100).toFixed(1).replace('.', ',')}%</span><span data-label="Estado"><Status active={d.active}>{d.active ? 'Activo' : 'Inactivo'}</Status></span><span><Icon name="chevron"/></span>
        </button>})}</div> : <Empty query={query}/>}
    </Card>
    {activeDish && <Card className="detail-panel">
      <div className="detail-head"><div><span className="category-tag">{activeDish.category}</span><h2>{activeDish.name}</h2><Status active={activeDish.active}>{activeDish.active ? 'Activo' : 'Inactivo'}</Status></div><button onClick={() => notify('Edición rápida habilitada en los campos de la receta.')}><Icon name="edit"/></button></div>
      <div className="detail-metrics"><div><span>Precio</span><strong>{money(activeDish.price)}</strong></div><div><span>Costo</span><strong>{money(dishCost(activeDish))}</strong></div><div><span>Margen</span><strong>{money(activeDish.price-dishCost(activeDish))}</strong></div></div>
      <h3>Receta del platillo</h3>
      <div className="recipe-list"><div className="recipe-row head"><span>Insumo</span><span>Cantidad</span><span>Costo unit.</span><span>Subtotal</span></div>{activeDish.recipe.map(row => { const ing = data.ingredients.find(i => i.id === row.ingredientId)!; return <div className="recipe-row" key={row.ingredientId}><span>{ing.name}</span><span>{row.qty} {ing.unit}</span><span>{money(ing.cost)}</span><strong>{money(row.qty*ing.cost)}</strong></div>})}</div>
      <div className="recipe-total"><span>Costo total de receta</span><strong>{money(dishCost(activeDish))}</strong></div>
      <div className="detail-actions"><Button variant="secondary" icon="edit" onClick={() => setModal('dish')}>Editar platillo</Button><Button variant="ghost" onClick={() => { setData({ ...data, dishes: data.dishes.map(d => d.id === activeDish.id ? { ...d, active: !d.active } : d) }); notify(`Platillo ${activeDish.active ? 'desactivado' : 'activado'}.`) }}>{activeDish.active ? 'Desactivar' : 'Activar'}</Button></div>
    </Card>}
  </div>
}

function Inventory({ data, setData, setModal }: { data: AppData; setData: (d: AppData) => void; setModal: (m: Modal) => void }) {
  const [query, setQuery] = useState('')
  const [type, setType] = useState('TODOS')
  const [period, setPeriod] = useState('30')
  const [selected, setSelected] = useState(data.ingredients[0]?.id || 0)
  const list = data.ingredients.filter(i => i.name.toLowerCase().includes(query.toLowerCase()))
  const movements = data.movements.filter(m => m.ingredientId === selected && (type === 'TODOS' || m.type === type))
  const ing = data.ingredients.find(i => i.id === selected)
  return <div className="split-layout inventory-layout">
    <Card className="table-card">
      <div className="toolbar"><div className="search-input"><Icon name="search"/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar insumo..."/></div><select><option>Todos los tipos</option><option>Abarrotes</option><option>Proteínas</option><option>Verduras</option></select></div>
      {list.length ? <div className="data-table inventory-table"><div className="tr th"><span>Insumo</span><span>Stock actual</span><span>Mínimo</span><span>Costo</span><span>Vencimiento</span><span/></div>{list.map(i => <button className={`tr ${selected === i.id ? 'selected' : ''}`} key={i.id} onClick={() => setSelected(i.id)}><span data-label="Insumo"><strong>{i.name}</strong><small>{i.type}</small></span><span data-label="Stock actual" className={i.stock <= i.min ? 'stock-low' : ''}><strong>{i.stock} {i.unit}</strong>{i.stock <= i.min && <small>Bajo el mínimo</small>}</span><span data-label="Mínimo">{i.min} {i.unit}</span><span data-label="Costo">{money(i.cost)} / {i.unit}</span><span data-label="Vencimiento">{new Date(i.expiry).toLocaleDateString('es-PE')}</span><span><Icon name="chevron"/></span></button>)}</div> : <Empty query={query}/>}
    </Card>
    {ing && <Card className="detail-panel kardex">
      <div className="detail-head"><div><span className="category-tag">{ing.type}</span><h2>{ing.name}</h2><p>Stock actual: <strong className={ing.stock <= ing.min ? 'stock-low' : ''}>{ing.stock} {ing.unit}</strong></p></div><button onClick={() => setModal('count')}><Icon name="edit"/></button></div>
      <div className="kardex-actions"><Button variant="secondary" onClick={() => setModal('count')}>Registrar conteo</Button><Button variant="secondary" onClick={() => setModal('waste')}>Registrar merma</Button></div>
      <div className="subhead"><div><h3>Kardex</h3><p>Historial de movimientos</p></div></div>
      <div className="filters-row"><select value={period} onChange={e => setPeriod(e.target.value)}><option value="7">Últimos 7 días</option><option value="30">Últimos 30 días</option><option value="90">Últimos 90 días</option></select><select value={type} onChange={e => setType(e.target.value)}><option value="TODOS">Todos los tipos</option><option>COMPRA</option><option>CONSUMO</option><option>MERMA</option><option>CONTEO</option></select></div>
      {movements.length ? <div className="movement-list">{movements.map(m => <div key={m.id}><span className={`movement-icon ${m.type.toLowerCase()}`}><Icon name={m.qty > 0 ? 'plus' : 'arrow'}/></span><span><strong>{m.type[0]+m.type.slice(1).toLowerCase()}</strong><small>{m.note} · {new Date(m.date).toLocaleDateString('es-PE')}</small></span><b className={m.qty > 0 ? 'positive' : ''}>{m.qty > 0 ? '+' : ''}{m.qty} {ing.unit}</b></div>)}</div> : <Empty/>}
    </Card>}
  </div>
}

function Purchases({ data, setModal, notify }: { data: AppData; setModal: (m: Modal) => void; notify: (s: string) => void }) {
  const [ingredientId, setIngredientId] = useState(data.ingredients[1].id)
  const ingredient = data.ingredients.find(i => i.id === ingredientId)!
  const offers = data.suppliers.filter(s => s.prices[ingredientId]).sort((a,b) => a.prices[ingredientId]-b.prices[ingredientId])
  const suggested = data.ingredients.filter(i => i.stock < i.min * 1.5)
  return <div className="purchases-page">
    <div className="purchase-grid">
      <Card className="price-compare">
        <div className="section-title"><div><h3>Comparar precios por insumo</h3><p>Últimos precios registrados por proveedor</p></div><select value={ingredientId} onChange={e => setIngredientId(+e.target.value)}>{data.ingredients.map(i => <option value={i.id} key={i.id}>{i.name}</option>)}</select></div>
        <div className="offers">{offers.map((s,i) => <div key={s.id} className={i === 0 ? 'best' : ''}><span className="supplier-avatar">{s.name.split(' ').map(x => x[0]).slice(0,2).join('')}</span><span><strong>{s.name}</strong><small>{s.contact}</small></span><span><strong>{money(s.prices[ingredientId])} / {ingredient.unit}</strong>{i === 0 && <small className="best-label">Mejor precio</small>}</span><Button variant="secondary" onClick={() => notify(`Precio de ${s.name} guardado.`)}>Guardar precio</Button></div>)}</div>
      </Card>
      <Card className="suggestion">
        <CardHead title="Sugerencia de compra" detail="Basada en stock y consumo" />
        <div className="suggest-list">{suggested.map(i => {
          const provider = [...data.suppliers].filter(s => s.prices[i.id]).sort((a,b) => (a.prices[i.id]||999)-(b.prices[i.id]||999))[0]
          const qty = Math.max(i.min*2-i.stock, 1)
          return <div key={i.id}><span className={i.stock < i.min ? 'warning-dot danger' : 'warning-dot'}/><span><strong>{i.name}</strong><small>Stock {i.stock} {i.unit} · comprar {qty.toFixed(1)} {i.unit}</small></span><span><strong>{provider?.name || 'Sin proveedor'}</strong><small>Proveedor sugerido</small></span></div>
        })}</div>
        <Button className="full" onClick={() => setModal('purchase')}>Crear compra sugerida</Button>
      </Card>
    </div>
    <Card className="suppliers">
      <div className="section-title"><div><h3>Proveedores</h3><p>{data.suppliers.length} proveedores registrados</p></div><Button variant="secondary" icon="plus" onClick={() => setModal('supplier')}>Nuevo proveedor</Button></div>
      <div className="supplier-grid">{data.suppliers.map(s => <article key={s.id}><div><span className="supplier-avatar">{s.name.split(' ').map(x => x[0]).slice(0,2).join('')}</span><button><Icon name="more"/></button></div><h4>{s.name}</h4><p>{s.contact}</p><span>{Object.keys(s.prices).length} insumos cotizados</span></article>)}</div>
    </Card>
  </div>
}

function Reports({ data }: { data: AppData }) {
  const theoretical = data.dishes.reduce((s,d) => s + d.sold * d.recipe.reduce((x,r) => x + r.qty * (data.ingredients.find(i => i.id === r.ingredientId)?.cost || 0),0),0)
  const rows = data.ingredients.slice(0,5).map((i,idx) => ({ name: i.name, theoretical: [12.4,8.8,3.2,2.1,6.4][idx], real: [13.1,9.3,3.3,2.4,6.8][idx], unit: i.unit }))
  return <div className="reports">
    <div className="report-filters"><div className="segmented"><button className="active">Este mes</button><button>Mes anterior</button><button>Personalizado</button></div><Button variant="secondary" icon="download" onClick={() => exportCsv(data)}>Exportar reporte</Button></div>
    <div className="metrics report-metrics"><Metric label="Merma total" value={money(428.6)} delta="-12,4%" positive spark={[58,54,56,48,44,40,38]}/><Metric label="Merma sobre consumo" value="2,8%" delta="-0,6 p.p." positive spark={[52,48,46,45,41,39,36]}/><Metric label="Diferencia inventario" value={money(186.4)} delta="+0,3%" spark={[20,27,24,30,26,35,33]}/></div>
    <div className="report-grid">
      <Card><CardHead title="Merma por motivo" detail="Distribución del costo perdido"/><div className="horizontal-bars">{[['Preparación',42],['Deterioro',34],['Sobras',24]].map(([name,value]) => <div key={name}><span>{name}</span><div><i style={{ width: `${value}%` }}/></div><strong>{value}%</strong></div>)}</div></Card>
      <Card><CardHead title="Consumo teórico vs. real" detail={`Costo teórico: ${money(theoretical)}`}/><div className="comparison-list"><div className="comparison-row head"><span>Insumo</span><span>Teórico</span><span>Real</span><span>Diferencia</span></div>{rows.map(r => <div className="comparison-row" key={r.name}><strong>{r.name}</strong><span>{r.theoretical} {r.unit}</span><span>{r.real} {r.unit}</span><b>+{(r.real-r.theoretical).toFixed(1)} {r.unit}</b></div>)}</div></Card>
    </div>
  </div>
}

function People({ data, setData, notify }: { data: AppData; setData: (d: AppData) => void; notify: (s: string) => void }) {
  const [query, setQuery] = useState('')
  const people = data.employees.filter(e => e.name.toLowerCase().includes(query.toLowerCase()) || e.role.toLowerCase().includes(query.toLowerCase()))
  const toggle = (employee: Employee) => {
    if (confirm(`¿Confirmas que deseas ${employee.active ? 'desactivar' : 'activar'} el acceso de ${employee.name}?`)) {
      setData({ ...data, employees: data.employees.map(e => e.id === employee.id ? { ...e, active: !e.active } : e) })
      notify(`Acceso ${employee.active ? 'desactivado' : 'activado'} correctamente.`)
    }
  }
  return <Card className="table-card people-card">
    <div className="toolbar"><div className="search-input"><Icon name="search"/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar por nombre o rol..."/></div><select><option>Todos los roles</option>{Object.keys(navByRole).map(r => <option key={r}>{r}</option>)}</select></div>
    {people.length ? <div className="data-table people-table"><div className="tr th"><span>Empleado</span><span>Rol</span><span>Acceso</span><span>Estado</span><span>Acciones</span></div>{people.map(e => <div className="tr" key={e.id}><span data-label="Empleado" className="employee-cell"><span className="avatar">{e.name.split(' ').map(x=>x[0]).slice(0,2).join('')}</span><span><strong>{e.name}</strong><small>{e.email}</small></span></span><span data-label="Rol"><span className="role-tag">{e.role}</span></span><span data-label="Acceso">{e.role === 'MOZO' ? `PIN ••••` : 'Correo y contraseña'}</span><span data-label="Estado"><Status active={e.active}>{e.active ? 'Activo' : 'Inactivo'}</Status></span><span><button className={`switch ${e.active ? 'on' : ''}`} onClick={() => toggle(e)} aria-label="Cambiar acceso"><i/></button></span></div>)}</div> : <Empty query={query}/>}
  </Card>
}

function Tables({ data, setModal }: { data: AppData; setModal: (m: Modal) => void }) {
  const zones = ['Todos', ...new Set(data.tables.map(t => t.zone))]
  const [zone, setZone] = useState('Todos')
  const tables = data.tables.filter(t => zone === 'Todos' || t.zone === zone)
  return <div className="tables-page">
    <div className="tables-summary"><div><strong>{data.tables.filter(t=>t.status==='Libre').length}</strong><span>mesas libres</span></div><div><strong>{data.tables.filter(t=>t.status==='Ocupada').length}</strong><span>ocupadas</span></div><div><strong>{data.tables.reduce((s,t)=>s+t.capacity,0)}</strong><span>asientos totales</span></div></div>
    <div className="zone-tabs">{zones.map(z => <button className={zone === z ? 'active' : ''} onClick={() => setZone(z)} key={z}>{z}</button>)}</div>
    <div className="table-grid">{tables.map(t => <button className={`restaurant-table ${t.status.toLowerCase()}`} key={t.id} onClick={() => setModal('table')}><span>Mesa</span><strong>{t.number}</strong><small>{t.capacity} personas · {t.zone}</small><Status active={t.status === 'Libre'}>{t.status}</Status><i className="edit-table"><Icon name="edit"/></i></button>)}</div>
  </div>
}

function Profile({ role, setRole, theme, setTheme, onLogout, reset }: { role: Role; setRole: (r: Role) => void; theme: Theme; setTheme: (t: Theme) => void; onLogout: () => void; reset: () => void }) {
  return <div className="profile-page">
    <Card className="profile-card"><div className="profile-person"><span className="avatar large">MS</span><div><h2>Mariana Salazar</h2><p>mariana@gastromind.pe</p><Status>Cuenta activa</Status></div></div>
      <hr/><Field label="Rol para visualizar la plataforma"><select value={role} onChange={e => setRole(e.target.value as Role)}>{Object.keys(navByRole).map(r => <option key={r}>{r}</option>)}</select></Field><p className="field-note">El menú se adapta a los permisos del rol seleccionado.</p>
    </Card>
    <Card className="preferences"><h3>Apariencia</h3><p>Elige cómo se muestra GastroMind en este dispositivo.</p><div className="theme-options">{(['light','dark','auto'] as Theme[]).map(t => <button className={theme === t ? 'active' : ''} onClick={() => setTheme(t)} key={t}><span className={`theme-preview ${t}`}><i/><i/><i/></span><strong>{t === 'light' ? 'Claro' : t === 'dark' ? 'Oscuro' : 'Automático'}</strong>{theme === t && <Icon name="check"/>}</button>)}</div></Card>
    <Card className="profile-actions"><button onClick={reset}>Restaurar datos iniciales <span>→</span></button><button className="logout-button" onClick={onLogout}><span><Icon name="logout"/>Cerrar sesión</span><span>→</span></button></Card>
  </div>
}

function ModalForm({ type, data, close, update }: { type: Exclude<Modal, null>; data: AppData; close: () => void; update: (d: AppData, message: string) => void }) {
  const titles: Record<Exclude<Modal,null>, string> = { dish: 'Nuevo platillo', ingredient: 'Nuevo insumo', purchase: 'Registrar compra', waste: 'Registrar merma', count: 'Registrar conteo', supplier: 'Nuevo proveedor', employee: 'Registrar empleado', table: 'Nueva mesa' }
  const [role, setRole] = useState<Role>('COCINERO')
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    if (type === 'ingredient') {
      const ing: Ingredient = { id: uid(), name: String(f.get('name')), unit: String(f.get('unit')), stock: +String(f.get('stock')), min: +String(f.get('min')), cost: +String(f.get('cost')), type: String(f.get('kind')), expiry: String(f.get('expiry')) }
      update({ ...data, ingredients: [...data.ingredients, ing] }, 'Insumo creado correctamente.')
    } else if (type === 'purchase') {
      const ingredientId = +String(f.get('ingredient')); const qty = +String(f.get('qty')); const cost = +String(f.get('cost'))
      update({ ...data, ingredients: data.ingredients.map(i => i.id === ingredientId ? { ...i, stock: i.stock + qty, cost } : i), movements: [{ id: uid(), ingredientId, type: 'COMPRA', qty, date: today, note: `Compra a ${f.get('supplier')}` }, ...data.movements] }, 'Compra registrada. El stock y kardex fueron actualizados.')
    } else if (type === 'waste') {
      const ingredientId = +String(f.get('ingredient')); const qty = +String(f.get('qty')); const reason = String(f.get('reason'))
      update({ ...data, ingredients: data.ingredients.map(i => i.id === ingredientId ? { ...i, stock: Math.max(0, i.stock - qty) } : i), movements: [{ id: uid(), ingredientId, type: 'MERMA', qty: -qty, date: today, note: reason }, ...data.movements], wastes: [{ id: uid(), ingredientId, qty, reason, date: today }, ...data.wastes] }, 'Merma registrada. El stock y las alertas fueron actualizados.')
    } else if (type === 'count') {
      const ingredientId = +String(f.get('ingredient')); const physical = +String(f.get('qty')); const old = data.ingredients.find(i => i.id === ingredientId)?.stock || 0
      update({ ...data, ingredients: data.ingredients.map(i => i.id === ingredientId ? { ...i, stock: physical } : i), movements: [{ id: uid(), ingredientId, type: 'CONTEO', qty: +(physical-old).toFixed(2), date: today, note: 'Ajuste por conteo físico' }, ...data.movements] }, 'Conteo guardado y stock ajustado.')
    } else if (type === 'supplier') {
      update({ ...data, suppliers: [...data.suppliers, { id: uid(), name: String(f.get('name')), contact: `${f.get('contact')} · ${f.get('phone')}`, prices: {} }] }, 'Proveedor creado correctamente.')
    } else if (type === 'employee') {
      update({ ...data, employees: [...data.employees, { id: uid(), name: String(f.get('name')), email: String(f.get('email')), role, active: true, pin: role === 'MOZO' ? String(f.get('pin')) : undefined }] }, 'Empleado registrado y acceso habilitado.')
    } else if (type === 'table') {
      update({ ...data, tables: [...data.tables, { id: uid(), number: +String(f.get('number')), capacity: +String(f.get('capacity')), zone: String(f.get('zone')), status: 'Libre' }] }, 'Mesa creada correctamente.')
    } else if (type === 'dish') {
      const first = data.ingredients[0], second = data.ingredients[1]
      update({ ...data, dishes: [...data.dishes, { id: uid(), name: String(f.get('name')), category: String(f.get('category')), price: +String(f.get('price')), active: true, sold: 0, recipe: [{ ingredientId: first.id, qty: +String(f.get('qty1')) }, { ingredientId: second.id, qty: +String(f.get('qty2')) }] }] }, 'Platillo y receta creados correctamente.')
    }
  }
  return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) close() }}><div className="modal" role="dialog" aria-modal="true"><div className="modal-head"><div><p>NUEVO REGISTRO</p><h2>{titles[type]}</h2></div><button onClick={close} aria-label="Cerrar"><Icon name="close"/></button></div><form onSubmit={submit}>
    {type === 'ingredient' && <div className="form-grid"><Field label="Nombre del insumo"><input name="name" required placeholder="Ej. Tomate italiano"/></Field><Field label="Tipo"><select name="kind"><option>Abarrotes</option><option>Proteínas</option><option>Verduras</option><option>Frutas</option><option>Tubérculos</option></select></Field><Field label="Unidad"><select name="unit"><option>kg</option><option>g</option><option>l</option><option>ml</option><option>unidades</option></select></Field><Field label="Stock inicial"><input name="stock" type="number" step=".01" min="0" required/></Field><Field label="Stock mínimo"><input name="min" type="number" step=".01" min="0" required/></Field><Field label="Costo unitario"><div className="prefix-input"><span>S/</span><input name="cost" type="number" step=".01" min="0" required/></div></Field><Field label="Vencimiento"><input name="expiry" type="date" required/></Field></div>}
    {(type === 'purchase' || type === 'waste' || type === 'count') && <div className="form-grid"><Field label="Insumo"><select name="ingredient">{data.ingredients.map(i => <option value={i.id} key={i.id}>{i.name} · {i.stock} {i.unit}</option>)}</select></Field>{type === 'purchase' && <Field label="Proveedor"><select name="supplier">{data.suppliers.map(s => <option key={s.id}>{s.name}</option>)}</select></Field>}<Field label={type === 'count' ? 'Cantidad física' : 'Cantidad'}><input name="qty" type="number" step=".01" min="0.01" required/></Field>{type === 'purchase' && <Field label="Nuevo costo unitario"><div className="prefix-input"><span>S/</span><input name="cost" type="number" step=".01" min="0" required/></div></Field>}{type === 'waste' && <Field label="Motivo"><select name="reason"><option>Preparación</option><option>Deterioro</option><option>Sobras</option><option>Otro</option></select></Field>}</div>}
    {type === 'supplier' && <div className="form-grid"><Field label="Razón social"><input name="name" required/></Field><Field label="Persona de contacto"><input name="contact" required/></Field><Field label="Teléfono o correo"><input name="phone" required/></Field></div>}
    {type === 'employee' && <div className="form-grid"><Field label="Nombre completo"><input name="name" required/></Field><Field label="Correo"><input name="email" type="email" required/></Field><Field label="Rol"><select value={role} onChange={e => setRole(e.target.value as Role)}><option>ADMINISTRADOR</option><option>COCINERO</option><option>ALMACENERO</option><option>MOZO</option></select></Field>{role === 'MOZO' && <Field label="PIN del mozo" hint="4 dígitos para acceso rápido."><input name="pin" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} required/></Field>}</div>}
    {type === 'table' && <div className="form-grid"><Field label="Número de mesa"><input name="number" type="number" min="1" required/></Field><Field label="Capacidad"><input name="capacity" type="number" min="1" max="30" required/></Field><Field label="Zona"><select name="zone"><option>Salón</option><option>Terraza</option><option>Privado</option></select></Field></div>}
    {type === 'dish' && <div className="form-grid"><Field label="Nombre del platillo"><input name="name" required/></Field><Field label="Categoría"><select name="category"><option>Fondos</option><option>Entradas</option><option>Bebidas</option><option>Postres</option></select></Field><Field label="Precio de venta"><div className="prefix-input"><span>S/</span><input name="price" type="number" step=".01" required/></div></Field><div className="form-divider"><span>Receta inicial</span></div><Field label={data.ingredients[0].name + ' ('+data.ingredients[0].unit+')'}><input name="qty1" type="number" step=".001" required/></Field><Field label={data.ingredients[1].name + ' ('+data.ingredients[1].unit+')'}><input name="qty2" type="number" step=".001" required/></Field></div>}
    <div className="modal-actions"><Button variant="ghost" onClick={close}>Cancelar</Button><Button type="submit">Guardar</Button></div>
  </form></div></div>
}

function PageSkeleton() {
  return <div className="skeleton-page"><div className="skeleton-metrics"><i/><i/><i/></div><div className="skeleton-content"><i/><i/></div></div>
}

function exportCsv(data: AppData) {
  const rows = [['Insumo','Stock','Unidad','Costo'], ...data.ingredients.map(i => [i.name,String(i.stock),i.unit,String(i.cost)])]
  const blob = new Blob([rows.map(r => r.join(';')).join('\n')], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `gastromind-${today}.csv`; a.click(); URL.revokeObjectURL(a.href)
}

export default App
