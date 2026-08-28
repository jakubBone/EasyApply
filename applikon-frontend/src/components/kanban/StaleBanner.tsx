import { useTranslation } from 'react-i18next'

interface Props {
  count: number
}

// Banner shown at the top of the board when ≥1 application is stale (>60 days in
// SENT). The count is derived from the live query data on every render, so it
// recomputes after an archive. There is no persistent dismissal in v2.
export function StaleBanner({ count }: Props) {
  const { t } = useTranslation()

  if (count <= 0) return null

  return (
    <div className="stale-banner" role="status">
      <span className="stale-banner-icon" aria-hidden="true">⏳</span>
      <span className="stale-banner-message">{t('stale.banner', { n: count })}</span>
    </div>
  )
}
