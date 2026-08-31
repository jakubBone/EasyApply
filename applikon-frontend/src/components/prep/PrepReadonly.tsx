import { useTranslation } from 'react-i18next'
import { useScreeningAnswers, useApplicationScreeningAnswers } from '../../hooks/useScreeningAnswers'
import { BriefFields } from './BriefSection'
import { buildItems, labelFor, FIXED_QUESTION_KEYS } from './globalAnswers'
import type { Application } from '../../types/domain'
import './prep.css'

// The "About the company" prep has no built-in question — the generated pitch already is
// that answer — so the read view seeds from an empty template: custom questions only.
const NO_TEMPLATE: readonly string[] = []

// Read-only "About the company" block: your salary, the AI brief (once generated), then any
//  custom questions. Empty values render as "-".
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
  return (
    <div className="prep-qa-list">
      <div className="prep-qa">
        <div className="prep-qa-q"><span>{t('cheatSheet.salaryQuestion')}</span></div>
        <div className="prep-qa-a" data-cy="cheat-salary">{salary ?? empty}</div>
      </div>
      <BriefFields applicationId={application.id} />
      {buildItems(answers, NO_TEMPLATE).map((item, i) => (
        <div className="prep-qa" key={i}>
          <div className="prep-qa-q"><span>{labelFor(item, t)}</span></div>
          <div className="prep-qa-a">{item.answer.trim() || empty}</div>
        </div>
      ))}
    </div>
  )
}

// Read-only global answers, seeded the same way the editor is: the built-in questions until
//  the section is saved, then exactly the saved set — a deleted built-in question stays gone.
export function GlobalAnswersReadonly() {
  const { t } = useTranslation()
  const { data: answers = [] } = useScreeningAnswers()
  const empty = t('cheatSheet.empty')

  return (
    <div className="prep-qa-list">
      {buildItems(answers, FIXED_QUESTION_KEYS).map((item, i) => (
        <div className="prep-qa" key={i}>
          <div className="prep-qa-q"><span>{labelFor(item, t)}</span></div>
          <div className="prep-qa-a">{item.answer.trim() || empty}</div>
        </div>
      ))}
    </div>
  )
}
