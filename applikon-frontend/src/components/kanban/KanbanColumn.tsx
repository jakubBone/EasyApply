import { useSortable } from '@dnd-kit/sortable'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useTranslation } from 'react-i18next'
import type { Application } from '../../types/domain'
import type { KanbanStatus } from './kanban'

interface KanbanColumnProps {
  status: KanbanStatus
  applications: Application[]
  children: React.ReactNode
}

export function KanbanColumn({ status, applications, children }: KanbanColumnProps) {
  const { t } = useTranslation()
  const { setNodeRef } = useSortable({
    id: status.id,
    data: { type: 'column' }
  })

  return (
    <div className="kanban-column" ref={setNodeRef}>
      <div className="column-header" style={{ borderTopColor: status.color }}>
        <h3>{t(status.labelKey)}</h3>
        <span className="column-count">{applications.length}</span>
      </div>
      <div className="column-content">
        <SortableContext
          items={applications.map(app => app.id.toString())}
          strategy={verticalListSortingStrategy}
        >
          {children}
        </SortableContext>
      </div>
    </div>
  )
}
