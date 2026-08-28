import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { GenerateBriefButton } from '../prep/BriefSection'
import { CollapsibleSection } from '../prep/CollapsibleSection'
import { CompanyPrepReadonly, GlobalAnswersReadonly } from '../prep/PrepReadonly'
import { CompanyQuestionsModal } from '../prep/CompanyQuestionsModal'
import { GlobalAnswersModal } from '../prep/GlobalAnswersModal'
import { formatSalary } from '../../utils/salary'
import type { Application } from '../../types/domain'
import '../prep/prep.css'

// Distinct accents so the two blocks are told apart at a glance.
const COMPANY_ACCENT = '#0ea5a5' // teal
const GLOBAL_ACCENT = '#667eea' // violet

// Cheat sheet: the single preparation hub. Pick a company, then read its prep in two
// collapsible blocks (About the company / General). Everything is read-only here;
// editing opens a focused modal.
export function CheatSheet({ applications }: { applications: Application[] }) {
  const { t, i18n } = useTranslation()
  const [selectedId, setSelectedId] = useState<number | null>(applications[0]?.id ?? null)
  const [editNote, setEditNote] = useState(false)
  const [editGlobal, setEditGlobal] = useState(false)

  if (applications.length === 0) {
    return (
      <div className="cheat-page">
        <p className="prep-hint">{t('cheatSheet.noApplications')}</p>
      </div>
    )
  }

  const selected = applications.find(a => a.id === selectedId) ?? null
  const salary = selected ? formatSalary(selected, i18n.language, t) : null

  return (
    <div className="cheat-page">
      <label className="cheat-picker">
        <span className="prep-field-label">{t('cheatSheet.pickCompany')}</span>
        <select
          className="prep-select"
          data-cy="cheat-picker"
          value={selectedId ?? ''}
          onChange={e => setSelectedId(Number(e.target.value))}
        >
          {applications.map(a => (
            <option key={a.id} value={a.id}>{a.company} - {a.position}</option>
          ))}
        </select>
      </label>

      {selected ? (
        <div className="details-sections">
          <CollapsibleSection
            title={t('cheatSheet.companySection')}
            icon="🏢"
            accent={COMPANY_ACCENT}
            dataCy="section-company"
            action={
              <>
                <GenerateBriefButton applicationId={selected.id} />
                <button className="prep-edit-link" data-cy="edit-company" onClick={() => setEditNote(true)}>{t('cheatSheet.edit')}</button>
              </>
            }
          >
            <CompanyPrepReadonly application={selected} salary={salary} />
          </CollapsibleSection>

          <CollapsibleSection
            title={t('cheatSheet.globalSection')}
            icon="💬"
            accent={GLOBAL_ACCENT}
            dataCy="section-general"
            action={<button className="prep-edit-link" data-cy="edit-general" onClick={() => setEditGlobal(true)}>{t('cheatSheet.edit')}</button>}
          >
            <GlobalAnswersReadonly />
          </CollapsibleSection>
        </div>
      ) : (
        <p className="prep-hint">{t('cheatSheet.selectCompanyHint')}</p>
      )}

      {editNote && selected && <CompanyQuestionsModal application={selected} onClose={() => setEditNote(false)} />}
      {editGlobal && <GlobalAnswersModal onClose={() => setEditGlobal(false)} />}
    </div>
  )
}

export default CheatSheet
