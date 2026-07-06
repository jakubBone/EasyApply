# Internationalization (i18n) Learning Notes — Applikon

Reference file. Explains i18n idea from scratch — what it is, how it works on backend (Spring Boot), how on frontend (React + i18next), and how both layers cooperate.

---

## Part 1 — i18n Idea (What's This About?)

### What Is i18n?

**i18n** is abbreviation for "internationalization" (18 letters between "i" and "n"). Goal: app displays text in different languages without code changes — only based on translation files.

**Everyday Analogy:**
Imagine ticket machine. Same machine, same hardware, same logic — but screen shows Polish or English depending which language you pick. Machine code doesn't change, only text file changes.

**Without i18n (Hardcoded):**
```java
throw new EntityNotFoundException("Application ID 5 not found");
```
```tsx
<button>Add application</button>
```

**With i18n (Dynamic):**
```java
throw new EntityNotFoundException(
    messageSource.getMessage("error.application.notFound", new Object[]{5}, locale)
);
```
```tsx
<button>{t('app.addApplication')}</button>
```

Now text lives in `.properties` files (backend) and `.json` files (frontend). Change language → load different file. Fix typo → edit file, not code.

### Two i18n Layers in Applikon

```
User's Browser
  │
  ├── Frontend (React)
  │     Displays UI in Polish or English
  │     Translation files: src/i18n/locales/pl/*.json + en/*.json
  │
  └── sends header "Accept-Language: pl" or "Accept-Language: en"
        │
        ▼
      Backend (Spring Boot)
        Returns error messages in Polish or English
        Translation files: src/main/resources/i18n/messages*.properties
```

---

## Part 2 — Backend i18n (Spring Boot)

### Key Component: MessageSource

`MessageSource` is Spring bean that reads `.properties` files and returns text in correct language. Central point of backend i18n.

**How you configured it:** `src/main/java/com/applikon/config/I18nConfig.java`

```java
@Bean
public MessageSource messageSource() {
    ResourceBundleMessageSource ms = new ResourceBundleMessageSource();
    ms.setBasename("i18n/messages");        // searches for files: messages.properties, messages_pl.properties etc.
    ms.setDefaultEncoding("UTF-8");
    ms.setFallbackToSystemLocale(false);    // if no translation → uses fallback, not system
    return ms;
}
```

`setBasename("i18n/messages")` = "look for files named `messages` in `i18n/` folder on classpath". Spring automatically adds suffix `_pl`, `_en` etc.

### Translation Files (Backend)

**Location:** `src/main/resources/i18n/`

```
i18n/
  messages.properties       ← English (fallback — used when no other language)
  messages_pl.properties    ← Polish
```

**Structure:** key=value, parameters as `{0}`, `{1}` etc.

```properties
# messages.properties (English)
error.application.notFound=Application {0} not found
error.user.notFound=User not found
validation.company.required=Company name is required
error.salary.changed=Salary changed: {0} {1} -> {2} {3}

# messages_pl.properties (Polish)
error.application.notFound=Aplikacja o ID {0} nie została znaleziona
error.user.notFound=Użytkownik nie znaleziony
validation.company.required=Nazwa firmy nie może być pusta
error.salary.changed=Stawka zmieniona: {0} {1} -> {2} {3}
```

Parameters `{0}`, `{1}` are slots for dynamic values (e.g., ID, amount). You pass them as `Object[]` array.

### How Spring Picks Language: LocaleResolver

`LocaleResolver` is bean that on every HTTP request decides "what language?". You use `AcceptHeaderLocaleResolver` — watches `Accept-Language` header in request.

```java
@Bean
public LocaleResolver localeResolver() {
    AcceptHeaderLocaleResolver resolver = new AcceptHeaderLocaleResolver();
    resolver.setDefaultLocale(Locale.ENGLISH);  // default English when no header
    return resolver;
}
```

**Flow:**
```
Frontend sends:  GET /api/applications  +  Accept-Language: pl
                                                       ↓
Spring calls:    localeResolver.resolveLocale(request)
                                                       ↓
                 Returns:  Locale("pl")
                                                       ↓
Service code:    messageSource.getMessage("error.application.notFound",
                     new Object[]{id}, LocaleContextHolder.getLocale())
                                                       ↓
                 Returns:  "Aplikacja o ID 5 nie została znaleziona"
```

### LocaleContextHolder — How to Get Current Language in Code

`LocaleContextHolder.getLocale()` is static method that returns current `Locale` from thread context. In normal HTTP flow always returns what `LocaleResolver` extracted from header.

```java
// In service — don't pass locale as parameter, just ask context:
throw new EntityNotFoundException(
    messageSource.getMessage("error.application.notFound",
        new Object[]{id}, LocaleContextHolder.getLocale())
);
```

Java Analogy: like `ThreadLocal` — each HTTP thread has its own context.

### Where MessageSource Is Used in Project

**Services** — exceptions with messages:

```java
// ApplicationService.java, NoteService.java, CVService.java, UserService.java
// Constructor injects MessageSource:
public ApplicationService(ApplicationRepository repo, MessageSource messageSource) {
    this.messageSource = messageSource;
}

// Usage:
throw new EntityNotFoundException(
    messageSource.getMessage("error.application.notFound",
        new Object[]{id}, LocaleContextHolder.getLocale())
);
```

**GlobalExceptionHandler** — error response titles:

```java
// exception/GlobalExceptionHandler.java
problem.setTitle(messageSource.getMessage(
    "error.validation.title", null, LocaleContextHolder.getLocale()));
```

**AuthController** — token messages:

```java
// controller/AuthController.java
return Map.of("error", messageSource.getMessage(
    "error.token.missing", null, LocaleContextHolder.getLocale()));
```

**NoteService — Auto-note About Salary Change:**

```java
// Note content is i18n — user sees it in their language:
String content = messageSource.getMessage(
    "error.salary.changed",
    new Object[]{oldSalary, oldCurrency, newSalary, newCurrency},
    LocaleContextHolder.getLocale());
```

### Validation Messages — Special Case

Bean Validation (`@NotBlank`, `@Min` etc.) normally uses its own message system. To hook it to our `MessageSource`, you need `LocalValidatorFactoryBean`:

```java
// I18nConfig.java
@Bean
public LocalValidatorFactoryBean validator(MessageSource messageSource) {
    LocalValidatorFactoryBean factory = new LocalValidatorFactoryBean();
    factory.setValidationMessageSource(messageSource);
    return factory;
}
```

Thanks to this in DTO you can write:

```java
// Braces {} = "look in MessageSource", without braces = literal text
@NotBlank(message = "{validation.company.required}")
private String company;

// vs hardcoded (WRONG for i18n):
@NotBlank(message = "Company name cannot be empty")
private String company;
```

**Files with validation annotations in project:**
- `dto/ApplicationRequest.java`
- `dto/NoteRequest.java`
- `dto/StatusUpdateRequest.java`
- `entity/Application.java`
- `entity/Note.java`
- `controller/ApplicationController.java` (inline record `AddStageRequest`)
- `controller/CVController.java` (inline records)

---

## Part 3 — Frontend i18n (React + i18next)

### Library: i18next + react-i18next

**i18next** is popular i18n library in JavaScript. Works standalone (plain JS), but for React you use **react-i18next** wrapper, which adds hooks (like `useTranslation`).

Java Analogy: i18next = engine (like Hibernate), react-i18next = Spring integration (like Spring Data JPA).

### Configuration: `src/i18n/index.ts`

Equivalent to `I18nConfig.java` from backend. Initialize library here — provide resources, languages, default namespace etc.

```ts
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

i18n
  .use(LanguageDetector)      // auto-detects language (from localStorage or browser)
  .use(initReactI18next)      // React integration
  .init({
    fallbackLng: 'en',        // fallback English when translation missing
    supportedLngs: ['pl', 'en'],
    defaultNS: 'common',      // default namespace (JSON file)
    ns: ['common', 'errors', 'badges', 'tour'],
    resources: {
      pl: { common: plCommon, errors: plErrors, badges: plBadges, tour: plTour },
      en: { common: enCommon, errors: enErrors, badges: enBadges, tour: enTour },
    },
    detection: {
      order: ['localStorage', 'navigator'],  // check localStorage first, then browser settings
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',      // localStorage key
    },
  })
```

**Important:** `import i18n from './i18n'` is in `main.tsx` — **before** `ReactDOM.render()`. This ensures translations are ready before React starts rendering.

### Translation Files (Frontend)

**Location:** `src/i18n/locales/`

```
locales/
  pl/
    common.json    ← main UI (buttons, labels, forms, status, kanban...)
    errors.json    ← error messages (from api.ts, AuthProvider.tsx)
    badges.json    ← badge widget (titles, badge names)
    tour.json      ← app tour guide (TourGuide.tsx)
  en/
    common.json
    errors.json
    badges.json
    tour.json
```

**Why Split Into Namespaces?** Load only needed translations. Each namespace is separate JSON file. Badge component doesn't need to load entire common.json — only badges.json.

**JSON File Structure:**

```json
// pl/common.json (fragment)
{
  "form": {
    "titleCreate": "Dodaj nową aplikację",
    "titleEdit": "Edytuj aplikację",
    "company": "Firma *",
    "duplicateWarning": "Już aplikowałeś do {{company}} na stanowisko {{position}} ({{date}})"
  },
  "kanban": {
    "statusSENT": "Wysłane",
    "statusIN_PROGRESS": "W procesie"
  }
}
```

Dynamic parameters are `{{parameterName}}` (not `{0}` like Java).

### Using Translations in Components: `useTranslation`

```tsx
import { useTranslation } from 'react-i18next'

function ApplicationForm() {
  const { t } = useTranslation()         // default namespace = 'common'
  const { t: tBadges } = useTranslation('badges')   // different namespace

  return (
    <div>
      <h2>{t('form.titleCreate')}</h2>                    // "Dodaj nową aplikację"
      <button>{t('form.cancel')}</button>                 // "Anuluj"
      <p>{t('form.duplicateWarning', { company: 'Google', position: 'Dev', date: '...' })}</p>
                                                          // "Już aplikowałeś do Google..."
    </div>
  )
}
```

`t('key.subkey')` → searches JSON by nested path.
`t('key', { param: value })` → interpolates `{{param}}` in text.

### LanguageDetector — How Language Is Chosen

`i18next-browser-languagedetector` on app startup checks in order:
1. `localStorage` → key `i18nextLng` (if user picked language before)
2. Browser settings (`navigator.language`) → e.g., `pl-PL`

If none of these languages is in `supportedLngs` → `fallbackLng: 'en'`.

**Where It's Saved:** `localStorage.i18nextLng = 'pl'` or `'en'`.

### LanguageSwitcher — Component to Change Language

**File:** `src/components/LanguageSwitcher.tsx`

```tsx
import i18n from '../i18n'

function LanguageSwitcher() {
  return (
    <div>
      <button onClick={() => i18n.changeLanguage('pl')}>PL</button>
      <button onClick={() => i18n.changeLanguage('en')}>EN</button>
    </div>
  )
}
```

`i18n.changeLanguage('en')` does two things:
1. Saves `i18nextLng = 'en'` to localStorage
2. Notifies all components → React re-renders them with new translations (no page reload)

**Where Used:** in `AppContent.tsx` (header) and `LoginPage.tsx`.

### Accept-Language — Bridge Frontend to Backend

Frontend sends `Accept-Language` header with current language on every API request. Backend knows what language to respond in.

**Where Added:** `src/services/api.ts` → function `getHeaders()`

```ts
import i18n from '../i18n'

const getHeaders = (contentType?: string): HeadersInit => {
  const headers: Record<string, string> = {}
  // ... token ...
  headers['Accept-Language'] = i18n.language    // ← 'pl' or 'en'
  return headers
}
```

`i18n.language` is current user-picked language. Every `fetch()` to backend automatically carries this header.

### TypeScript Typing Keys: `src/i18n/types.ts`

So TypeScript knows what keys exist (and gives autocomplete + compile errors for typos):

```ts
// src/i18n/types.ts
import 'i18next'
import type plCommon from './locales/pl/common.json'
// ...

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common'
    resources: {
      common: typeof plCommon
      // ...
    }
  }
}
```

Now `t('form.typo')` → TypeScript error. `t('form.titleCreate')` → OK.

---

## Part 4 — How Both Layers Cooperate

### Full Flow: User Changes Language to EN

```
1. User clicks "EN" in LanguageSwitcher
   → i18n.changeLanguage('en')
   → localStorage.i18nextLng = 'en'
   → All components re-render with en/*.json
   → UI immediately in English

2. User opens form and makes validation error (empty company field)
   → Frontend: t('form.companyRequired') → "Company name cannot be empty"

3. User sends request to backend
   → getHeaders() adds: Accept-Language: en
   → Backend sees header
   → LocaleResolver.resolveLocale(request) → Locale("en")
   → LocaleContextHolder.getLocale() → Locale("en")
   → messageSource.getMessage("error.application.notFound", ..., en) → "Application 5 not found"
   → Frontend displays error in English
```

### What Lives Where

| What | Where | Why |
|---|---|---|
| Button labels, form labels | Frontend JSON | These are UI elements, only frontend renders |
| Kanban column names | Frontend JSON | UI logic |
| Recruitment stage names (predefined) | Frontend JSON | Displayed by frontend, backend holds key |
| HTTP error messages | Backend `.properties` | Backend generates these errors |
| Validation messages (@NotBlank etc.) | Backend `.properties` | Bean Validation runs on backend |
| Auto-note about salary change | Backend `.properties` | Generated by service, not UI |
| Badge names (Gauntlet, Ghost...) | Frontend `badges.json` | API returns code (e.g., `"Gauntlet"`), frontend translates |
| Rejection reasons (EMAIL_REJECTED etc.) | Frontend JSON | Enum from backend, translated by frontend |

### What Is NOT i18n in Project

- **User data in database** — e.g., user notes, custom stage names they typed. That's data, not UI. Don't translate data.
- **Enum values** (`SENT`, `REJECTED`) — those are codes, not display text. Frontend maps them to text in JSON (`kanban.statusSENT`).
- **Badge names as API keys** — backend returns `"Gauntlet"` (Polish name as key), frontend uses it as key in `badges.names.Gauntlet` → translates to "The Gauntlet" in English. Conscious architecture decision.

---

## Part 5 — Summary: Key Project Files

### Backend

| File | Role |
|---|---|
| `config/I18nConfig.java` | MessageSource, LocalValidatorFactoryBean, LocaleResolver configuration |
| `resources/i18n/messages.properties` | English translations (fallback) |
| `resources/i18n/messages_pl.properties` | Polish translations |
| `exception/GlobalExceptionHandler.java` | Uses MessageSource for HTTP error titles |
| `controller/AuthController.java` | Uses MessageSource for token messages |
| `service/ApplicationService.java` | Uses MessageSource in EntityNotFoundException |
| `service/NoteService.java` | Uses MessageSource in exceptions + auto-note salary |
| `service/CVService.java` | Uses MessageSource in file exceptions |
| `service/UserService.java` | Uses MessageSource in exceptions + demo data in English |

### Frontend

| File | Role |
|---|---|
| `src/main.tsx` | Imports i18n BEFORE React — initializes library |
| `src/i18n/index.ts` | i18next configuration (resources, LanguageDetector, fallback) |
| `src/i18n/types.ts` | TypeScript key typing — autocomplete and compile errors |
| `src/i18n/locales/pl/*.json` | Polish translations (4 files: common, errors, badges, tour) |
| `src/i18n/locales/en/*.json` | English translations (4 files) |
| `src/components/LanguageSwitcher.tsx` | PL/EN buttons, calls `i18n.changeLanguage()` |
| `src/services/api.ts` → `getHeaders()` | Adds `Accept-Language` to every HTTP request |
| `src/components/kanban/types.ts` | `LEGACY_STAGE_MAP`, `translateStageName()`, `normalizeStageKey()` |

---

## Part 6 — FAQ

### Why Is Fallback English, Not Polish?

Project is portfolio — you show it to recruiters from different countries. English is safer default. Polish version available, but you must actively choose it.

### What Happens When Translation for Key Is Missing?

**Frontend (i18next):** returns key itself, e.g., `"form.missingKey"`. Warning in console. That's why you have `types.ts` — TypeScript catches missing keys at compile time.

**Backend (MessageSource):** if key missing for `pl` → searches in `messages.properties` (English fallback). If missing everywhere → throws `NoSuchMessageException`.

### Why `{validation.company.required}` Has Braces and Not Quotes?

`{key}` is Bean Validation syntax — says "this is key to resolve in MessageSource, not literal text". Without braces Spring treats it as message content.

### How Stage Names Work — Why Complicated?

Problem: recruitment stages (HR Interview, Recruitment Task...) stored in DB as text. Old data has Polish names (`"Rozmowa z HR"`), new data has i18n keys (`"stage.hrInterview"`). Must handle both without DB migration.

Solution — `src/components/kanban/types.ts`:
```ts
// New format (key):
translateStageName("stage.hrInterview", t) → t("stage.hrInterview") → "Rozmowa z HR" / "HR Interview"

// Old format (Polish name — legacy):
translateStageName("Rozmowa z HR", t) → LEGACY_STAGE_MAP → "stage.hrInterview" → t(...) → "Rozmowa z HR" / "HR Interview"

// Custom (user-typed):
translateStageName("My Stage", t) → "My Stage" (no translation — user data)
```

### How Do Cypress Tests Know Which Language?

Cypress visits page like normal user. LanguageDetector checks localStorage. That's why in `cy.login()` we set:
```ts
win.localStorage.setItem('i18nextLng', 'pl')
```
App always starts Polish in tests → assertions `cy.contains('Wysłane')` work deterministically.

---

*Last updated: 2026-03-28*
