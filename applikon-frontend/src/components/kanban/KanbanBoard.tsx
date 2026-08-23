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
// adjacent column could have a closer corner than the intended column — drops
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

  // Mobile states
  const [showSwipeHint] = useState(false)
  const [moveModalOpen, setMoveModalOpen] = useState(false)
  const [moveModalCard, setMoveModalCard] = useState<Application | null>(null)
  const [successToast, setSuccessToast] = useState<string | null>(null)
  const [activeColumn, setActiveColumn] = useState(0)
  const kanbanBoardRef = useRef<HTMLDivElement>(null)

  // Enhanced sensors for better mobile support
  // On mobile, disable TouchSensor so long-press works without conflicts
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 10 }
    }),
    // DISABLE TouchSensor on mobile - long press will work then
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

  // Sort by application date (newest first)
  const sortByDate = (apps: Application[]): Application[] => {
    return [...apps].sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime())
  }

  // Group applications by status (merge OFERTA and ODMOWA into ZAKONCZONE)
  // Also handles legacy statuses: ROZMOWA, ZADANIE -> W_PROCESIE, ODRZUCONE -> ZAKONCZONE
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
    // New statuses
    if (status === 'OFFER' || status === 'REJECTED') return 'FINISHED'
    // Legacy statuses (backward compatibility)
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

    // Check if dropped on a card or a column
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

    // If no column change, do nothing
    if (!targetColumn || targetColumn === currentColumn) return

    // Handle transition to W_PROCESIE
    if (targetColumn === 'IN_PROGRESS') {
      setPendingApplication(activeApp)
      setStageModalOpen(true)
      return
    }

    // Handle transition to ZAKONCZONE
    if (targetColumn === 'FINISHED') {
      setPendingApplication(activeApp)
      setEndModalOpen(true)
      return
    }

    // Handle transition to WYSLANE (revert - clears all data)
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

  // Mobile: Long press handler
  const handleLongPress = (application: Application) => {
    if (!isMobile()) return
    setMoveModalCard(application)
    setMoveModalOpen(true)
  }

  // Mobile: Move card via modal
  const handleMoveCard = (targetStatus: string) => {
    if (!moveModalCard) return

    // Handle transition to W_PROCESIE
    if (targetStatus === 'IN_PROGRESS') {
      setPendingApplication(moveModalCard)
      setStageModalOpen(true)
      setMoveModalOpen(false)
      setMoveModalCard(null)
      return
    }

    // Handle transition to ZAKONCZONE
    if (targetStatus === 'FINISHED') {
      setPendingApplication(moveModalCard)
      setEndModalOpen(true)
      setMoveModalOpen(false)
      setMoveModalCard(null)
      return
    }

    // Handle transition to WYSLANE (revert)
    if (targetStatus === 'SENT') {
      onStageChange(moveModalCard.id, {
        status: 'SENT',
        currentStage: null,
        rejectionReason: null,
        rejectionDetails: null
      })
    }

    // Haptic feedback
    if (navigator.vibrate) navigator.vibrate([50, 100, 50])

    // Success toast
    const targetStatusConfig = STATUSES.find(s => s.id === targetStatus)
    showSuccessToast(t('kanban.movedTo', { status: targetStatusConfig ? t(targetStatusConfig.labelKey) : targetStatus }))

    setMoveModalOpen(false)
    setMoveModalCard(null)
  }

  // Mobile: Success toast
  const showSuccessToast = (message: string) => {
    setSuccessToast(message)
    setTimeout(() => {
      setSuccessToast(null)
    }, 2000)
  }

  // Mobile: Scroll tracking
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

  // Mobile: Navigate to column
  const scrollToColumn = (index: number) => {
    const board = kanbanBoardRef.current
    if (!board) return

    const columnEl = board.querySelector('.kanban-column') as HTMLElement | null
    const columnWidth = columnEl?.offsetWidth ?? 0
    const gap = 16
    board.scrollTo({ left: index * (columnWidth + gap), behavior: 'smooth' })
  }

  const activeApplication = activeId ? findApplication(activeId) : null

  // Derived from the live query data — recomputes after each archive (no dismissal).
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
