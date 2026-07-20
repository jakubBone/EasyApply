import type { ParseKeys } from 'i18next'
import { useTranslation } from 'react-i18next'
import { useBrief, useGenerateBrief } from '../../hooks/useBrief'
import { BRIEF_FIELD_KEYS, type BriefField } from '../../types/domain'
import './prep.css'

/** The text to show for a field: the current app language, falling back to whatever
 *  locale the backend stored (an edited field carries the same user text in all of them). */
function textFor(field: BriefField | undefined, lang: string): string | null {
  if (!field) return null
  const own = field.texts[lang]
  if (own != null && own.trim() !== '') return own
  const any = Object.values(field.texts).find(t => t != null && t.trim() !== '')
  return any ?? null
}

/**
 * The ✨ generate action for the "About the company" header, next to Add/Edit.
 * Rendered only while the company has no brief — a ready brief never regenerates,
 * and a failed one retries from inside the section.
 */
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

/**
 * The brief itself inside the "About the company" section: generating / failed+retry /
 * the four fields as Q&A rows. Renders nothing before the first generation — the header
 * button is the only entry point.
 */
export function BriefFields({ applicationId }: { applicationId: number }) {
  const { t, i18n } = useTranslation()
  const { data: brief } = useBrief(applicationId)
  const { mutate: retry, isPending: retrying } = useGenerateBrief(applicationId)

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
  return (
    <>
      {BRIEF_FIELD_KEYS.map(key => {
        const field = brief.fields.find(f => f.key === key)
        const text = textFor(field, lang)
        return (
          <div className="prep-qa brief-qa" key={key} data-cy={`brief-field-${key}`}>
            <div className="prep-qa-q">
              <span>✨ {t(`brief.fields.${key}` as unknown as ParseKeys)}</span>
            </div>
            <div className="prep-qa-a">
              {text ?? (field?.edited
                // The user cleared their own text — an empty answer, not a gap in public
                // data. Only an untouched field can honestly claim nothing was found.
                ? t('cheatSheet.empty')
                : <span className="brief-insufficient">{t('brief.insufficient')}</span>)}
            </div>
          </div>
        )
      })}
    </>
  )
}
