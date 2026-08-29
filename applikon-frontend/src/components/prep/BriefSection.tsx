import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useBrief, useGenerateBrief } from '../../hooks/useBrief'
import { BRIEF_PITCH_KEY, type BriefField } from '../../types/domain'
import './prep.css'

// The text to show for a field: the current app language, falling back to whatever
//  locale the backend stored (an edited field carries the same user text in all of them).
function textFor(field: BriefField | undefined, lang: string): string | null {
  if (!field) return null
  const own = field.texts[lang]
  if (own != null && own.trim() !== '') return own
  const any = Object.values(field.texts).find(t => t != null && t.trim() !== '')
  return any ?? null
}

// The ✨ generate action for the "About the company" header, next to Add/Edit.
// Rendered only while the company has no brief: a ready brief never regenerates,
// and a failed one retries from inside the section.
export function GenerateBriefButton({ applicationId }: { applicationId: number }) {
  const { t } = useTranslation()
  const { data: brief, isLoading } = useBrief(applicationId)
  const { mutate, isPending } = useGenerateBrief(applicationId)

  if (isLoading || brief) return null

  return (
    <button
      className="brief-generate-btn"
      data-cy="brief-generate"
      onClick={() => mutate()}
      disabled={isPending}
    >
      ✨ {t('brief.generate')}
    </button>
  )
}

// The brief itself inside the "About the company" section: generating / failed+retry /
// the labeled pitch. Renders nothing before the first generation; the header button is the
// only entry point. Deleting lives in the editor, not here.
export function BriefFields({ applicationId }: { applicationId: number }) {
  const { t, i18n } = useTranslation()
  const { data: brief } = useBrief(applicationId)
  const { mutate: retry, isPending: retrying } = useGenerateBrief(applicationId)
  const [expanded, setExpanded] = useState(false)

  if (!brief) return null

  if (brief.status === 'PENDING') {
    return (
      <div className="brief-state" data-cy="brief-generating">
        <span className="brief-spinner" aria-hidden="true" />
        {t('brief.generating')}
      </div>
    )
  }

  if (brief.status === 'FAILED') {
    return (
      <div className="brief-state failed" data-cy="brief-failed">
        <span>{t('brief.failed')}</span>
        <button className="brief-retry-btn" data-cy="brief-retry" onClick={() => retry()} disabled={retrying}>
          {t('brief.retry')}
        </button>
      </div>
    )
  }

  const lang = i18n.language.split('-')[0]
  const field = brief.fields.find(f => f.key === BRIEF_PITCH_KEY)
  const text = textFor(field, lang)

  return (
    <div className="brief-pitch-block" data-cy={`brief-field-${BRIEF_PITCH_KEY}`}>
      <div className="brief-pitch-label">✨ {t('brief.pitchLabel')}</div>
      {text != null ? (
        <>
          <p className={`brief-pitch${expanded ? ' expanded' : ''}`}>{text}</p>
          <button
            className="brief-pitch-toggle"
            data-cy="brief-pitch-toggle"
            onClick={() => setExpanded(e => !e)}
          >
            {t(expanded ? 'brief.collapse' : 'brief.expand')}
          </button>
        </>
      ) : (
        <p className="brief-pitch">
          {field?.edited
            // The user cleared their own text. That is an empty answer, not a gap in public
            // data. Only an untouched field can honestly claim nothing was found.
            ? t('cheatSheet.empty')
            : <span className="brief-insufficient">{t('brief.insufficient')}</span>}
        </p>
      )}
    </div>
  )
}
