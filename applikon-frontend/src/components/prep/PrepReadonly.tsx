import type { ParseKeys } from 'i18next'
import { useTranslation } from 'react-i18next'
import { useScreeningAnswers, useApplicationScreeningAnswers } from '../../hooks/useScreeningAnswers'
import { useBrief } from '../../hooks/useBrief'
import { BriefFields } from './BriefSection'
import { FIXED_QUESTION_KEYS, FIXED_COMPANY_KEY } from './globalAnswers'
import type { Application } from '../../types/domain'
import './prep.css'

// Read-only "About the company" block: your salary, the AI brief (once generated), then the
//  company Q&A (the fixed "What do you know about us?" plus any custom questions).
//  Empty values render as "-".
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
  const { data: brief } = useBrief(application.id)
  const fixed = answers.find(a => !a.custom && a.questionKey === FIXED_COMPANY_KEY)
  const custom = answers.filter(a => a.custom)
  // A ready brief already covers what the company does, so an unanswered "What do you know
  // about us?" is only noise, so hide it. Never hide the user's own text: this reads the
  // current answer, so clearing it later hides the row too, and writing one brings it back.
  const companyAnswer = fixed?.answer.trim() ?? ''
  const showCompanyAnswer = companyAnswer !== '' || brief?.status !== 'READY'
  return (
    <div className="prep-qa-list">
      <div className="prep-qa">
        <div className="prep-qa-q"><span>{t('cheatSheet.salaryQuestion')}</span></div>
        <div className="prep-qa-a" data-cy="cheat-salary">{salary ?? empty}</div>
      </div>
      <BriefFields applicationId={application.id} />
      {showCompanyAnswer && (
        <div className="prep-qa">
          <div className="prep-qa-q"><span>{t('cheatSheet.companyLabel')}</span></div>
          <div className="prep-qa-a">{companyAnswer || empty}</div>
        </div>
      )}
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
