# Frontend Learning Notes — Applikon

Reference file for learning progress. Each phase = key concepts, Java analogies, important files.

---

## Phase 1 — Ecosystem and Tools

### Tools — Analogies to Java

| Frontend | Java | What It Does |
|----------|------|---------|
| Node.js | JDK | Runtime environment — nothing works without it |
| npm | Maven | Fetches dependencies into `node_modules/`, runs scripts |
| package.json | pom.xml | List of dependencies + project configuration |
| node_modules/ | `~/.m2/repository` | Folder with downloaded libraries |
| Vite | Maven + Spring DevTools | Compiles code and runs dev server |
| TypeScript | Java | Statically typed language |
| JavaScript | Bytecode JVM | What browser actually understands |

### Ports — Remember

```
localhost:5432   →  PostgreSQL (database)
localhost:5173   →  Vite (frontend, dev server)
localhost:8080   →  Spring Boot (backend)
```

### How Vite Works

Vite runs **on your development machine** (not production server):
- compiles TypeScript + JSX → JavaScript
- runs HTTP server on `localhost:5173`
- browser asks that server for JS files and runs them locally

On production Vite doesn't exist. `npm run build` generates ready JS files to `dist/` folder, served by Nginx.

### JSX

JSX is not a separate language — it's **TypeScript syntax extension**, like annotations (`@RestController`, `@GetMapping`) are Java syntax extension. Without proper processor (Java: annotation processor, React: `@vitejs/plugin-react` plugin) compiler wouldn't know what to do.

JSX lets you write HTML-like code directly in TypeScript:
```tsx
return <div>Hello {name}</div>   // JSX — humans understand
```
Vite compiles it to plain JavaScript:
```js
React.createElement("div", null, "Hello " + name)  // JS — browser understands
```
**Browser doesn't understand JSX — only JavaScript.**

### File Extensions

| Extension | When to Use |
|---|---|
| `.ts` | Logic without JSX — hooks, services, types (`api.ts`, `useApplications.ts`) |
| `.tsx` | Components with JSX — anything that returns view (`App.tsx`, `LoginPage.tsx`) |

### Flow from Startup to UI

```
npm run dev
  → Vite starts server on localhost:5173
  → Browser opens localhost:5173
  → Vite serves index.html
  → Browser sees <script src="main.tsx">
  → Downloads and runs main.tsx
  → main.tsx finds <div id="root"> in index.html
  → React fills that div with entire app
  → You see UI on screen
```

**What is `<div id="root">` and how React fills it:**

`div` is invisible HTML container (like `JPanel` in Swing). At first it's empty — React fills it.
React is **not installed in browser**. It's in `node_modules/` and Vite bundles it with your code.
`main.tsx` runs: `createRoot(document.getElementById('root')).render(<App />)` — finds empty div and injects entire app.

**How screen changes (SPA) without page reload:**

React keeps current URL in JS memory. When you click tab or link:
1. React Router intercepts the click
2. Changes URL in address bar (no server request)
3. React replaces `<div id="root">` contents with different component

Browser **doesn't send** new `GET /dashboard`. React controls what you see.
Analogy: single `JFrame` (index.html) with swapped `JPanel`s inside.

### Key Project Files

**`applikon-frontend/package.json`**
Equivalent of `pom.xml`. `scripts` section = commands (dev, build, test). `dependencies` = production libraries. `devDependencies` = only during development (Vite, TypeScript, tests).

**`applikon-frontend/index.html`**
The ONLY HTML file in entire app. Contains empty `<div id="root">` — React injects whole app here. Contains `<script src="main.tsx">` — startup point.

**`applikon-frontend/src/main.tsx`**
Equivalent of `public static void main()`. Finds `<div id="root">` and runs React (`createRoot().render()`). `StrictMode` = debug mode (double-calls in dev, no effect on production).

**`applikon-frontend/src/App.tsx`**
App root — only routing and Providers, zero business logic. Provider pattern = wrapping components to make something globally available (like `@Bean` in Spring). Routing details in Phase 6, Providers in Phases 5 and 6.

### Provider Pattern (Preview)

```tsx
<QueryClientProvider>   ← provides React Query globally
  <BrowserRouter>       ← provides routing globally
    <AuthProvider>      ← provides user data globally
      <App />
    </AuthProvider>
  </BrowserRouter>
</QueryClientProvider>
```
Each layer "wraps" and provides something to all children inside.

---

## Phase 2 — Component — Basic Unit

### What Is a Component

Component = TypeScript function that returns JSX (UI description).

```tsx
export function LoginPage() {   // ← function = component
  return (                      // ← returns JSX
    <div className="login-page">
      ...
    </div>
  )
}
```

**Java analogy:** class with `render()` method — but written as function, not class.

### .tsx File — What's Inside

```
imports                     ← like import in Java
constants and helper functions  ← plain TypeScript
interfaces/types             ← data shape description (like DTO)
components                  ← functions returning JSX
```

`.tsx` vs `.ts` — only difference: `.tsx` lets you write JSX. Convention: components → `.tsx`, logic/hooks/types → `.ts`.

### JSX

JSX is **TypeScript syntax extension** (not separate language). Vite compiles it to plain JS:

```tsx
<div className="login-page">Hello</div>   // JSX — you write
React.createElement("div", { className: "login-page" }, "Hello")  // JS — browser gets
```

**Important:** in HTML you write `class=`, in JSX you write `className=` (because `class` is reserved in JS).

**Braces `{}` in JSX** = "this is TypeScript code, not text":
```tsx
<button onClick={handleGoogleLogin}>  ← {} = function reference
```

### Props — Component Input Data

Props = function parameters. Analogy: constructor in Java class.

```tsx
// Props description (like DTO in Java)
interface BadgeRowProps {
  badge: BadgeInfo | null
  count: number
  type: 'rejection' | 'ghosting'
}

// Component receiving props
function BadgeRow({ badge, count, type }: BadgeRowProps) {
  return <div>...</div>
}

// Usage — pass props
<BadgeRow badge={rejectionBadge} count={totalRejections} type="rejection" />
```

Component without props (`LoginPage`) = fetches data itself (e.g., via hooks).
Component with props (`BadgeRow`) = receives data from parent.

### export — Public/Private

```tsx
function BadgeRow(...)         // no export = private (this file only)
export function BadgeWidget()  // export = public (can import)
export default function App()  // default export = one main export per file
```

Analogy: `public`/`private` in Java.

### Import Components

```tsx
import { LoginPage } from './pages/LoginPage'   // like import in Java
```

Path without `.tsx` — TypeScript figures it out itself.

### Nesting Components

Components nest like matryoshka dolls. Parent wraps children, passes props:

```tsx
<BadgeWidget>          ← parent
  <BadgeRow ... />     ← child (used 2x with different props)
  <BadgeRow ... />
</BadgeWidget>
```

Entire app is one component tree — root in `App.tsx`:
```
App → AuthProvider → Routes → LoginPage / DashboardPage / ...
```

### How React Recognizes a Component

Component is function that:
1. Starts with **capital letter** — required, React demands it
2. Returns **JSX**

```tsx
function calculateProgress() { return 42 }    // regular function — lowercase
function LoginPage() { return <div>...</div> } // component — uppercase
```

`<div>` = HTML tag (lowercase). `<LoginPage>` = React component (uppercase). React tells them apart by this.

### Routing and Rendering

**Routing** = mapping URL → component. When URL changes, React Router decides what to show.
Analogy: `@GetMapping("/login")` in Spring MVC.

```tsx
<Route path="/login"     element={<LoginPage />} />   // /login → LoginPage
<Route path="/dashboard" element={<DashboardPage />} /> // /dashboard → DashboardPage
```

Import makes component available in file. Route decides when to show it.

**Rendering** = React calls component function → gets JSX → converts to HTML → inserts into `<div id="root">`.
Re-rendering = React calls function again when data changed, updates only changed parts. Details in Phase 3.

### Props — Details

Props are component arguments (word "props" = React standard, means the same).

```java
new BadgeRow(rejectionBadge, totalRejections, "rejection")  // Java — order matters
```
```tsx
<BadgeRow badge={rejectionBadge} count={totalRejections} type="rejection" />  // React — order irrelevant, name matters
```

### export default vs Named Export

```tsx
export function LoginPage() {}        // named export  → import { LoginPage } from '...'
export default function App() {}      // default export → import App from '...'
```

One file can have many named exports, but only one default.

### Key Files

- `src/pages/LoginPage.tsx` — simple component without props
- `src/components/badges/BadgeWidget.tsx` — two components in one file: `BadgeWidget` (public) + `BadgeRow` (private with props)
- `src/App.tsx` — app root, routing + component nesting

---

## Phase 3 — State and Re-rendering

### ✅ STATUS: UNDERSTOOD (Session 3 — 2026-03-13)

Jakub fully mastered `useState` and `useEffect`. 5/5 quiz for both concepts. Complete login flow in `AuthProvider.tsx` explained and understood.

---

### `useState` — Variable + Setter + Automatic Re-render

**Super sentence to remember:**
> `useState` = variable + setter + automatic re-render. When you call `setSearchQuery()`, React knows to run the whole component function again.

#### Java Analogy

**In Java (manual):**
```java
private String searchQuery = "";

public void onSearchChange(String newText) {
  searchQuery = newText;  // ← you change field
  repaint();              // ← YOU always remember to add
}
```

**In React (automatic):**
```tsx
const [searchQuery, setSearchQuery] = useState('');

const handleSearch = (newText) => {
  setSearchQuery(newText);  // ← React automatically re-renders
}
```

**Difference:** In Java you change field and manually call `repaint()`. In React `setState` does `repaint()` for you automatically.

#### How It Works (Flow)

1. User types "Google" in search box
2. Function called: `setSearchQuery('Google')`
3. React changes `searchQuery` internally
4. React automatically re-renders entire component function
5. `filteredApplications` (line 107 in `ApplicationTable.tsx`) recalculates with `searchQuery = 'Google'`
6. Table shows new results
7. All without manual `repaint()`

#### Why `useState` and Not Regular Variable?

```tsx
// ❌ WOULD BE WRONG
let searchQuery = '';
const setSearchQuery = (newValue) => {
  searchQuery = newValue  // ← React doesn't know something changed
  // UI won't re-render
}

// ✅ CORRECT
const [searchQuery, setSearchQuery] = useState('');
// React watches this variable and knows when it changes
```

`useState` is **observable** — React listens for changes and automatically re-renders.

#### Independent States

Each `useState` works independently:

```tsx
const [searchQuery, setSearchQuery] = useState('')        // state 1
const [statusFilter, setStatusFilter] = useState('ALL')   // state 2

// When you change statusFilter, searchQuery stays the same
setStatusFilter('IN_PROGRESS')  // ← only statusFilter changes
// searchQuery remains as it was
```

#### Practice from Project: `ApplicationTable.tsx`

Line 60:
```tsx
const [searchQuery, setSearchQuery] = useState('')
```

Line 252 (when user types):
```tsx
<input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
```

Lines 107-114 (filtering):
```tsx
const filteredApplications = applications.filter(app => {
  if (searchQuery) {  // ← uses searchQuery
    const matchesSearch = app.company.toLowerCase().includes(searchQuery.toLowerCase()) || ...
    if (!matchesSearch) return false
  }
  return true
})
```

---

### `useEffect` — Code That Must Execute "On Startup"

**Java Analogy:**
```java
@Component
public class AuthService {
  @PostConstruct  // ← run once when bean is created
  public void init() {
    System.out.println("Initializing AuthService");
  }
}
```

```tsx
function AuthProvider() {
  useEffect(() => {
    console.log("Initializing component");
  }, [])  // ← empty array = run once when component appears
}
```

**`@PostConstruct` in Java ≈ `useEffect(..., [])` in React**

#### Dependency Array — Three Scenarios

```tsx
// 1. useEffect(..., [])
// Runs once when component appears on screen
useEffect(() => {
  console.log("Once!")
}, [])

// 2. useEffect(...)
// Runs after EVERY render — dangerous!
useEffect(() => {
  console.log("After every render!")
})

// 3. useEffect(..., [user])
// Runs when user changes
useEffect(() => {
  console.log("user changed!")
}, [user])
```

#### Problem: Infinite Loop

```tsx
// ❌ INFINITE LOOP
useEffect(() => {
  setUser({ name: 'Jan' })
}, [user])  // ← React watches user

// Flow:
// 1. useEffect runs
// 2. setUser changes user
// 3. React sees user changed (because [user] in dependencies)
// 4. useEffect runs again
// 5. setUser runs again
// 6. user changes again...
// LOOP 💥
```

```tsx
// ✅ CORRECT — no loop
useEffect(() => {
  setUser({ name: 'Jan' })
}, [])  // ← [] says "I don't watch anything"

// Flow:
// 1. useEffect runs once
// 2. setUser changes user
// 3. React watches [] — no user in dependencies
// 4. useEffect doesn't run again
// 5. No loop ✅
```

#### Practice from Project: `AuthProvider.tsx` (Lines 37-53)

```tsx
useEffect(() => {
  // STEP 1: Check token in localStorage
  const token = getToken()  // line 40

  if (!token) {  // lines 41-43
    setIsLoading(false)    // "no token, done waiting"
    return
  }

  // STEP 2: If token exists, fetch user data from API
  fetchCurrentUser()  // line 46
    .then(setUser)    // line 47: if OK → setUser
    .catch(() => {
      clearToken()    // line 50: token invalid
    })
    .finally(() => setIsLoading(false))  // line 52: done
}, [])  // ← run once on startup
```

**Three Scenarios:**

1. **Token Valid:**
   ```
   getToken() → OK → fetchCurrentUser() → setUser(userData) → logged in ✅
   ```

2. **No Token:**
   ```
   getToken() → null → setIsLoading(false), return → not logged in ❌
   ```

3. **Token Expired (Invalid):**
   ```
   getToken() → OK → fetchCurrentUser() → error 401 → clearToken() → not logged in ❌
   ```

---

### Quiz — Results

| Question | Jakub's Answer | Grade |
|---------|---|---|
| Why `useState` instead of regular variable? | React listens for change, change via `set`, re-renders everything | ✅ |
| What does `setSearchQuery` do? | Sets value and renders | ✅ |
| What is re-rendering? | React runs entire component function again | ✅ |
| Does changing `statusFilter` change `searchQuery`? | No, each `useState` is independent | ✅ |
| Does `value={searchQuery}` always reflect state? | Yes, field keeps listening to `searchQuery` changes | ✅ |
| What does `[]` in `useEffect` mean? | Dependency array — run once on startup | ✅ |
| What without `[]`? | Infinite loop | ✅ |
| What with `[user]` in auth? | Infinite loop — `setUser` changes `user`, which triggers `useEffect` | ✅ |
| Why is `[]` correct in `AuthProvider`? | `[]` says "I don't watch anything", so `setUser` doesn't trigger `useEffect` again | ✅ |

**Summary:** 9/9 Quiz ✅ — complete understanding of `useState` and `useEffect`

---

### Key Files

- `src/components/applications/ApplicationTable.tsx` — practice with `useState` (searchQuery, statusFilter, sortField)
- `src/auth/AuthProvider.tsx` — practice with `useEffect` (check token on startup)
- `src/services/api.ts` — functions `getToken()`, `fetchCurrentUser()`, `clearToken()`

---

### What Jakub Should Remember

1. **`useState` = variable + setter + automatic re-render** — most important sentence
2. **Each `setState` triggers re-render of entire component function**
3. **Each `useState` is independent** — changing one doesn't affect others
4. **`useEffect` with `[]`** = run once on startup (analogy: `@PostConstruct`)
5. **`useEffect` with `[user]`** = infinite loop if you call `setUser` inside
6. **`[]` protects us from loops** — tells React "I don't watch these variables"

---

## Phase 4 — React Hooks

### ✅ STATUS: UNDERSTOOD (Session 4 — 2026-03-17)

Jakub mastered: what hooks are, hook rules, cleanup in useEffect, custom hooks, hooks with configuration. 4.5/5 quiz.

---

### What Is a Hook

**Hook = function that plugs your code into React's mechanisms.**

Not "waits for event" (that's event listener). Hook says: **"React, give me access to [state / effect / context]"**.

**Analogy:** `@Autowired` in Spring — you ask framework for access to something it manages.

| Spring (Java) | React (hook) | What It Does |
|---|---|---|
| `@Autowired` field | `useContext(...)` | Gets dependency from context |
| `@PostConstruct` | `useEffect(..., [])` | Code after initialization |
| field + setter | `useState(...)` | State with notifications |
| `@Cacheable` + service | `useQuery(...)` | Cached data fetching |

---

### Hook Rules (Rules of Hooks)

**1. Only at top level of component function** — never in `if`, loop, nested function.
React keeps hooks as list in fixed order. Hook in `if` = number of hooks changes between renders = React assigns values to wrong hooks.

**2. Only in React components or other hooks** — never in regular function.

**3. `use` prefix** — React + linter recognize hooks by name. Without `use` linter doesn't apply hook rules.

---

### useEffect — Cleanup (Cleanup Function)

```tsx
useEffect(() => {
    const timer = setInterval(() => { ... }, 100)

    return () => {          // ← CLEANUP
        clearInterval(timer)
    }
}, [])
```

`return () => {...}` = **cleanup function**. React calls it when component disappears from screen.

| Spring | React | When |
|---|---|---|
| `@PostConstruct` | code in `useEffect` | component appears |
| `@PreDestroy` | `return () => {...}` | component disappears |

---

### useEffect — Multiple Effects

Component can have **many `useEffect`s** — each handles different thing. Principle: **one `useEffect` = one responsibility** (like many `@EventListener` in one bean).

---

### Custom Hooks = Spring Services

**Custom hook = regular function starting with `use`, using other hooks inside.**

```tsx
// useNotes.ts ≈ NoteService.java
export function useNotes(applicationId: number) {
    return useQuery({ queryKey: ..., queryFn: ... })
}
```

| Spring | React | Role |
|---|---|---|
| `@Service` class | custom hook (`useXxx`) | encapsulates logic |
| `@Autowired` on field | calling another hook | gets dependency |
| public methods | return value | API for consumer |

**Why?** Don't copy logic. Write once in hook, use in many components.

Project hooks:

| Hook | Java Equivalent | What It Does |
|---|---|---|
| `useApplications.ts` | `ApplicationService.java` | CRUD applications |
| `useCV.ts` | `CVService.java` | CRUD CVs |
| `useNotes.ts` | `NoteService.java` | CRUD notes |
| `useBadgeStats.ts` | `StatisticsService.java` | badge statistics |

---

### Hooks with Configuration

**`staleTime`** — how long data is "fresh" (don't ask server again):
- `useBadgeStats`: `staleTime: 60_000` — stats rarely change, cache 60s
- `useApplications`: no `staleTime` — apps change often, always fresh

**`enabled`** — conditional fetching:
- `useCheckDuplicate`: `enabled: company.length > 0 && position.length > 0` — don't check duplicates until fields filled

---

### Preview: CR-7

`CVManager.tsx` doesn't use ready `useCVs()` — instead writes `useState + useEffect + fetchCVs()` manually. Like controller ignoring service and going straight to repository. Problem: inconsistency, duplication, no cache. Fix in Phase 5.

---

### What Jakub Should Remember

1. **Hook = "React, give me access to..."** — like `@Autowired` in Spring
2. **Hook Rules:** only at top level, only in components/hooks, `use` prefix
3. **Cleanup** = `return () => {...}` in `useEffect` = `@PreDestroy` in Spring
4. **Custom hook = Spring service** — logic encapsulation, reusability
5. **`staleTime`** = cache time, **`enabled`** = conditional fetching

---

## Phase 5 — React Query — Heart of Frontend

### ✅ STATUS: UNDERSTOOD (Session 5 — 2026-03-17)

CR-7 fixed. 2.5/5 quiz — weak points: `refetchOnWindowFocus`, reasoning for invalidating multiple caches.

---

### Problem Without React Query

Manual data management from server requires:
- `useState` for data, loading, error
- `useEffect` to fetch on startup
- manual `fetchCVs()` after each operation
- manual `try/catch` handling

Like controller in Spring ignoring service and going straight to repository.

### `useQuery` — Data Fetching (≈ `@Cacheable`)

```tsx
// Instead of 20 lines of useState + useEffect + fetchCVs + try/catch:
const { data: cvList = [], isLoading, error } = useCVs()
```

React Query automatically:
1. Manages state `isLoading` / `error` / `data`
2. Caches results (doesn't ask server every time)
3. Refreshes data when you return to tab (`refetchOnWindowFocus`)

| Spring | React Query | What It Does |
|---|---|---|
| `@Cacheable("applications")` | `useQuery({ queryKey: ['applications'], queryFn })` | Fetches with cache or server |
| value in `@Cacheable(...)` | `queryKey` | Cache name/key |

### `useMutation` — Write Operations (≈ `@CacheEvict`)

```tsx
const uploadCVMutation = useUploadCV()

// Usage:
uploadCVMutation.mutate(file, {
  onSuccess: (newCv) => { ... },   // after success
  onError: () => { ... },          // after error
})

// For free:
uploadCVMutation.isPending   // is operation running (instead of useState(false))
```

Flow after mutation:
1. `mutationFn` sends POST/PUT/DELETE to backend
2. Backend processes
3. `onSuccess` fires
4. `invalidateQueries` invalidates cache
5. React Query automatically fetches data again
6. UI re-renders — **without one `setState`**

### `invalidateQueries` — Invalidate Cache

```tsx
// Invalidate one cache:
queryClient.invalidateQueries({ queryKey: ['cvs'] })

// Invalidate many (when operation affects different data):
queryClient.invalidateQueries({ queryKey: ['cvs'] })
queryClient.invalidateQueries({ queryKey: ['applications'] })
// ^ because deleting CV unpins them from applications
```

**Principle:** invalidate **all** affected caches, not just obvious one.

### CR-7 — What We Changed

| Before (Manual) | After (React Query) |
|---|---|
| `useState<CV[]>([])` + `fetchCVs()` + `useEffect` | `useCVs()` |
| `useState(false)` for `uploading` | `uploadCVMutation.isPending` |
| `await uploadCVAPI(file)` + `fetchCVs()` | `uploadCVMutation.mutate(file)` |
| `await createCV(...)` + `fetchCVs()` | `createCVMutation.mutate(...)` |
| `await deleteCVAPI(id)` + `fetchCVs()` | `deleteCVMutation.mutate(id)` |
| `await updateCV(...)` + `fetchCVs()` | `updateCVMutation.mutate(...)` |

### Key Files

- `src/hooks/useCV.ts` — React Query hooks for CV (useCVs, useUploadCV, useCreateCV, useUpdateCV, useDeleteCV)
- `src/hooks/useApplications.ts` — example useQuery + useMutation with invalidation
- `src/components/cv/CVManager.tsx` — after CR-7 fix uses hooks instead of manual management

---

### What Jakub Should Remember

1. **`useQuery`** = data fetching with automatic cache (≈ `@Cacheable`)
2. **`useMutation`** = write + invalidate cache (≈ `@CacheEvict`)
3. **`queryKey`** = cache name (like value in `@Cacheable("applications")`)
4. **`invalidateQueries`** = invalidate cache → React Query fetches again
5. **Without `onSuccess` + `invalidateQueries`** user won't see changes until refresh
6. **Invalidate all related caches** — not just obvious one

---

## Phase 6 — Routing and Page Protection

### ✅ STATUS: UNDERSTOOD (Session 6 — 2026-03-17)

Jakub mastered: SPA and History API, Routes/Route, Navigate, Context API, ProtectedRoute, isLoading. SPA 5/5, Routes 4/5, Context 3/5, ProtectedRoute 2.5/5 quizzes.

---

### SPA — Navigation Without Reload

In classic app (Spring MVC + Thymeleaf) every URL change = new server request and new HTML.
In SPA (React) every URL change = React swaps component in browser, server knows nothing.

**How it works:**
1. React Router **intercepts** link click (doesn't let browser send request)
2. Changes URL in bar via **History API** (`window.history.pushState(...)`)
3. React swaps component in `<div id="root">`

Only moment browser truly asks server — **first visit** (gets `index.html` + JS).

`<BrowserRouter>` in `App.tsx` — component listening to URL changes, tells rest of app.

---

### Routes and Route — Mapping URL → Component

| Spring MVC | React Router | What It Does |
|---|---|---|
| `@GetMapping("/login")` | `<Route path="/login" element={<LoginPage />} />` | URL → component |
| `return "redirect:/dashboard"` | `<Navigate to="/dashboard" replace />` | redirect |
| no mapping → 404 | `<Route path="*" .../>` | catch-all (without it: blank screen) |

**`replace`** in `<Navigate>` — swaps history entry instead of adding new one. Without it back button loops (goes to `/`, redirects to `/dashboard`, back, redirect...).

**`path="*"`** — catches any URL that doesn't match other routes. Like `default:` in `switch` in Java.

---

### Context API — Global State (= Spring Container)

**Problem:** props drilling — passing data through props through every component "on the way" (even those that don't need it).

**Solution:** Context API — global state available from anywhere in component tree.

| Step | React | Spring | What It Does |
|---|---|---|---|
| 1. Declaration | `createContext(...)` | `@Bean` declaration | "this context will exist" |
| 2. Registration | `<Context.Provider value={...}>` | `return new Service(...)` in `@Bean` | fills with data, provides to children |
| 3. Fetching | `useContext(AuthContext)` | `@Autowired` | gets data from context |

**`useAuth()`** = wrapper on `useContext(AuthContext)` with validation — if you use outside `<AuthProvider>`, you get readable error instead of `undefined`.

Practice: `KanbanBoard` deep in tree calls `useAuth()` and has user data — no props from top.

---

### isLoading — "Still Checking, Don't Decide Yet"

`isLoading` does **NOT mean** "not logged in". Means: **"I haven't verified yet, wait"**.

Without `isLoading` logged user entering `/dashboard` would get **false redirect** — because `useEffect` hadn't fetched user yet, so `user = null`, so `isAuthenticated = false`.

| `isLoading` | `isAuthenticated` | ProtectedRoute |
|---|---|---|
| `true` | irrelevant | `return null` — blank screen, wait |
| `false` | `false` | redirect to `/login` |
| `false` | `true` | show page |

---

### ProtectedRoute — Component Guard (= Spring Security Filter)

```tsx
function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) return null                        // wait
  if (!isAuthenticated) return <Navigate to="/login" />  // throw out
  return <>{children}</>                            // allow
}
```

**Order of checks matters!** First `isLoading`, then `isAuthenticated`. Opposite order = false redirect.

Use in `App.tsx`:
```tsx
<Route path="/dashboard" element={
  <ProtectedRoute>
    <DashboardPage />      ← children
  </ProtectedRoute>
} />
```

`/login` and `/auth/callback` have no `ProtectedRoute` — they're public.

---

### Key Files

- `src/App.tsx` — routing (`<Routes>`, `<Route>`), providers, public/protected split
- `src/auth/AuthProvider.tsx` — Context API (createContext → Provider → useAuth), isLoading
- `src/auth/ProtectedRoute.tsx` — guard: checks isLoading → isAuthenticated → allows or throws out

---

### What Jakub Should Remember

1. **SPA** — one HTML, React Router swaps components without asking server
2. **`<Route path="..." element={...} />`** = `@GetMapping` in Spring
3. **`<Navigate>`** = redirect, **`replace`** prevents back-button loop
4. **Context API** = Spring container: `createContext` → `Provider` → `useContext` = declare → register → `@Autowired`
5. **`isLoading`** = "still checking, don't decide" — prevents false redirect
6. **`ProtectedRoute`** = Spring Security filter — order: first isLoading, then isAuthenticated

---

## Phase 7 — Frontend ↔ Backend Communication

### fetch() — HTTP Client in Browser

`fetch()` is browser function (analogy: `RestTemplate` in Spring) for sending HTTP requests.

```typescript
// Structure
await fetch(url, {
  method: 'POST',           // GET, POST, PUT, DELETE
  headers: { ... },         // Authorization, Content-Type
  body: JSON.stringify(dto) // data to send
})
```

### JSON — Bridge Between Frontend and Backend

Both backend and frontend understand JSON:

| Direction | What Happens |
|----------|--------------|
| Frontend → Backend | JS object → `JSON.stringify()` → JSON text → backend parses → Java object (`@RequestBody`) |
| Backend → Frontend | Java object → Jackson converts → JSON text → frontend `response.json()` → JS object |

### api.ts — API Layer

File `src/services/api.ts` is **central communication layer**:

```typescript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

const getHeaders = () => ({
  'Authorization': `Bearer ${token}`,  // token from localStorage
  'Content-Type': 'application/json'
})

const apiFetch = async (input, init) => {
  const response = await fetch(input, init)
  if (response.status === 401) {
    clearToken()
    window.location.href = '/login'
    throw new Error('Unauthorized')  // stop!
  }
  return response
}
```

**Every API call** goes through `apiFetch()`:
- Automatically adds token in header
- Checks 401 and redirects to `/login`
- Throws error so code doesn't continue

### Environment Variables — Vite

Vite reads from `.env` file:

```
VITE_API_URL=http://localhost:8080/api
```

In code:

```typescript
const apiUrl = import.meta.env.VITE_API_URL || 'fallback'
```

On production `.env` has different URL — code unchanged!

### HTTP Status Codes

| Code | Meaning | Action |
|-----|-----------|-------|
| **200** | OK — you have fresh data | return response.json() |
| **304** | Not Modified — cache ok | use what you have |
| **401** | Unauthorized — log in | clear token, redirect `/login` |
| **404** | Not Found — endpoint missing | throw error |
| **500** | Server Error — backend crashes | throw error |

### Network Tab DevTools — How to Watch

After page refresh (`F5`):
1. **Frontend assets** (CSS, JS) — localhost:5173, status 200/304
2. **API calls** (data) — localhost:8080/api/*, status 200/401/404

304 = browser has fresh copy in cache, save transfer.

### Key Files

- `src/services/api.ts` — API layer, `fetch()`, tokens, error handling
- `src/pages/LoginPage.tsx` — redirect to backend OAuth2
- `.env.example` — what environment variables must be set

### What Jakub Should Remember

1. **`fetch()`** = HTTP client in browser (like `RestTemplate` in Java)
2. **JSON** = universal format — frontend and backend both understand
3. **API contract** = backend decides fields (e.g., `"accessToken"`), frontend must adapt
4. **`import.meta.env.VITE_API_URL`** = don't hardcode URL, read from `.env`
5. **401 Unauthorized** = `throw Error()` so code doesn't continue
6. **304 Not Modified** = browser has fresh copy, save transfer

---

## Phase 8 — OAuth2 and JWT — Complete Login Flow

### ✅ STATUS: UNDERSTOOD (Session 8 — 2026-03-23)

Jakub mastered complete OAuth2 + JWT + cookies flow. Step-by-step tracing all 8 steps from click to dashboard.
Suggested question about contradiction (CSRF disable vs SameSite cookie) — found problem in code comments!
5/5 Quiz ✅

---

### OAuth2 Flow — 8 Steps

```
1️⃣  LoginPage.tsx — window.location.href = /oauth2/authorization/google
    ↓ Browser RELOADS (not fetch!)
2️⃣  Backend — Spring Security redirects to Google
    ↓
3️⃣  Google Login — user logs in at Google
    ↓
4️⃣  Google Callback — Google redirects: /auth/callback?code=...
    ↓
5️⃣  Backend generates JWT — OAuth2AuthenticationSuccessHandler
    • Gets user data from Google
    • Generates access token (JWT, 15 min)
    • Generates refresh token (httpOnly cookie, 7 days)
    ↓ Redirects: /auth/callback?token=<JWT>
6️⃣  AuthCallbackPage.tsx — extracts token from URL
    • setToken(token) → localStorage.setItem('applikon_token', token)
    • navigate('/dashboard')
    ↓
7️⃣  AuthProvider useEffect — check session on startup
    • const token = getToken() // reads from localStorage
    • fetchCurrentUser() → GET /api/auth/me (with token in header)
    • setUser(userData) → isAuthenticated = true
    ↓
8️⃣  ProtectedRoute — check access
    • if (isLoading) return null // wait
    • if (!isAuthenticated) redirect /login
    • else allow to /dashboard ✅
```

---

### Two Tokens — Why?

| What | Where | Lifespan | Why |
|---|---|---|---|
| **Access Token** (JWT) | localStorage | 15 min | Send in every API call in `Authorization: Bearer` header |
| **Refresh Token** | httpOnly cookie | 7 days | When access token expires → send to `/api/auth/refresh` → get new access token |

**Why two?**
- **Access Token short** = if stolen, danger is short-lived
- **Refresh Token in httpOnly** = safer (JS can't read it), but longer lifespan

**Java Analogy:**
- Access Token ≈ short-lived session ID in Spring
- Refresh Token ≈ persistent cookie in Spring

---

### localStorage vs Cookie

| Aspect | Cookie | localStorage |
|---|---|---|
| **Where stored** | Browser (memory) | Browser (memory) |
| **Sends automatically** | ✅ YES (every request) | ❌ NO (manual `getToken()`) |
| **JavaScript can read** | ⚠️ Only if not httpOnly | ✅ YES (getItem) |
| **Security** | httpOnly = unreachable by JS | Vulnerable to XSS (readable by JS) |
| **Applikon Usage** | refresh_token (httpOnly ⚠️) | access_token (localStorage) |

**Cookie = file stored in browser, sent automatically**
Browser **itself** sends cookie with every request (unlike `getToken()` which you call manually).

---

### How Token Travels in API Requests

**Every request contains token in header** (api.ts lines 25-35):

```typescript
const getHeaders = () => ({
  'Authorization': `Bearer ${token}`,  // ← token from localStorage
  'Content-Type': 'application/json'
})

// Every API function uses getHeaders():
const response = await apiFetch(`${API_URL}/applications`, {
  headers: getHeaders()  // ← token already there!
})
```

Backend checks:
```
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
↓
Backend decodes JWT
↓
"Really Jakub (ID: 123)! ✅"
```

---

### What Happens After 20 Minutes (Token Expires)

1. Access Token expired
2. Frontend sends request: `GET /api/applications`
3. Backend returns: **HTTP 401 Unauthorized**
4. `apiFetch()` catches 401 (api.ts lines 41-49):
   ```typescript
   if (response.status === 401) {
     clearToken()              // remove token
     window.location.href = '/login'  // redirect to login
     throw new Error('Unauthorized')
   }
   ```
5. Frontend: redirect to `/login` ✅

---

### CSRF and SameSite — Jakub's Question 🎯

**Jakub's Question:** "We fixed SameSite on cookie, but Spring Security CSRF is disabled? WTF?"

**Answer:** Two DIFFERENT protections, not contradictory!

#### CSRF Token (Synchronizer Pattern) — Disabled ❌

This is **traditional** protection for **server-rendered** apps:
```html
<!-- Traditional app (JSP, Thymeleaf) -->
<form method="POST">
  <input type="hidden" name="_csrf" value="abc123xyz..."/>  ← CSRF token
</form>
```

Applikon is **SPA (React)**, sends **JSON**, not HTML forms:
```typescript
// React — JSON, not form
await fetch('/api/applications', {
  method: 'POST',
  body: JSON.stringify({ company: 'Google' })
})
```

Therefore **CSRF token disabled** — makes no sense in SPA.

#### SameSite on Cookie — Enabled ✅

This is **modern** protection for **API + cookies**:
```java
refreshCookie.setSameSite("Strict");  // ← Send ONLY from our domain
```

Works **independently** from CSRF token. Protects refresh_token cookie.

#### What SameSite=Strict Does?

```
Without SameSite:
  evil.com sends request to applikon.com
  Browser: "I have refresh_token, sending!"
  Backend: "OK, new access token" 💥 HACKER GETS ACCESS

With SameSite=Strict:
  evil.com sends request to applikon.com
  Browser: "This is from different domain, won't send cookie!"
  Backend: "No cookie, I don't know you" 🚫
```

**Summary:**
- CSRF disable = don't need synchronizer token pattern (SPA doesn't send forms)
- SameSite = separate protection layer (prevents cookie send from foreign domain)
- Both together = secure ✅

---

### Code Comment Problem

Found by Jakub! 🎯

**Old misleading comment:**
```java
// CSRF disabled — using JWT (stateless), not sessions/cookies from forms
.csrf(AbstractHttpConfigurer::disable)
```

"not sessions/cookies" — but **there IS refresh_token cookie!**

**Should be:**
```java
// CSRF token (synchronizer pattern) disabled — not needed in SPA
// BUT: Refresh token in httpOnly cookie MUST have SameSite=Strict
.csrf(AbstractHttpConfigurer::disable)
```

---

### Key Files

- `src/pages/LoginPage.tsx` (lines 15-18) — `window.location.href` redirect to Google
- `src/pages/AuthCallbackPage.tsx` (lines 17-27) — receive token from URL
- `src/auth/AuthProvider.tsx` (lines 37-53) — check session on startup (`useEffect`)
- `src/services/api.ts` (lines 16-35) — `getToken()`, `setToken()`, `getHeaders()`
- (backend) `OAuth2AuthenticationSuccessHandler.java` (lines 76-87) — set refresh_token cookie

---

### What Jakub Should Remember

1. **`window.location.href` = page reload** (not `fetch()`)
2. **Two tokens:** access (localStorage, 15 min) + refresh (httpOnly cookie, 7 days)
3. **localStorage = manual management** (`getToken()`, `setToken()`)
4. **Cookie = automatic sending** (browser sends itself)
5. **Token in every request:** `Authorization: Bearer {token}` in header
6. **401 Unauthorized = token expired** → redirect `/login`
7. **CSRF token disabled** = not needed in SPA
8. **SameSite=Strict** = cookie sent ONLY from our domain (CSRF protection)
9. **CSRF disable vs SameSite** = two different protections, work independently

---

### Quiz — Results

| Question | Jakub's Answer | Grade |
|---------|---|---|
| What does `window.location.href` do? | A (fetch) | ❌ Correction: B (page reload) |
| Where is token saved? | localStorage | ✅ |
| Why token in Authorization header? | Backend verifies token | ✅ |
| Token vs no token difference? | Understands fetching, but not isLoading | ⚠️ Explained: isLoading = "wait for backend" |
| What after 20 minutes (expired)? | B (401 → redirect /login) | ✅ |
| CSRF disable vs SameSite contradiction? | Found problem in code comment! | ✅ Educational moment |

**Summary:** 5/5 Quiz ✅ — complete OAuth2 and JWT understanding

---

## Phase 9 — TypeScript in React

### ✅ STATUS: UNDERSTOOD (Session 9 — 2026-03-24)

CR-2 fixed in previous session. CR-8 fixed in this session. 2/5 quiz initially, full understanding after explanations.

---

### TypeScript vs JavaScript

TypeScript is JavaScript with types. Browser **doesn't understand TypeScript** — Vite compiles TS → JS before sending to browser.

| | TypeScript | JavaScript |
|---|---|---|
| Typing | static (errors at compile) | dynamic (errors at runtime) |
| Java Analogy | Java | Groovy |
| When It Exists | in editor and build | in browser |

**Key Pitfall:** TypeScript does NOT protect against external API data at runtime. If backend returns unexpected status — TypeScript already gone, error only appears in browser.

---

### `interface` — Only Description, Disappears After Compilation

```typescript
// domain.ts:31 — interface Application
export interface Application {
  id: number
  company: string
  status: ApplicationStatus
}
```

`interface` is **only data shape description** — no constructor, methods, logic. After compilation **disappears** — doesn't go to browser.

Java Analogy: `record` / pure DTO — only data, zero logic.

**Why not classes?** Frontend doesn't create objects — receives JSON from backend and TypeScript checks if JSON has right shape. Classes unnecessary.

**Principle:** `interface` / `type` = disappears. Objects / functions = go to JS.

---

### Union Types — Instead of Enum

```typescript
// domain.ts:5
export type ApplicationStatus = 'SENT' | 'IN_PROGRESS' | 'OFFER' | 'REJECTED'
```

`|` reads as "or". Analogy: `enum` in Java.

**Why string union instead of `enum`?** JSON from backend returns strings (`"SENT"`), TS compares strings with union without conversion.

---

### `| null` and `?` — Nullability

```typescript
// domain.ts:36 — field MUST be, but can be null
currentStage: string | null

// domain.ts:85 — field optional (may not exist in object at all)
salaryMin?: number | null
```

| Notation | Meaning | Java Analogy |
|---|---|---|
| `string | null` | field must be in object, value can be null | `@Nullable` field |
| `?` | field may not exist in object | field omitted in `@RequestBody` |

```typescript
// For "salaryMin: number | null":
{ salaryMin: 5000 }  // ✅
{ salaryMin: null }   // ✅
{}                    // ❌ field missing

// For "salaryMin?: number | null":
{ salaryMin: 5000 }  // ✅
{ salaryMin: null }   // ✅
{}                    // ✅ optional field
```

---

### Strict Mode — tsconfig.json

```json
"strict": true,
"noUnusedLocals": true,
"noUnusedParameters": true,
"noFallthroughCasesInSwitch": true
```

Analogy: `-Xlint:all` + Checkstyle in Maven. Flags work **only at compile** — don't affect browser behavior.

`noUnusedLocals` — variable declared but unused = compile error. Protects against dead code.

---

### Spread Operator — `...STATUS_CONFIG`

```typescript
// applicationStatus.ts — single source of truth
export const STATUS_CONFIG = {
  SENT:    { label: 'Sent',   color: '#3498db', bg: '#ebf5fb' },
  IN_PROGRESS: { label: 'In Progress', color: '#f39c12', bg: '#fef9e7' },
  OFFER:     { label: 'Offer Received', color: '#27ae60', bg: '#eafaf1' },
  REJECTED:     { label: 'Rejected',    color: '#95a5a6', bg: '#f5f5f5' },
}

// ApplicationTable.tsx — extends with legacy without copying
const statusConfig = {
  ...STATUS_CONFIG,        // ← paste all 4 entries
  'INTERVIEW': { ... },    // ← add only legacy
}
```

`...obj` = "paste all keys and values from this object here". Change in one place → propagates everywhere.

---

### Legacy Statuses — When to Remove

Old values (`INTERVIEW`, `TASK`, `REJECTED_LEGACY`) are defensive fallbacks for old DB records.

**When safe to remove:** after DB verification:
```sql
SELECT COUNT(*) FROM applications WHERE status IN ('INTERVIEW', 'TASK', 'REJECTED_LEGACY');
```
If `0` → safe to remove. Otherwise → first Flyway migration, then remove fallbacks.

---

### CR-8 — What We Changed

Extracted duplicates to `src/constants/applicationStatus.ts`:

| Before | After |
|---|---|
| `STATUS_COLORS` in `ApplicationDetails.tsx` | removed |
| `STATUS_LABELS` in `ApplicationDetails.tsx` (with typo `c;a`) | removed + fixed |
| `statusConfig` with 4 colors in `ApplicationTable.tsx` | replaced with `...STATUS_CONFIG` |
| Colors duplicated in 2 files | single source of truth in `constants/` |

### Key Files

- `src/types/domain.ts` — all project types (interfaces, union types)
- `src/constants/applicationStatus.ts` — extracted status constants (CR-8)
- `applikon-frontend/tsconfig.json` — strict mode

---

### What Jakub Should Remember

1. **`interface` disappears after compilation** — only compiler instruction, doesn't go to browser
2. **Union types** = `enum` in Java, but as strings (JSON returns strings)
3. **`| null`** = field must be, can be null. **`?`** = field may not exist
4. **TypeScript does NOT protect at runtime** — external API data can break types, error only in browser
5. **Strict mode** = at compile, doesn't affect runtime
6. **`...spread`** = paste all object keys — DRY principle

---

## Phase 10 — Frontend Testing

### ✅ STATUS: UNDERSTOOD (Session 10 — 2026-03-26)

Test pyramid discussed. Overview of all 6 project test files. Quiz shortened due to time. CR-11 and CR-12 fixed in this session.

---

### Test Pyramid

```
      /\
     /  \
    / E2E \          ← Cypress — browser, click like user
   /--------\
  / Integration\      ← Vitest + Testing Library — render component
 /------------\
/  Unit Tests  \     ← Vitest — test function/hook
/_______________\
```

| Level | Frontend (Project) | Java | What Tests |
|---|---|---|---|
| Unit | Vitest | JUnit 5 | Function, hook — no UI |
| Integration | Vitest + Testing Library | JUnit + Mockito | Component rendered in DOM |
| E2E | Cypress | Selenium | Entire app in real browser |

---

### Tools

| Frontend | Java | What It Does |
|---|---|---|
| **Vitest** | JUnit 5 | Test runner — `describe`, `it`, `expect` |
| **Testing Library** | Mockito + AssertJ | Renders component, gives DOM search API |
| **Cypress** | Selenium | Runs real browser |
| **`vi.mock()`** | `@MockBean` | Replaces module with fake |

---

### Key Testing Library Functions

**`render(<Component />)`** — injects JSX into virtual DOM (jsdom). Like `@SpringBootTest` that starts context, only for component tree.

**`screen`** — object for finding DOM elements:
```tsx
screen.getByTestId('authenticated')  // find element with data-testid="authenticated"
screen.getByText('loading')          // find element with text
screen.getByRole('button')           // find button (accessibility)
```

**`waitFor()`** — waits until assertion passes. Needed because React is async — after `render()` component still loading data. Analogy: `Awaitility` in Java.

**`renderHook()`** — tests hook without helper component:
```tsx
const { result } = renderHook(() => useApplications(), { wrapper: createWrapper() })
expect(result.current.isLoading).toBe(true)
await waitFor(() => expect(result.current.isSuccess).toBe(true))
```

---

### test-utils.tsx — Why Wrapper Is Needed

Component using `useQuery` needs `QueryClientProvider` in tree. Tests don't have it — so `QueryWrapper` wraps tested component:

```tsx
export function QueryWrapper({ children }) {
  const queryClient = createTestQueryClient()
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
```

**Why factory (`createWrapper()`) and not one global wrapper?**
Each test must have fresh `QueryClient` — otherwise cache from one test contaminates next. Analogy: `@BeforeEach` in JUnit creating new service instance.

**`retry: false`** — React Query retries failed queries 3 times by default. In tests that's disaster — `retry: false` = one shot and done.

---

### Project Test Files

| File | Level | What Tests |
|---|---|---|
| `api.test.ts` | Unit | `fetch`, URLs, HTTP responses — mocks `global.fetch` |
| `hooks/useApplications.test.tsx` | Hook | React Query cache, `enabled`, `isLoading`, `isError` |
| `auth/AuthProvider.test.tsx` | Integration | Context API, `useEffect` on startup, `signOut` |
| `auth/ProtectedRoute.test.tsx` | Integration | Redirect when logged out, `isLoading` |
| `components/App.test.tsx` | Integration | Routing, providers |
| `components/BadgeWidget.test.tsx` | Integration | Component with props |

---

### vi.mock() — Mock Boundary

**Principle:** mock dependency, not function being tested.

```typescript
// ✅ GOOD — test fetchApplications(), mock fetch (dependency)
global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => ... })
const result = await fetchApplications()
expect(global.fetch).toHaveBeenCalledWith(`${API_URL}/applications`, ...)

// ❌ BAD — mock what you're testing, test always green
vi.mock(api.fetchApplications).mockResolvedValue(mockData)
```

Java Analogy: mock `EntityManager` / `DataSource`, not your service.

---

### CR-11 — Memoization (Done This Session)

`useMemo` = `@Cacheable` in React. Calculates result only when dependencies change.

```tsx
// WITHOUT useMemo — calculates every render
const filteredApplications = applications.filter(...)

// WITH useMemo — calculates only when applications/searchQuery/statusFilter change
const filteredApplications = useMemo(
  () => applications.filter(...),
  [applications, searchQuery, statusFilter]
)
```

Fixed in `ApplicationTable.tsx`: `filteredApplications`, `sortedApplications`, `statusCounts`.

---

### CR-12 — KanbanBoard Split (Done This Session)

987 lines → 396 lines in `KanbanBoard.tsx` + 7 new files:

| File | Contains |
|---|---|
| `types.ts` | `KanbanStatus`, `STATUSES`, `PREDEFINED_STAGES`, `REJECTION_REASONS`, `isMobile` |
| `ApplicationCard.tsx` | Application card (draggable, stage dropdown) |
| `DragOverlayCard.tsx` | Card in overlay during drag |
| `StageModal.tsx` | Modal for choosing recruitment stage |
| `OnboardingOverlay.tsx` | Mobile onboarding (disabled, but kept) |
| `MoveModal.tsx` | Bottom sheet mobile — status change |
| `EndModal.tsx` | Modal for ending (offer/rejection) |
| `KanbanColumn.tsx` | Kanban column with SortableContext |

---

### What Jakub Should Remember

1. **Test Pyramid:** unit → integration → E2E (fastest to slowest)
2. **`render()` + `screen` + `waitFor()`** = render → search → wait for async
3. **`renderHook()`** = test hook without helper component
4. **`vi.mock()`** = `@MockBean` — mock dependency, not tested function
5. **Fresh `QueryClient` per test** = `@BeforeEach` in JUnit
6. **`retry: false`** = tests fast and predictable
7. **`useMemo`** = `@Cacheable` — calculates only when dependencies change
