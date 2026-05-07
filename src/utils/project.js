import { createStarterProject } from '../data/demoData.js'

export const STORAGE_KEY = 'gemmate_projects'

export const makeId = () => `project_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

export const createEmptyForm = () => ({
  title: '',
  course: '',
  deadline: '',
  notice: '',
  rubric: '',
  fileSummary: '',
  memberCount: 2,
})

export const createEmptyProfile = () => ({
  name: '',
  selectedSkills: [],
  strengths: '',
  weakness: '',
  preferredRole: '',
  availableTime: '',
})

export function parseHashRoute() {
  const raw = window.location.hash.replace(/^#\/?/, '')
  const [screen, projectId] = raw.split('/')
  if (screen === 'dashboard') return { screen: 'dashboard', projectId: null }
  if (screen === 'create') return { screen: 'create', projectId: null }
  if (screen === 'professor') return { screen: 'professor', projectId: null }
  if (screen === 'project' && projectId) return { screen: 'project', projectId }
  return { screen: 'landing', projectId: null }
}

export function toHash(screen, projectId = null) {
  if (screen === 'dashboard') return '#/dashboard'
  if (screen === 'create') return '#/create'
  if (screen === 'professor') return '#/professor'
  if (screen === 'project' && projectId) return `#/project/${projectId}`
  return '#/'
}

export function buildDeadlineOptions(days) {
  const formatter = new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  })
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(today)
    date.setDate(today.getDate() + index)
    return {
      value: date.toISOString().slice(0, 10),
      label: formatter.format(date),
    }
  })
}

export function normalizeMilestonesForCalendar(milestones = []) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (!milestones.length) {
    return [
      {
        originalIndex: 0,
        phase: 'Phase 1',
        deadline: '일정 없음',
        goal: '마일스톤을 생성해 주세요',
        start: today,
        end: today,
        status: '예정',
      },
    ]
  }

  const parsed = milestones.map((milestone, index) => {
    const end = parseLooseDate(milestone.deadline) || addDays(today, (index + 1) * 7)
    const start = index === 0 ? today : addDays(parseLooseDate(milestones[index - 1]?.deadline) || addDays(today, index * 7), 1)
    return {
      ...milestone,
      originalIndex: index,
      phase: milestone.phase || `Phase ${index + 1}`,
      goal: milestone.goal || milestone.title || '목표 없음',
      deadline: milestone.deadline || formatShortDate(end),
      start,
      end: end < start ? start : end,
    }
  })

  return parsed.sort((a, b) => a.start - b.start)
}

export function assignMilestoneStatuses(milestones = []) {
  return milestones.map((milestone) => {
    if (['완료', '진행 중', '예정'].includes(milestone.status)) return milestone
    return { ...milestone, status: '예정' }
  })
}

export function getMilestoneTone(status) {
  const tones = {
    완료: {
      bar: 'var(--color-light-green)',
      barText: 'var(--color-black)',
      badgeBg: 'var(--color-light-green)',
      badgeText: 'var(--color-black)',
      border: '#9bbf91',
      detailBg: '#f4faf2',
    },
    '진행 중': {
      bar: 'var(--color-primary)',
      barText: '#ffffff',
      badgeBg: 'var(--color-primary)',
      badgeText: '#ffffff',
      border: 'var(--color-primary)',
      detailBg: 'var(--color-primary-light)',
    },
    예정: {
      bar: 'var(--color-secondary-light)',
      barText: 'var(--color-text-main)',
      badgeBg: 'var(--color-secondary-light)',
      badgeText: 'var(--color-text-main)',
      border: 'var(--color-secondary-light)',
      detailBg: 'var(--color-bg-light)',
    },
  }

  return tones[status] || tones.예정
}

export function buildCalendarMonths(milestones = []) {
  const first = milestones[0]?.end || new Date()
  const last = milestones[milestones.length - 1]?.end || first
  const start = new Date(first.getFullYear(), first.getMonth(), 1)
  const end = new Date(last.getFullYear(), last.getMonth(), 1)
  const formatter = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long' })
  const months = []
  const cursor = new Date(start)

  while (cursor <= end) {
    const monthStart = new Date(cursor)
    const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0)
    const days = []

    for (let index = 0; index < monthStart.getDay(); index += 1) {
      days.push(null)
    }

    for (let day = 1; day <= monthEnd.getDate(); day += 1) {
      days.push(new Date(cursor.getFullYear(), cursor.getMonth(), day))
    }

    while (days.length % 7 !== 0) {
      days.push(null)
    }

    months.push({
      key: `${cursor.getFullYear()}-${cursor.getMonth()}`,
      label: formatter.format(cursor),
      days,
    })

    cursor.setMonth(cursor.getMonth() + 1)
  }

  return months
}

export function getInitialCalendarMonthIndex(months = []) {
  const today = new Date()
  const currentIndex = months.findIndex((month) =>
    month.days.some((day) => day && day.getFullYear() === today.getFullYear() && day.getMonth() === today.getMonth()),
  )

  if (currentIndex >= 0) return currentIndex
  return 0
}

export function getPhaseNumber(phase = '') {
  const match = String(phase).match(/phase\s*(\d+)/i)
  return match?.[1] || ''
}

export function getPhaseDisplayLabel(phase = '') {
  const rawPhase = String(phase).trim()
  const number = getPhaseNumber(phase)
  const [, detail = ''] = rawPhase.split(/phase\s*\d+\s*:?\s*/i)
  const phaseDetail = detail.split(':')[0]?.trim()
  const compactDetail = truncatePhaseDetail(phaseDetail)
  if (number) return compactDetail ? `Phase ${number}:\n${compactDetail}` : `Phase ${number}`

  const [label = 'Phase', next = ''] = rawPhase.split(':').map((part) => part.trim())
  const compactNext = truncatePhaseDetail(next)
  return compactNext ? `${label}:\n${compactNext}` : label
}

function truncatePhaseDetail(value = '') {
  const normalized = String(value).trim()
  return normalized.length > 6 ? `${normalized.slice(0, 6)}...` : normalized
}

export function getPhaseMobileLabel(phase = '') {
  const number = getPhaseNumber(phase)
  if (number) return `P.${number}`
  return getPhaseDisplayLabel(phase).slice(0, 4)
}

export function getRoleProgressSummary(role, roleIndex, roles = [], milestones = []) {
  const normalized = assignMilestoneStatuses(normalizeMilestonesForCalendar(milestones))
  const inProgressMilestones = normalized.filter((milestone) => milestone.status === '진행 중')
  const assignedMilestones = inProgressMilestones
    .map((milestone) => {
      const checkpoints = getMilestoneCheckpoints(milestone)
      const assignedIndexes = checkpoints
        .map((item, index) => ({ item, index }))
        .filter(({ index }) => getCheckpointOwnerIndex(milestone, index, roles) === roleIndex)

      return { milestone, assignedIndexes }
    })
    .filter(({ assignedIndexes }) => assignedIndexes.length > 0)

  if (!assignedMilestones.length) {
    return {
      progress: 0,
      urgent: false,
      nearestLabel: '진행 중 Phase 업무 없음',
    }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const totals = assignedMilestones.reduce(
    (acc, { milestone, assignedIndexes }) => {
      const total = assignedIndexes.length
      const completed = assignedIndexes.filter(({ index }) => milestone.completedCheckpoints?.[index]).length
      return {
        total: acc.total + total,
        completed: acc.completed + completed,
      }
    },
    { total: 0, completed: 0 },
  )
  const progress = totals.total ? Math.round((totals.completed / totals.total) * 100) : 0
  const nearest = assignedMilestones
    .slice()
    .sort((a, b) => a.milestone.end - b.milestone.end)[0]
  const daysLeft = Math.ceil((nearest.milestone.end - today) / 86400000)

  return {
    progress,
    urgent: daysLeft <= 3 && totals.completed === 0,
    nearestLabel: `${nearest.milestone.phase} · ${totals.completed}/${totals.total} 완료`,
  }
}

export function getMilestoneCheckpoints(milestone) {
  return milestone.checkpoints || milestone.tasks || []
}

export function getCheckpointText(item) {
  if (typeof item === 'string') return item
  return item?.task || item?.text || item?.title || item?.goal || '세부 업무'
}

export function getCheckpointOwner(milestone, checkpointIndex, roles = []) {
  const checkpoint = getMilestoneCheckpoints(milestone)[checkpointIndex]
  if (checkpoint && typeof checkpoint === 'object') {
    if (checkpoint.owner) return checkpoint.owner
    if (checkpoint.assignee) return checkpoint.assignee
    if (checkpoint.member) return checkpoint.member
  }

  const role = roles[getCheckpointOwnerIndex(milestone, checkpointIndex, roles)]
  if (!role) return '담당자 미정'
  return role.role_title ? `${role.member} · ${role.role_title}` : role.member
}

export function getCheckpointOwnerIndex(milestone, checkpointIndex, roles = []) {
  if (!roles.length) return -1
  const checkpoint = getMilestoneCheckpoints(milestone)[checkpointIndex]
  const explicitOwner = checkpoint && typeof checkpoint === 'object'
    ? checkpoint.owner || checkpoint.assignee || checkpoint.member
    : ''

  if (explicitOwner) {
    const matchedIndex = roles.findIndex((role) => isSameOwner(role, explicitOwner))
    if (matchedIndex >= 0) return matchedIndex
  }

  return (milestone.originalIndex + checkpointIndex) % roles.length
}

export function isSameOwner(role, owner) {
  const normalizedOwner = normalizeOwnerName(owner)
  return [role.member, role.role_title, `${role.member} ${role.role_title}`, `${role.member} · ${role.role_title}`]
    .filter(Boolean)
    .some((value) => normalizeOwnerName(value).includes(normalizedOwner) || normalizedOwner.includes(normalizeOwnerName(value)))
}

export function normalizeOwnerName(value = '') {
  return String(value).replace(/\s|·|\//g, '').toLowerCase()
}

export function isSameDate(left, right) {
  return (
    left?.getFullYear() === right?.getFullYear() &&
    left?.getMonth() === right?.getMonth() &&
    left?.getDate() === right?.getDate()
  )
}

export function parseLooseDate(value) {
  if (!value) return null
  const text = String(value)
  const match = text.match(/20\d{2}\D+\d{1,2}\D+\d{1,2}/)
  if (!match) return null

  const [year, month, day] = match[0].split(/\D+/).filter(Boolean).map(Number)
  const date = new Date(year, month - 1, day)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatShortDate(date) {
  return `${date.getMonth() + 1}/${date.getDate()}`
}

export function addDays(date, days) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

export function loadProjects() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return [createStarterProject()]
    const parsed = JSON.parse(saved)
    if (!Array.isArray(parsed) || !parsed.length) return [createStarterProject()]

    const starterProject = createStarterProject()
    return parsed.map((project) => (project?.id === 'starter_value_investing_2026' ? starterProject : project))
  } catch {
    return [createStarterProject()]
  }
}

export function normalizeTasks(tasks) {
  if (!Array.isArray(tasks)) return []
  return tasks.map((task) => ({
    ...task,
    id: makeId(),
    done: false,
  }))
}

export function limitText(text, maxLength) {
  if (!text) return ''
  return text.length > maxLength ? `${text.slice(0, maxLength)}\n[내용이 길어 일부만 전달됨]` : text
}
