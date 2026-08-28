import { useState, useEffect, useRef } from 'react'
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  rectIntersection,
  KeyboardSensor,
  TouchSensor,
  MouseSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragStartEvent, DragEndEvent, CollisionDetection } from '@dnd-kit/core'
import { useTranslation } from 'react-i18next'
import type { Application, StageUpdateRequest } from '../../types/domain'
import { isMobile, STATUSES } from './kanban'
import { ApplicationCard } from './ApplicationCard'
import { StaleBanner } from './StaleBanner'
import { isStale } from '../../utils/stale'
import { DragOverlayCard } from './DragOverlayCard'
import { StageModal } from './StageModal'
import { MoveModal } from './MoveModal'
import { EndModal } from './EndModal'
import { KanbanColumn } from './KanbanColumn'
import './KanbanBoard.css'

// Pointer-based collision so a drop lands on whatever is under the cursor.
// closestCorners compared the dragged card's corners against each droppable's
// corners; because column droppables span the full column height, a card in an
// adjacent column could have a closer corner than the intended column, so drops
// resolved to the wrong column. pointerWithin uses the actual pointer position;
// rectIntersection is the fallback for keyboard dragging (no pointer).
const collisionDetection: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args)
  return pointerCollisions.length > 0 ? pointerCollisions : rectIntersection(args)
}

interface KanbanBoardProps {
  applications: Application[]
  onStatusChange: (id: number, status: string) => void
  onStageChange: (id: number, data: StageUpdateRequest) => void
  onCardClick: (app: Application) => void
}

function KanbanBoard({ applications, onStatusChange: _onStatusChange, onStageChange, onCardClick }: KanbanBoardProps) {
  const { t } = useTranslation()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [stageModalOpen, setStageModalOpen] = useState(false)
  const [endModalOpen, setEndModalOpen] = useState(false)
  const [pendingApplication, setPendingApplication] = useState<Application | null>(null)

  const [showSwipeHint] = useState(false)
  const [moveModalOpen, setMoveModalOpen] = useState(false)
  const [moveModalCard, setMoveModalCard] = useState<Application | null>(null)
  const [successToast, setSuccessToast] = useState<string | null>(null)
  const [activeColumn, setActiveColumn] = useState(0)
  const kanbanBoardRef = useRef<HTMLDivElement>(null)

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 10 }
    }),
    // TouchSensor and the long-press handler both claim the same gesture and dnd-kit wins the
    // race, so on touch devices the sensor is left out and long-press drives the move modal.
    ...(isMobile() ? [] : [
      useSensor(TouchSensor, {
        activationConstraint: {
          delay: 250,
          tolerance: 5
        }
      })
    ]),
    useSensor(KeyboardSensor)
  )

  const sortByDate = (apps: Application[]): Application[] => {
    return [...apps].sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime())
  }

  // Three columns, four statuses: OFFER and REJECTED both read as "done" on a board.
  // The merge happens here rather than in a query, so the board and the table can disagree
  // about grouping without either one changing what the server stores.
  const getApplicationsByStatus = (statusId: string): Application[] => {
    let filtered: Application[]
    if (statusId === 'FINISHED') {
      filtered = applications.filter(app =>
        app.status === 'OFFER' ||
        app.status === 'REJECTED'
      )
    } else if (statusId === 'IN_PROGRESS') {
      filtered = applications.filter(app =>
        app.status === 'IN_PROGRESS'
      )
    } else {
      filtered = applications.filter(app => app.status === statusId)
    }
    return sortByDate(filtered)
  }

  const findApplication = (id: string): Application | undefined => {
    return applications.find(app => app.id.toString() === id)
  }

  const getColumnByStatus = (status: string): string => {
    if (status === 'OFFER' || status === 'REJECTED') return 'FINISHED'
    if (status === 'REJECTED') return 'FINISHED'
    if (status === 'IN_PROGRESS' || status === 'IN_PROGRESS') return 'IN_PROGRESS'
    return status
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    const activeApp = findApplication(active.id as string)
    if (!activeApp) return

    let targetColumn: string | null = null

    const overApp = findApplication(over.id as string)
    if (overApp) {
      targetColumn = getColumnByStatus(overApp.status)
    } else {
      const isColumn = STATUSES.find(s => s.id === over.id)
      if (isColumn) {
        targetColumn = over.id as string
      }
    }

    const currentColumn = getColumnByStatus(activeApp.status)

    if (!targetColumn || targetColumn === currentColumn) return

    if (targetColumn === 'IN_PROGRESS') {
      setPendingApplication(activeApp)
      setStageModalOpen(true)
      return
    }

    if (targetColumn === 'FINISHED') {
      setPendingApplication(activeApp)
      setEndModalOpen(true)
      return
    }

    // Reverting to WYSLANE wipes stage and outcome, so it goes through the same server path.
    if (targetColumn === 'SENT') {
      onStageChange(activeApp.id, {
        status: 'SENT',
        currentStage: null,
        rejectionReason: null,
        rejectionDetails: null
      })
    }
  }

  const handleStageSelect = (stageName: string) => {
    if (pendingApplication) {
      onStageChange(pendingApplication.id, {
        status: 'IN_PROGRESS',
        currentStage: stageName
      })
      setPendingApplication(null)
    }
  }

  const handleEndSelect = (endData: StageUpdateRequest) => {
    if (pendingApplication) {
      onStageChange(pendingApplication.id, endData)
      setPendingApplication(null)
    }
  }

  const handleLongPress = (application: Application) => {
    if (!isMobile()) return
    setMoveModalCard(application)
    setMoveModalOpen(true)
  }

  const handleMoveCard = (targetStatus: string) => {
    if (!moveModalCard) return

    if (targetStatus === 'IN_PROGRESS') {
      setPendingApplication(moveModalCard)
      setStageModalOpen(true)
      setMoveModalOpen(false)
      setMoveModalCard(null)
      return
    }

    if (targetStatus === 'FINISHED') {
      setPendingApplication(moveModalCard)
      setEndModalOpen(true)
      setMoveModalOpen(false)
      setMoveModalCard(null)
      return
    }

    // Reverting to WYSLANE wipes stage and outcome, so it goes through the same server path.
    if (targetStatus === 'SENT') {
      onStageChange(moveModalCard.id, {
        status: 'SENT',
        currentStage: null,
        rejectionReason: null,
        rejectionDetails: null
      })
    }

    if (navigator.vibrate) navigator.vibrate([50, 100, 50])

    const targetStatusConfig = STATUSES.find(s => s.id === targetStatus)
    showSuccessToast(t('kanban.movedTo', { status: targetStatusConfig ? t(targetStatusConfig.labelKey) : targetStatus }))

    setMoveModalOpen(false)
    setMoveModalCard(null)
  }

  const showSuccessToast = (message: string) => {
    setSuccessToast(message)
    setTimeout(() => {
      setSuccessToast(null)
    }, 2000)
  }

  useEffect(() => {
    if (!isMobile()) return

    const handleScroll = () => {
      const board = kanbanBoardRef.current
      if (!board) return

      const scrollLeft = board.scrollLeft
      const columnEl = board.querySelector('.kanban-column') as HTMLElement | null
      const columnWidth = columnEl?.offsetWidth ?? 0
      const gap = 16
      const index = Math.round(scrollLeft / (columnWidth + gap))
      setActiveColumn(index)
    }

    const board = kanbanBoardRef.current
    if (board) {
      board.addEventListener('scroll', handleScroll)
      return () => board.removeEventListener('scroll', handleScroll)
    }
  }, [])

  const scrollToColumn = (index: number) => {
    const board = kanbanBoardRef.current
    if (!board) return

    const columnEl = board.querySelector('.kanban-column') as HTMLElement | null
    const columnWidth = columnEl?.offsetWidth ?? 0
    const gap = 16
    board.scrollTo({ left: index * (columnWidth + gap), behavior: 'smooth' })
  }

  const activeApplication = activeId ? findApplication(activeId) : null

  // Derived from the live query data, so it recomputes after each archive (no dismissal).
  const staleCount = applications.filter(isStale).length

  return (
    <>
      <StaleBanner count={staleCount} />
      <div className="kanban-board-container">
        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetection}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div data-cy="kanban-board" className="kanban-board" ref={kanbanBoardRef}>
            {STATUSES.map(status => (
              <KanbanColumn
                key={status.id}
                status={status}
                applications={getApplicationsByStatus(status.id)}
              >
                {getApplicationsByStatus(status.id).map(app => (
                  <ApplicationCard
                    key={app.id}
                    application={app}
                    isDragging={activeId === app.id.toString()}
                    onClick={onCardClick}
                    onStageChange={onStageChange}
                    onLongPress={handleLongPress}
                  />
                ))}
              </KanbanColumn>
            ))}
          </div>

          <DragOverlay>
            {activeApplication ? (
              <DragOverlayCard application={activeApplication} />
            ) : null}
          </DragOverlay>
        </DndContext>

      </div>

      {/* Mobile: Scroll indicators — outside container so overflow-x:hidden doesn't hide it */}
      {isMobile() && (
        <div className="scroll-indicator">
          {STATUSES.map((_, idx) => (
            <span key={idx} className={activeColumn === idx ? 'active' : ''}></span>
          ))}
        </div>
      )}

      {/* Mobile: Swipe hint */}
      {showSwipeHint && (
        <div className="swipe-hint">
          {t('kanban.swipeHint')}
        </div>
      )}

      {/* Mobile: Success toast */}
      {successToast && (
        <div className={`success-toast ${!successToast ? 'fade-out' : ''}`}>
          {successToast}
        </div>
      )}

      {/* Mobile: Move modal */}
      <MoveModal
        isOpen={moveModalOpen}
        onClose={() => {
          setMoveModalOpen(false)
          setMoveModalCard(null)
        }}
        card={moveModalCard}
        statuses={STATUSES}
        onMove={handleMoveCard}
        getApplicationsByStatus={getApplicationsByStatus}
      />

      <StageModal
        isOpen={stageModalOpen}
        onClose={() => {
          setStageModalOpen(false)
          setPendingApplication(null)
        }}
        onSelect={handleStageSelect}
        currentStage={pendingApplication?.currentStage}
      />

      <EndModal
        isOpen={endModalOpen}
        onClose={() => {
          setEndModalOpen(false)
          setPendingApplication(null)
        }}
        onSelect={handleEndSelect}
      />
    </>
  )
}

export default KanbanBoard
