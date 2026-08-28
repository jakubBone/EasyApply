import type { TFunction, ParseKeys } from 'i18next'
import type { Application } from '../types/domain'

const CONTRACT_TYPE_KEYS: Record<string, string> = {
  B2B: 'salary.contractB2B',
  EMPLOYMENT: 'salary.contractEmployment',
  MANDATE: 'salary.contractMandate',
  OTHER: 'salary.contractOther',
}

// Formats the salary the user proposed for an application (single amount or range,
// currency, gross/net, contract type). Returns null when nothing was recorded, and the
// caller decides how to render that (e.g. the cheat sheet shows "—").
export function formatSalary(app: Application, locale: string, t: TFunction): string | null {
  if (!app.salary && !app.salaryMin) return null

  let salaryStr: string
  if (app.salary && !app.salaryMin) {
    salaryStr = app.salary.toLocaleString(locale)
  } else {
    salaryStr = app.salaryMin!.toLocaleString(locale)
    if (app.salaryMax) {
      salaryStr += ` - ${app.salaryMax.toLocaleString(locale)}`
    }
  }
  salaryStr += ` ${app.currency ?? 'PLN'}`

  const extras: string[] = []
  if (app.salaryType) extras.push(app.salaryType.toLowerCase())
  if (app.contractType) {
    extras.push(t((CONTRACT_TYPE_KEYS[app.contractType] ?? 'salary.contractOther') as unknown as ParseKeys))
  }
  if (extras.length > 0) {
    salaryStr += ` (${extras.join(', ')})`
  }

  return salaryStr
}
