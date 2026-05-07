import { useState } from 'react'
import adviceIcon from '../assets/advice.png'
import developPointIcon from '../assets/develop-point.png'
import googleCalendarIcon from '../assets/google-calendar.png'
import googleDocsIcon from '../assets/google-docs.png'
import googleMeetIcon from '../assets/google-meet.png'
import { sampleMeetings } from '../data/demoData.js'
import { ListItems, Modal, SectionTitle } from './ui.jsx'
import { assignMilestoneStatuses, buildCalendarMonths, getCheckpointOwner, getCheckpointText, getInitialCalendarMonthIndex, getMilestoneCheckpoints, getMilestoneTone, getPhaseDisplayLabel, isSameDate, normalizeMilestonesForCalendar } from '../utils/project.js'

export function CalendarMilestones({ milestones = [], roles = [], onUpdateMilestone }) {
  const normalized = assignMilestoneStatuses(normalizeMilestonesForCalendar(milestones))
  const months = buildCalendarMonths(normalized)
  const currentMonthIndex = getInitialCalendarMonthIndex(months)
  const [visibleMonthIndex, setVisibleMonthIndex] = useState(currentMonthIndex)
  const [activeMilestoneIndex, setActiveMilestoneIndex] = useState(null)
  const visibleMonth = months[visibleMonthIndex] || months[0]
  const activeMilestone = normalized.find((milestone) => milestone.originalIndex === activeMilestoneIndex) || null

  return (
    <section className="rounded-xl border border-[var(--color-secondary-light)] bg-[var(--color-bg-white)] p-3 sm:p-5">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div className="flex items-start justify-between gap-3 md:block">
          <SectionTitle eyebrow="Calendar" title="마일스톤 달력" icon={googleCalendarIcon} iconAlt="Google Calendar" />
          <div className="flex shrink-0 items-center gap-1.5 md:hidden">
            <button
              type="button"
              onClick={() => setVisibleMonthIndex((index) => Math.max(0, index - 1))}
              disabled={visibleMonthIndex === 0}
              className="h-7 w-7 rounded-md border border-[var(--color-secondary-light)] bg-[var(--color-bg-white)] text-xs font-semibold text-[var(--color-text-main)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              &lt;
            </button>
            <button
              type="button"
              onClick={() => setVisibleMonthIndex((index) => Math.min(months.length - 1, index + 1))}
              disabled={visibleMonthIndex >= months.length - 1}
              className="h-7 w-7 rounded-md border border-[var(--color-secondary-light)] bg-[var(--color-bg-white)] text-xs font-semibold text-[var(--color-text-main)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              &gt;
            </button>
          </div>
        </div>
        <p className="text-sm text-[var(--color-text-secondary)] md:hidden">마감 날짜를 기준으로 마일스톤을 배치합니다.</p>
        <div className="hidden flex-wrap items-center gap-3 md:flex">
          <p className="text-sm text-[var(--color-text-secondary)]">마감 날짜를 기준으로 마일스톤을 배치합니다.</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setVisibleMonthIndex((index) => Math.max(0, index - 1))}
              disabled={visibleMonthIndex === 0}
              className="h-9 w-9 rounded-lg border border-[var(--color-secondary-light)] bg-[var(--color-bg-white)] text-sm font-semibold text-[var(--color-text-main)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              &lt;
            </button>
            <button
              type="button"
              onClick={() => setVisibleMonthIndex((index) => Math.min(months.length - 1, index + 1))}
              disabled={visibleMonthIndex >= months.length - 1}
              className="h-9 w-9 rounded-lg border border-[var(--color-secondary-light)] bg-[var(--color-bg-white)] text-sm font-semibold text-[var(--color-text-main)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              &gt;
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6">
        {visibleMonth && (
          <div key={visibleMonth.key} className="rounded-lg border border-[var(--color-secondary-light)] bg-[var(--color-bg-light)] p-2 sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-xl font-semibold tracking-[-0.02em] text-[var(--color-text-main)]">{visibleMonth.label}</h3>
              <div className="flex flex-wrap gap-2">
                {['완료', '진행 중', '예정'].map((status) => {
                  const tone = getMilestoneTone(status)
                  return (
                    <span
                      key={status}
                      className="rounded-full px-2.5 py-1 text-xs font-semibold"
                      style={{ backgroundColor: tone.badgeBg, color: tone.badgeText }}
                    >
                      {status}
                    </span>
                  )
                })}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-7 border-y border-l border-[var(--color-secondary-light)] bg-[var(--color-bg-white)] text-center text-[11px] font-semibold text-[var(--color-gray)] sm:text-xs">
              {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
                <div key={day} className="border-r border-[var(--color-secondary-light)] py-1.5 sm:py-2">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 border-l border-[var(--color-secondary-light)]">
              {visibleMonth.days.map((day, index) => {
                const dayMilestones = day ? normalized.filter((milestone) => isSameDate(milestone.end, day)) : []

                return (
                  <div
                    key={`${visibleMonth.key}-${index}`}
                    className={`relative aspect-square min-h-0 border-r border-b border-[var(--color-secondary-light)] p-1 sm:aspect-auto sm:min-h-24 sm:p-2 ${
                      day ? 'bg-[var(--color-bg-white)]' : 'bg-[var(--color-bg-light)]'
                    }`}
                  >
                    {day && (
                      <p className="text-[11px] font-semibold text-[var(--color-gray)] sm:text-xs">{day.getDate()}</p>
                    )}
                    <div className="absolute inset-x-1 bottom-1 flex items-center justify-start gap-1 sm:static sm:mt-2 sm:grid sm:gap-1.5">
                      {dayMilestones.map((milestone) => {
                        const tone = getMilestoneTone(milestone.status)
                        return (
                          <button
                            key={`${milestone.phase}-${milestone.originalIndex}`}
                            type="button"
                            onClick={() => setActiveMilestoneIndex(milestone.originalIndex)}
                            aria-label={`${getPhaseDisplayLabel(milestone.phase)} 상세 보기`}
                            title={getPhaseDisplayLabel(milestone.phase)}
                            className="h-2.5 w-2.5 rounded-full border p-0 shadow-sm transition hover:scale-110 sm:h-auto sm:w-auto sm:rounded-md sm:px-2 sm:py-1.5 sm:text-left sm:text-xs sm:font-semibold sm:leading-5 sm:hover:-translate-y-0.5 sm:hover:scale-100"
                            style={{ borderColor: tone.border, backgroundColor: tone.badgeBg, color: tone.badgeText }}
                          >
                            <span className="hidden whitespace-pre-line sm:block">{getPhaseDisplayLabel(milestone.phase)}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {activeMilestone && (
        <MilestoneModal
          milestone={activeMilestone}
          roles={roles}
          onClose={() => setActiveMilestoneIndex(null)}
          onUpdate={(patch) => onUpdateMilestone(activeMilestone.originalIndex, patch)}
        />
      )}
    </section>
  )
}

function MilestoneModal({ milestone, roles = [], onClose, onUpdate }) {
  const tone = getMilestoneTone(milestone.status)
  const checkpoints = getMilestoneCheckpoints(milestone)
  const completedCheckpoints = milestone.completedCheckpoints || {}

  const toggleCheckpoint = (index) => {
    const nextCompletedCheckpoints = {
      ...completedCheckpoints,
      [index]: !completedCheckpoints[index],
    }
    const allCompleted = checkpoints.length > 0 && checkpoints.every((_, checkpointIndex) => nextCompletedCheckpoints[checkpointIndex])

    onUpdate({
      completedCheckpoints: nextCompletedCheckpoints,
      ...(allCompleted ? { status: '완료' } : {}),
    })
  }

  return (
    <Modal title={`${milestone.phase}: ${milestone.goal}`} onClose={onClose}>
      <div className="grid gap-4">
        <div className="grid gap-3 rounded-lg border border-[var(--color-secondary-light)] bg-[var(--color-bg-light)] p-4 md:grid-cols-2">
          <div>
            <p className="text-xs font-semibold text-[var(--color-gray)]">마감</p>
            <p className="mt-1 text-base font-semibold text-[var(--color-text-main)]">{milestone.deadline}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-[var(--color-gray)]">현재 상태</p>
            <span className="mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold" style={{ backgroundColor: tone.badgeBg, color: tone.badgeText }}>
              {milestone.status}
            </span>
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-[var(--color-dark-gray)]">상태 변경</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {['진행 중', '예정', '완료'].map((status) => {
              const statusTone = getMilestoneTone(status)
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => onUpdate({ status })}
                  className="rounded-lg border px-3 py-2 text-sm font-semibold transition"
                  style={{
                    borderColor: milestone.status === status ? statusTone.border : 'var(--color-secondary-light)',
                    backgroundColor: milestone.status === status ? statusTone.badgeBg : 'var(--color-bg-white)',
                    color: milestone.status === status ? statusTone.badgeText : 'var(--color-text-main)',
                  }}
                >
                  {status}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-[var(--color-dark-gray)]">완료 체크</p>
          <div className="mt-2 grid gap-2">
            {(checkpoints.length ? checkpoints : [milestone.goal]).map((item, index) => {
              const owner = getCheckpointOwner(milestone, index, roles)
              const text = getCheckpointText(item)

              return (
              <label key={`${text}-${index}`} className="flex items-start gap-3 rounded-lg border border-[var(--color-secondary-light)] bg-[var(--color-bg-white)] p-3">
                <input
                  type="checkbox"
                  checked={Boolean(completedCheckpoints[index])}
                  onChange={() => toggleCheckpoint(index)}
                  className="mt-1 h-4 w-4 accent-[var(--color-primary)]"
                />
                <span className="min-w-0 flex-1">
                  <span className={`block text-sm leading-6 text-[var(--color-dark-gray)] ${completedCheckpoints[index] ? 'line-through opacity-60' : ''}`}>
                    {text}
                  </span>
                  <span className="mt-1 block text-xs font-semibold text-[var(--color-primary)]">{owner}</span>
                </span>
              </label>
              )
            })}
          </div>
        </div>
      </div>
    </Modal>
  )
}

export function MeetingMinutesBoard({ embedded = false }) {
  const [activeMeeting, setActiveMeeting] = useState(null)

  const content = (
    <>
      {!embedded && (
        <SectionTitle
          eyebrow="RECORD"
          title="회의록 목록"
          icon={googleMeetIcon}
          iconAlt="Google Meet"
          iconHref="https://meet.google.com/"
        />
      )}
      <div className="mt-4 overflow-hidden rounded-lg border border-[var(--color-secondary-light)] bg-[var(--color-bg-white)]">
        {sampleMeetings.map((meeting) => (
          <button
            key={meeting.date}
            type="button"
            onClick={() => setActiveMeeting(meeting)}
            className="grid w-full grid-cols-[24px_1fr_auto] items-center gap-3 border-b border-[var(--color-secondary-light)] px-3 py-2.5 text-left last:border-b-0 hover:bg-[var(--color-bg-light)]"
          >
            <img src={googleDocsIcon} alt="" className="h-5 w-5 object-contain" />
            <span className="min-w-0">
              <span className="block text-sm font-medium text-[var(--color-text-main)]">{meeting.title}</span>
              <span className="mt-0.5 block text-xs leading-5 text-[var(--color-gray)]">{meeting.summary}</span>
            </span>
            <span className="text-xs font-medium text-[var(--color-gray)]">{meeting.date}</span>
          </button>
        ))}
      </div>
      {activeMeeting && (
        <Modal title={`${activeMeeting.date} 회의록`} onClose={() => setActiveMeeting(null)}>
          <MeetingMinutesDetail meeting={activeMeeting} />
        </Modal>
      )}
    </>
  )

  if (embedded) return content

  return (
    <section className="rounded-xl border border-[var(--color-secondary-light)] bg-[var(--color-bg-white)] p-5">
      {content}
    </section>
  )
}

function MeetingMinutesDetail({ meeting }) {
  return (
    <div className="grid gap-5">
      <div className="grid gap-3 rounded-lg border border-[var(--color-secondary-light)] bg-[var(--color-bg-light)] p-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold text-[var(--color-gray)]">일시</p>
          <p className="mt-1 text-sm font-semibold text-[var(--color-text-main)]">{meeting.date}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-[var(--color-gray)]">참석자</p>
          <p className="mt-1 text-sm font-semibold text-[var(--color-text-main)]">{meeting.attendees?.join(', ') || '팀원 전체'}</p>
        </div>
      </div>

      <div className="grid gap-4">
        {(meeting.sections || []).map((section) => (
          <section key={section.title} className="rounded-lg border border-[var(--color-secondary-light)] bg-[var(--color-bg-white)] p-4">
            <h4 className="text-base font-bold text-[var(--color-text-main)]">{section.title}</h4>
            <ul className="mt-3 grid gap-2">
              {section.items.map((item) => (
                <li key={item} className="text-sm leading-7 text-[var(--color-text-secondary)]">
                  {item}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <section className="rounded-lg border border-[var(--color-secondary-light)] bg-[var(--color-bg-light)] p-4">
        <h4 className="text-base font-bold text-[var(--color-text-main)]">주요 의사결정 사항</h4>
        <ul className="mt-3 grid gap-2">
          {(meeting.decisions || []).map((item) => (
            <li key={item} className="text-sm leading-7 text-[var(--color-text-secondary)]">
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg border border-[var(--color-secondary-light)] bg-[var(--color-bg-white)] p-4">
        <h4 className="text-base font-bold text-[var(--color-text-main)]">추후 일정</h4>
        <ul className="mt-3 grid gap-2">
          {(meeting.nextSchedule || []).map((item) => (
            <li key={item} className="text-sm leading-7 text-[var(--color-text-secondary)]">
              {item}
            </li>
          ))}
        </ul>
      </section>

      <div className="flex items-center gap-3 rounded-lg border border-[var(--color-secondary-light)] bg-[var(--color-bg-light)] px-4 py-3">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--color-bg-white)] text-[var(--color-primary)]">
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-none stroke-current stroke-2">
            <path d="m21.4 11.1-9.2 9.2a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5" />
          </svg>
        </span>
        <span className="min-w-0">
          <span className="block text-xs font-semibold text-[var(--color-gray)]">녹취록 첨부파일</span>
          <span className="mt-0.5 block text-sm font-semibold text-[var(--color-text-main)]">{meeting.attachment || 'meeting_transcript.txt'}</span>
        </span>
      </div>
    </div>
  )
}

export function InsightPopover({ type, title, items = [] }) {
  const [open, setOpen] = useState(false)
  const isWarning = type === 'warning'

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex h-11 min-w-[132px] items-center justify-center gap-2 whitespace-nowrap rounded-lg border px-4 text-sm font-semibold ${
          isWarning
            ? 'border-[var(--color-light-yellow)] bg-[var(--color-light-yellow)] text-[var(--color-black)]'
            : 'border-[var(--color-light-green)] bg-[var(--color-light-green)] text-[var(--color-black)]'
        }`}
      >
        <img src={isWarning ? developPointIcon : adviceIcon} alt="" className="h-5 w-5 object-contain" />
        {title}
      </button>
      {open && (
        <Modal title={title} onClose={() => setOpen(false)}>
          <ListItems items={items} tone={isWarning ? 'yellow' : 'green'} />
        </Modal>
      )}
    </>
  )
}
