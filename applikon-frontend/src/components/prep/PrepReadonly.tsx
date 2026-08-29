import type { ParseKeys } from 'i18next'
import { useTranslation } from 'react-i18next'
import { useScreeningAnswers, useApplicationScreeningAnswers } from '../../hooks/useScreeningAnswers'
import { BriefFields } from './BriefSection'
import { FIXED_QUESTION_KEYS } from './globalAnswers'
import type { Application } from '../../types/domain'
import './prep.css'

// Read-only "About the company" block: your salary, the AI brief (once generated), then any
//  custom questions. The generated pitch already is the "what do you know about the company"
//  answer, so there is no built-in company question of its own. Empty values render as "-".
export function CompanyPrepReadonly({
  application,
  salary,
}: {
  application: Application
  salary: string | null
}) {
  const { t } = useTranslation()
  const empty = t('cheatSheet.empty')
  const { data: answers = [] } = useApplicationScreeningAnswers(application.id)
  const custom = answers.filter(a => a.custom)
  return (
    <div className="prep-qa-list">
      <div className="prep-qa">
        <div className="prep-qa-q"><span>{t('cheatSheet.salaryQuestion')}</span></div>
        <div className="prep-qa-a" data-cy="cheat-salary">{salary ?? empty}</div>
      </div>
      <BriefFields applicationId={application.id} />
      {custom.map((a, i) => (
        <div className="prep-qa" key={i}>
          <div className="prep-qa-q"><span>{a.label || ''}</span></div>
          <div className="prep-qa-a">{a.answer.trim() || empty}</div>
        </div>
      ))}
    </div>
  )
}

// Read-only global answers: every fixed question (answer or "-") plus custom ones.
export function GlobalAnswersReadonly() {
  const { t } = useTranslation()
  const { data: answers = [] } = useScreeningAnswers()
  const empty = t('cheatSheet.empty')

  const fixed = FIXED_QUESTION_KEYS.map(key => ({
    label: t(`answers.questions.${key}` as unknown as ParseKeys),
    answer: answers.find(a => !a.custom && a.questionKey === key)?.answer ?? '',
  }))
  const custom = answers.filter(a => a.custom).map(a => ({ label: a.label ?? '', answer: a.answer }))
  const all = [...fixed, ...custom]

  return (
    <div className="prep-qa-list">
      {all.map((item, i) => (
        <div className="prep-qa" key={i}>
          <div className="prep-qa-q"><span>{item.label}</span></div>
          <div className="prep-qa-a">{item.answer.trim() || empty}</div>
        </div>
      ))}
    </div>
  )
}
