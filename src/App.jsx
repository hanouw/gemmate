import { useEffect, useMemo, useState } from 'react'
import { Modal, PageHead, TimelineRow, MiniStat, ReadOnlyBlock, Panel, TextInput, TextArea, Pill, PrimaryButton, SecondaryButton, DangerButton, ErrorBox, DeadlineSelect } from './components/ui.jsx'
import { CalendarMilestones, MeetingMinutesBoard, InsightPopover } from './components/projectSections.jsx'
import { skillKeywords, sampleMeetings } from './data/demoData.js'
import { callGemini, hasGeminiApiKey } from './services/gemini.js'
import { STORAGE_KEY, makeId, createEmptyForm, createEmptyProfile, parseHashRoute, toHash, getRoleProgressSummary, getMilestoneCheckpoints, getCheckpointOwner, loadProjects, normalizeTasks } from './utils/project.js'
import googleCalendarIcon from './assets/google-calendar.png'
import googleDocsIcon from './assets/google-docs.png'
import googleDriveIcon from './assets/google-drive.png'
import googleMeetIcon from './assets/google-meet.png'

function App() {
  const [screen, setScreen] = useState('landing')
  const [form, setForm] = useState(createEmptyForm)
  const [projects, setProjects] = useState(loadProjects)
  const [activeProjectId, setActiveProjectId] = useState(null)
  const [isReadingFiles, setIsReadingFiles] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState('')

  const activeProject = projects.find((project) => project.id === activeProjectId) || null
  const canCreate = useMemo(
    () => form.title.trim() && form.course.trim() && form.deadline.trim() && form.rubric.trim(),
    [form],
  )

  useEffect(() => {
    const syncFromHash = () => {
      const route = parseHashRoute()
      setScreen(route.screen)
      setActiveProjectId(route.projectId)
      setError('')
    }

    syncFromHash()
    window.addEventListener('hashchange', syncFromHash)
    return () => window.removeEventListener('hashchange', syncFromHash)
  }, [])

  const navigate = (nextScreen, projectId = null) => {
    const nextHash = toHash(nextScreen, projectId)
    if (window.location.hash === nextHash) {
      setScreen(nextScreen)
      setActiveProjectId(projectId)
      setError('')
      return
    }
    window.location.hash = nextHash
  }

  const saveProjects = (nextProjects) => {
    setProjects(nextProjects)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextProjects))
  }

  const updateProject = (projectId, patch) => {
    const nextProjects = projects.map((project) =>
      project.id === projectId ? { ...project, ...patch, updatedAt: new Date().toISOString() } : project,
    )
    saveProjects(nextProjects)
  }

  const resetForm = () => {
    setForm(createEmptyForm())
    setError('')
    navigate('create')
  }

  const createProject = () => {
    setError('')
    if (!canCreate) {
      setError('프로젝트명, 강의명, 종료 날짜, 평가기준은 필수 입력값입니다.')
      return
    }

    const project = {
      id: makeId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      input: structuredClone(form),
      selfProfile: null,
      gemini: null,
      progress: {
        tasks: [],
        minutes: [],
        memberProgress: Array.from({ length: form.memberCount }, (_, index) => ({
          label: `팀원 ${index + 1}`,
          progress: 0,
        })),
      },
    }

    saveProjects([project, ...projects])
    navigate('project', project.id)
  }

  const handleFiles = async (files) => {
    if (!files.length) return
    setIsReadingFiles(true)
    setError('')

    try {
      const summaries = await Promise.all(
        Array.from(files).map(async (file) => {
          const textLike = /\.(txt|md|csv|json|html|css|js|jsx|ts|tsx)$/i.test(file.name)
          if (!textLike) return `[${file.name}] 파일명만 전달됨`
          const text = await file.text()
          return `[${file.name}]\n${text.slice(0, 3000)}`
        }),
      )
      setForm((current) => ({ ...current, fileSummary: summaries.join('\n\n') }))
    } catch {
      setError('파일을 읽는 중 문제가 생겼습니다.')
    } finally {
      setIsReadingFiles(false)
    }
  }

  const runAiDistribution = async (project, profile) => {
    setError('')
    if (!hasGeminiApiKey) {
      setError('GAK가 설정되어 있지 않습니다. Vercel 환경 변수에 Gemini API 키를 넣고 재배포해 주세요.')
      return
    }

    setIsGenerating(true)
    try {
      const gemini = await callGemini(project, profile)
      updateProject(project.id, {
        selfProfile: profile,
        gemini,
        rolesPanelSeen: false,
        progress: {
          ...project.progress,
          tasks: normalizeTasks(gemini.meeting_tasks),
        },
      })
    } catch (requestError) {
      setError(requestError.message || 'Gemini API 호출 중 문제가 생겼습니다.')
    } finally {
      setIsGenerating(false)
    }
  }

  const openProject = (projectId) => navigate('project', projectId)

  const deleteProject = (projectId) => {
    saveProjects(projects.filter((project) => project.id !== projectId))
    navigate('dashboard')
  }

  return (
    <main className="min-h-screen bg-[var(--color-bg-light)] text-[var(--color-black)]">
      <Header navigate={navigate} screen={screen} />
      {screen === 'landing' && <Landing onStart={resetForm} onDashboard={() => navigate('dashboard')} projectCount={projects.length} />}
      {screen === 'dashboard' && <Dashboard projects={projects} onCreate={resetForm} onOpen={openProject} onDelete={deleteProject} />}
      {screen === 'professor' && <ProfessorReport projects={projects} onOpenProject={openProject} />}
      {screen === 'create' && (
        <ProjectCreate
          form={form}
          setForm={setForm}
          handleFiles={handleFiles}
          isReadingFiles={isReadingFiles}
          canCreate={canCreate}
          error={error}
          onCreate={createProject}
        />
      )}
      {screen === 'project' && (
        <ProjectDetail
          project={activeProject}
          error={error}
          isGenerating={isGenerating}
          onBack={() => navigate('dashboard')}
          onDelete={deleteProject}
          onRunAi={runAiDistribution}
          onUpdateProject={updateProject}
        />
      )}
    </main>
  )
}

function Header({ navigate, screen }) {
  const isProfessor = screen === 'professor'

  return (
    <header className="border-b border-[var(--color-secondary-light)] bg-[var(--color-bg-light)]">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <button type="button" onClick={() => navigate('landing')} className="text-left">
          <span className="block text-lg font-semibold tracking-[-0.02em] text-[var(--color-primary)]">Gemmate</span>
          <span className="block text-xs text-[var(--color-secondary)]">Yonsei x Gemini</span>
        </button>
        <SecondaryButton onClick={() => navigate(isProfessor ? 'dashboard' : 'professor')}>
          {isProfessor ? '학생페이지로 전환' : '교수님 페이지로 전환'}
        </SecondaryButton>
      </div>
    </header>
  )
}

function Landing({ onStart, onDashboard, projectCount }) {
  const problemCards = [
    {
      title: '무임승차를 줄이는 투명한 기준',
      text: '역할, 마감, 완료 체크를 한 화면에 남겨 팀원이 어떤 업무를 맡았고 어디까지 진행했는지 확인할 수 있습니다.',
    },
    {
      title: '감정 소모보다 학습 몰입',
      text: '회의 후 할 일, 방향성, 마일스톤을 AI가 정리해 팀원들은 자료 조사와 분석 같은 핵심 학습에 집중합니다.',
    },
    {
      title: '갈등 전에 먼저 정리되는 협업',
      text: '역할이 모호하거나 일정이 밀릴 때 Gemini가 기준을 제안하고, 팀은 같은 계획표를 보며 조율합니다.',
    },
  ]
  const featureCards = [
    {
      label: '01',
      title: '구글 워크스페이스 연동',
      icon: googleDriveIcon,
      text: '모두가 사용하는 구글을 활용한 데이터 입력과 결과 공유로 별도의 학습 없이도 팀원들이 쉽게 접근할 수 있습니다.',
    },
    {
      label: '02',
      title: '역량 기반 역할 분배',
      icon: googleDocsIcon,
      text: '본인이 선택한 역량 키워드와 팀원 수를 바탕으로 자료조사, 분석, 스토리보드, 발표, 검수 역할을 나눕니다.',
    },
    {
      label: '03',
      title: '마일스톤 달력',
      icon: googleCalendarIcon,
      text: '최종 마감일부터 역산해 단계별 완료일을 만들고, 각 업무의 담당자와 완료 상태를 달력에서 관리합니다.',
    },
    {
      label: '04',
      title: '회의 기록과 후속 조치',
      icon: googleMeetIcon,
      text: '회의록 예시처럼 논의 주제, 의사결정, 다음 회의 전 완료할 일을 정리해 프로젝트 방향이 흩어지지 않게 합니다.',
    },
  ]

  return (
    <>
      <section className="relative isolate overflow-hidden border-b border-[var(--color-secondary-light)] bg-[var(--color-bg-white)]">
        <div
          className="absolute inset-0 -z-10"
          style={{
            background:
              'linear-gradient(135deg, rgba(215,227,255,0.9) 0%, rgba(255,255,255,0.96) 35%, rgba(235,226,255,0.72) 70%, rgba(255,255,255,0.98) 100%)',
          }}
        />
        <div className="mx-auto grid min-h-[calc(100vh-64px)] max-w-6xl gap-10 px-5 py-16 lg:grid-cols-[1fr_0.92fr] lg:items-center lg:py-20">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(0,56,118,0.18)] bg-white/70 px-3 py-1 text-xs font-semibold text-[var(--color-primary)] shadow-sm backdrop-blur">
              <GeminiMark className="h-4 w-4" />
              Yonsei Social Sciences x Gemini
            </div>
            <h1 className="mt-7 max-w-3xl text-5xl font-semibold leading-[1.02] tracking-[-0.05em] text-[var(--color-text-main)] sm:text-6xl lg:text-7xl">
              팀플을 관리하는 AI 팀메이트, Gemmate
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-[var(--color-text-secondary)]">
              Gemmate는 대학 팀 프로젝트에서 반복되는 무임승차, 역할 불균형, 회의 후 정리 누락을 줄이기 위한 협업 시스템입니다.
              과제 기준과 팀원의 역량을 Gemini가 함께 읽고, 실행 가능한 역할 분배와 마감 기반 계획으로 바꿉니다.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <PrimaryButton onClick={onStart}>프로젝트 만들기</PrimaryButton>
              <SecondaryButton onClick={onDashboard}>저장된 프로젝트 {projectCount > 0 ? `(${projectCount})` : ''}</SecondaryButton>
            </div>
            <div className="mt-9 grid max-w-2xl gap-3 sm:grid-cols-3">
              <LandingMetric value="Automation" label="회의록 자동 작성" />
              <LandingMetric value="Distribution" label="업무 자동 분배" />
              <LandingMetric value="Connect" label="Google 워크스페이스 연동" />
            </div>
          </div>
          <HeroPreview />
        </div>
      </section>

      <section className="bg-[var(--color-bg-navy)] px-5 py-14 text-white">
        <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-3">
          {problemCards.map((card, index) => (
            <article key={card.title} className="rounded-xl border border-white/15 bg-white/[0.06] p-5 backdrop-blur">
              <span className="text-xs font-semibold text-[#8AB4F8]">Pain Point 0{index + 1}</span>
              <h2 className="mt-4 text-xl font-semibold text-white">{card.title}</h2>
              <p className="mt-3 text-sm leading-6 text-white/72">{card.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-b border-[var(--color-secondary-light)] bg-[var(--color-bg-white)] px-5 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
            <div>
              <PageHead
                eyebrow="How It Works"
                title="Gemini가 팀장처럼 읽고, 나누고, 점검합니다"
                description="강의계획서, 평가기준, 팀원 역량, 회의 내용을 하나의 프로젝트 맥락으로 연결해 역할과 일정이 따로 놀지 않게 만드는 흐름입니다."
              />
            </div>
            <div className="grid gap-3">
              {featureCards.map((card) => (
                <LandingFeatureStep key={card.label} card={card} />
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

function GeminiMark({ className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className}>
      <path fill="#4285F4" d="M16 2.5c1.5 6.5 4 9 10.5 10.5C20 14.5 17.5 17 16 23.5 14.5 17 12 14.5 5.5 13 12 11.5 14.5 9 16 2.5Z" />
      <path fill="#EA4335" d="M22.5 4.5c.6 2.4 1.6 3.4 4 4-2.4.6-3.4 1.6-4 4-.6-2.4-1.6-3.4-4-4 2.4-.6 3.4-1.6 4-4Z" />
      <path fill="#34A853" d="M10.5 20c.8 3.2 2 4.5 5.2 5.2-3.2.8-4.5 2-5.2 5.2-.8-3.2-2-4.5-5.2-5.2 3.2-.7 4.5-2 5.2-5.2Z" />
      <path fill="#FBBC05" d="M24.8 21.5c.5 1.8 1.2 2.5 3 3-1.8.5-2.5 1.2-3 3-.5-1.8-1.2-2.5-3-3 1.8-.5 2.5-1.2 3-3Z" />
    </svg>
  )
}

function LandingMetric({ value, label }) {
  return (
    <div className="rounded-xl border border-white/60 bg-white/55 px-4 py-3 shadow-sm backdrop-blur">
      <p className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-text-main)]">{value}</p>
      <p className="mt-1 text-xs font-semibold text-[var(--color-secondary)]">{label}</p>
    </div>
  )
}

function HeroPreview() {
  return (
    <div className="relative">
      <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-white/45 blur-2xl" />
      <div className="rounded-[1.75rem] border border-white/70 bg-white/70 p-4 shadow-[0_28px_80px_rgba(0,35,78,0.16)] backdrop-blur">
        <div className="flex items-center justify-between border-b border-[rgba(0,56,118,0.12)] pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-primary)]">Gemmate Console</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-[var(--color-text-main)]">더 나은 퀄리티를 위한 AI</h2>
          </div>
          <div className="flex items-center gap-2">
            {[googleDocsIcon, googleDriveIcon, googleCalendarIcon, googleMeetIcon].map((icon) => (
              <span key={icon} className="grid h-9 w-9 place-items-center rounded-xl bg-white shadow-sm">
                <img src={icon} alt="" className="h-5 w-5 object-contain" />
              </span>
            ))}
          </div>
        </div>
        <div className="grid gap-4 pt-4">
          <div className="rounded-2xl border border-[rgba(0,56,118,0.12)] bg-[var(--color-bg-white)] p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-[var(--color-secondary)]">Direction</p>
                <p className="mt-2 text-lg font-semibold leading-6 tracking-[-0.03em] text-[var(--color-text-main)]">
                  평가기준과 역할을 연결해 실행 가능한 계획으로 전환
                </p>
              </div>
              <GeminiMark className="h-9 w-9 shrink-0" />
            </div>
            <div className="mt-4 grid gap-2">
              {['회의록 자동 작성', '역할 자동 분배', '마감 기반 마일스톤'].map((item, index) => (
                <div key={item} className="flex items-center gap-3 rounded-xl bg-[var(--color-bg-light)] px-3 py-2">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-[var(--color-primary)] text-[11px] font-semibold text-white">{index + 1}</span>
                  <span className="text-sm font-semibold text-[var(--color-text-secondary)]">{item}</span>
                </div>
              ))}
            </div>
          </div>
          <AgentPanel />
        </div>
      </div>
    </div>
  )
}

function LandingFeatureStep({ card }) {
  return (
    <article className="group grid gap-4 rounded-xl border border-[var(--color-secondary-light)] bg-[var(--color-bg-white)] p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgba(0,35,78,0.09)] sm:grid-cols-[72px_1fr]">
      <div className="flex items-center gap-3 sm:block">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--color-bg-light)]">
          <img src={card.icon} alt="" className="h-7 w-7 object-contain" />
        </div>
        <span className="text-xs font-semibold text-[var(--color-primary)] sm:mt-4 sm:block">{card.label}</span>
      </div>
      <div>
        <h2 className="text-xl font-semibold tracking-[-0.03em] text-[var(--color-text-main)]">{card.title}</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">{card.text}</p>
      </div>
    </article>
  )
}

function AgentPanel() {
  return (
    <div className="rounded-2xl border border-[rgba(0,56,118,0.12)] bg-[var(--color-bg-white)]">
      <div className="border-b border-[rgba(0,56,118,0.12)] px-5 py-4">
        <p className="text-sm font-semibold text-[var(--color-primary)]">Gemmate agent timeline</p>
      </div>
      <div className="grid gap-3 p-5">
        <TimelineRow tone="blue" label="READ" text="평가기준과 공지사항을 읽습니다." />
        <TimelineRow tone="green" label="MATCH" text="내 역량과 팀원 수를 바탕으로 역할을 추론합니다." />
        <TimelineRow tone="yellow" label="PLAN" text="마감일부터 역산한 마일스톤을 구성합니다." />
        <TimelineRow tone="red" label="DONE" text="프로젝트 계획을 제안합니다." />
      </div>
    </div>
  )
}

function Dashboard({ projects, onCreate, onOpen, onDelete }) {
  return (
    <section className="px-5 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <PageHead eyebrow="Dashboard" title="저장된 프로젝트" description="" />
          <div className="sm:pb-1">
            <PrimaryButton onClick={onCreate}>새 프로젝트</PrimaryButton>
          </div>
        </div>
        {projects.length === 0 ? (
          <EmptyState onCreate={onCreate} />
        ) : (
          <div className="mt-10 grid gap-4 lg:grid-cols-2">
            {projects.map((project) => (
              <article key={project.id} className="rounded-xl border border-[var(--color-secondary-light)] bg-[var(--color-bg-white)] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-[var(--color-secondary)]">{project.input.course}</p>
                    <h2 className="mt-2 text-2xl font-normal tracking-[-0.025em] text-[var(--color-text-main)]">{project.input.title}</h2>
                  </div>
                  <DashboardStatusPill done={Boolean(project.gemini)} />
                </div>
                <div className="mt-5 grid gap-2 sm:grid-cols-3">
                  <MiniStat label="팀원 수" value={`${project.input.memberCount}명`} />
                  <MiniStat label="마감" value={project.input.deadline} />
                  <MiniStat label="내 역량" value={project.selfProfile ? '입력됨' : '필요'} />
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <PrimaryButton onClick={() => onOpen(project.id)}>프로젝트 열기</PrimaryButton>
                  <SecondaryButton onClick={() => onDelete(project.id)}>삭제</SecondaryButton>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function EmptyState({ onCreate }) {
  return (
    <div className="mt-10 rounded-xl border border-dashed border-[var(--color-secondary-light)] bg-[var(--color-bg-white)] p-10 text-center">
      <h2 className="text-2xl font-normal tracking-[-0.02em] text-[var(--color-text-main)]">아직 프로젝트가 없습니다</h2>
      <p className="mt-3 text-[var(--color-text-secondary)]">프로젝트 정보를 입력하면 이곳에 저장됩니다.</p>
      <div className="mt-6">
        <PrimaryButton onClick={onCreate}>첫 프로젝트 만들기</PrimaryButton>
      </div>
    </div>
  )
}

function DashboardStatusPill({ done }) {
  return (
    <span className="inline-flex shrink-0 flex-col rounded-full bg-[var(--color-primary-light)] px-3 py-1 text-center text-[11px] font-semibold uppercase leading-tight tracking-[0.08em] text-[var(--color-primary)] sm:flex-row sm:gap-1">
      {done ? (
        <>
          <span>AI</span>
          <span>완료</span>
        </>
      ) : (
        <>
          <span>입력</span>
          <span>대기</span>
        </>
      )}
    </span>
  )
}

function ProfessorReport({ projects = [], onOpenProject }) {
  const summaries = projects.map(buildProfessorProjectSummary)
  const averageProgress = summaries.length
    ? Math.round(summaries.reduce((sum, summary) => sum + summary.completion, 0) / summaries.length)
    : 0
  const urgentProjects = summaries.filter((summary) => summary.hasUrgentRole).length

  return (
    <section className="px-5 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-[1.5rem] border border-[var(--color-secondary-light)] bg-[var(--color-bg-white)] p-5 shadow-[0_20px_60px_rgba(0,35,78,0.08)] sm:p-7">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
            <PageHead
              eyebrow="Professor Report"
              title="학생 프로젝트 진행 현황 리포트"
              description="학생들이 생성한 프로젝트의 역할 분배, 마일스톤 진행률, 리스크를 교수자 관점에서 한 장으로 확인합니다."
            />
            <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[390px]">
              <MiniStat label="관리 프로젝트" value={`${summaries.length}개`} />
              <MiniStat label="평균 진행률" value={`${averageProgress}%`} />
              <MiniStat label="주의 필요" value={`${urgentProjects}개`} />
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <ProfessorSignal label="평가 근거" value="역할·업무·완료 체크" tone="blue" />
            <ProfessorSignal label="주의 필요" value={`${urgentProjects}개 프로젝트`} tone={urgentProjects ? 'red' : 'green'} />
            <ProfessorSignal label="리포트 기준" value="학생 저장 데이터" tone="yellow" />
          </div>

          <div className="mt-8 grid gap-5">
            {summaries.length ? (
              summaries.map((summary) => (
                <ProfessorProjectCard key={summary.project.id} summary={summary} onOpenProject={onOpenProject} />
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-[var(--color-secondary-light)] bg-[var(--color-bg-light)] p-8 text-center">
                <h2 className="text-xl font-semibold text-[var(--color-text-main)]">아직 확인할 프로젝트가 없습니다</h2>
                <p className="mt-2 text-sm text-[var(--color-text-secondary)]">학생 프로젝트가 생성되면 이곳에 리포트가 표시됩니다.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

function ProfessorSignal({ label, value, tone }) {
  const tones = {
    blue: 'bg-[var(--color-light-blue)]',
    green: 'bg-[var(--color-light-green)]',
    yellow: 'bg-[var(--color-light-yellow)]',
    red: 'bg-[var(--color-light-red)]',
  }

  return (
    <div className={`${tones[tone]} rounded-xl border border-[var(--color-secondary-light)] p-4`}>
      <p className="text-xs font-semibold text-[var(--color-gray)]">{label}</p>
      <p className="mt-1 text-lg font-semibold text-[var(--color-text-main)]">{value}</p>
    </div>
  )
}

function ProfessorProjectCard({ summary, onOpenProject }) {
  const [showAiSummary, setShowAiSummary] = useState(false)
  const { project, completion, completedCount, checkpointCount, statusCounts, direction } = summary

  return (
    <article className="rounded-xl border border-[var(--color-secondary-light)] bg-[var(--color-bg-light)] p-5">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <p className="text-sm font-semibold text-[var(--color-primary)]">{project.input.course}</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-[var(--color-text-main)]">{project.input.title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--color-text-secondary)]">
            {direction?.one_line || '아직 AI 분배 결과가 없어 프로젝트 방향성이 생성되지 않았습니다.'}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <PrimaryButton onClick={() => setShowAiSummary(true)}>AI 요약</PrimaryButton>
          <SecondaryButton onClick={() => onOpenProject(project.id)}>프로젝트 열기</SecondaryButton>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-[var(--color-secondary-light)] bg-[var(--color-bg-white)] p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-[var(--color-gray)]">전체 진행률</p>
            <p className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-[var(--color-text-main)]">{completion}%</p>
          </div>
          <p className="text-sm font-semibold text-[var(--color-text-secondary)]">{completedCount}/{checkpointCount || 0} 완료</p>
        </div>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-[var(--color-bg-light)]">
          <div className="h-full rounded-full bg-[var(--color-primary)]" style={{ width: `${completion}%` }} />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <MiniStat label="완료" value={`${statusCounts.done}개`} />
          <MiniStat label="진행 중" value={`${statusCounts.active}개`} />
          <MiniStat label="예정" value={`${statusCounts.pending}개`} />
        </div>
      </div>

      {showAiSummary && <ProfessorAiSummaryModal summary={summary} onClose={() => setShowAiSummary(false)} />}
    </article>
  )
}

function ProfessorAiSummaryModal({ summary, onClose }) {
  const { project, roles, roleContributions, milestones } = summary
  const meetings = sampleMeetings.slice(0, 3)
  const completedMilestones = milestones.filter((milestone) => milestone.status === '완료').length
  const activeMilestones = milestones.filter((milestone) => milestone.status === '진행 중').length

  return (
    <Modal title={`${project.input.title} AI 요약`} onClose={onClose}>
      <div className="grid gap-5">
        <ReadOnlyBlock
          title="종합 요약"
          text={`이 프로젝트는 ${project.input.course} 과제로, 현재 마일스톤 ${milestones.length}개 중 완료 ${completedMilestones}개, 진행 중 ${activeMilestones}개 상태입니다. 회의록과 업무 배정 기록을 기준으로 보면 팀원별 역할이 비교적 명확하게 나뉘어 있으며, 교수자는 진행률과 역할 수행 흔적을 평가 참고자료로 확인할 수 있습니다.`}
        />

        <section className="rounded-lg border border-[var(--color-secondary-light)] bg-[var(--color-bg-light)] p-4">
          <h3 className="text-base font-semibold text-[var(--color-text-main)]">역할 및 맡은 비율</h3>
          <div className="mt-3 grid gap-3">
            {(roles.length ? roleContributions : []).map(({ role, ratio, assignedTasks }) => (
              <div key={role.member} className="rounded-lg border border-[var(--color-secondary-light)] bg-[var(--color-bg-white)] p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-[var(--color-text-main)]">{role.member} · {role.role_title}</p>
                  <span className="text-sm font-semibold text-[var(--color-primary)]">{ratio}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--color-bg-light)]">
                  <div className="h-full rounded-full bg-[var(--color-primary)]" style={{ width: `${ratio}%` }} />
                </div>
                <ul className="mt-3 grid gap-1.5">
                  {(assignedTasks.length ? assignedTasks : role.responsibilities || []).slice(0, 4).map((task) => (
                    <li key={task} className="text-sm leading-6 text-[var(--color-text-secondary)]">{task}</li>
                  ))}
                </ul>
              </div>
            ))}
            {!roles.length && <p className="text-sm text-[var(--color-text-secondary)]">아직 역할 분배 데이터가 없습니다.</p>}
          </div>
        </section>

        <section className="rounded-lg border border-[var(--color-secondary-light)] bg-[var(--color-bg-white)] p-4">
          <h3 className="text-base font-semibold text-[var(--color-text-main)]">회의 기반 수행 흔적</h3>
          <div className="mt-3 grid gap-2">
            {meetings.map((meeting) => (
              <div key={meeting.date} className="rounded-lg bg-[var(--color-bg-light)] px-3 py-2">
                <p className="text-sm font-semibold text-[var(--color-text-main)]">{meeting.date} · {meeting.title}</p>
                <p className="mt-1 text-sm leading-6 text-[var(--color-text-secondary)]">{meeting.summary}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </Modal>
  )
}

function buildProfessorProjectSummary(project) {
  const roles = project.gemini?.roles || []
  const milestones = project.gemini?.milestones || []
  const totals = milestones.reduce(
    (acc, milestone) => {
      const checkpoints = getMilestoneCheckpoints(milestone)
      acc.checkpointCount += checkpoints.length
      acc.completedCount += checkpoints.filter((_, index) => milestone.completedCheckpoints?.[index]).length
      if (milestone.status === '완료') acc.statusCounts.done += 1
      else if (milestone.status === '진행 중') acc.statusCounts.active += 1
      else acc.statusCounts.pending += 1
      return acc
    },
    { checkpointCount: 0, completedCount: 0, statusCounts: { done: 0, active: 0, pending: 0 } },
  )
  const roleSummaries = roles.map((role, index) => ({
    role,
    ...getRoleProgressSummary(role, index, roles, milestones),
  }))
  const assignedTasksByRole = roles.map((role) => {
    const assignedTasks = milestones.flatMap((milestone) =>
      getMilestoneCheckpoints(milestone)
        .map((checkpoint, index) => ({
          task: typeof checkpoint === 'string' ? checkpoint : checkpoint.task,
          owner: getCheckpointOwner(milestone, index, roles),
        }))
        .filter(({ owner }) => owner === role.member)
        .map(({ task }) => task)
        .filter(Boolean),
    )

    return { role, assignedTasks }
  })
  const totalAssignedTasks = assignedTasksByRole.reduce((sum, item) => sum + item.assignedTasks.length, 0)
  const roleContributions = assignedTasksByRole.map(({ role, assignedTasks }) => ({
    role,
    assignedTasks,
    ratio: totalAssignedTasks
      ? Math.round((assignedTasks.length / totalAssignedTasks) * 100)
      : roles.length
        ? Math.round(100 / roles.length)
        : 0,
  }))
  const completion = totals.checkpointCount ? Math.round((totals.completedCount / totals.checkpointCount) * 100) : 0

  return {
    project,
    roles,
    roleSummaries,
    roleContributions,
    milestones,
    completion,
    completedCount: totals.completedCount,
    checkpointCount: totals.checkpointCount,
    statusCounts: totals.statusCounts,
    warnings: project.gemini?.warnings || [],
    direction: project.gemini?.direction || null,
    aiCompleted: Boolean(project.gemini),
    hasUrgentRole: roleSummaries.some((summary) => summary.urgent),
  }
}

function ProjectCreate({ form, setForm, handleFiles, isReadingFiles, canCreate, error, onCreate }) {
  const updateForm = (field, value) => setForm((current) => ({ ...current, [field]: value }))

  return (
    <section className="px-5 py-12">
      <div className="mx-auto max-w-6xl">
        <PageHead
          eyebrow="Create Project"
          title="프로젝트 기본 정보를 입력하세요"
          description="팀원별 역량은 아직 받지 않습니다. 프로젝트 상세에서 본인의 역량만 한 번 입력합니다."
        />
        <div className="mt-8 grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
          <Panel title="과제 정보">
            <div className="grid gap-4">
              <TextInput label="프로젝트명" value={form.title} onChange={(value) => updateForm('title', value)} placeholder="예: 청년 주거지원 정책 효과 분석" />
              <TextInput label="강의명" value={form.course} onChange={(value) => updateForm('course', value)} placeholder="예: 정책분석론" />
              <DeadlineSelect value={form.deadline} onChange={(value) => updateForm('deadline', value)} />
              <label className="block">
                <span className="text-sm font-semibold text-[var(--color-dark-gray)]">팀원 수</span>
                <input
                  type="range"
                  min="2"
                  max="8"
                  value={form.memberCount}
                  onChange={(event) => updateForm('memberCount', Number(event.target.value))}
                  className="mt-4 w-full accent-[var(--color-primary)]"
                />
                <span className="mt-2 block text-sm font-semibold text-[var(--color-primary)]">{form.memberCount}명</span>
              </label>
            </div>
          </Panel>

          <Panel title="프로젝트 자료">
            <div className="grid gap-4">
              <TextArea label="공지사항" value={form.notice} onChange={(value) => updateForm('notice', value)} placeholder="교수님 공지, 제출 방식, 제한 사항을 붙여 넣으세요." />
              <TextArea label="평가기준" value={form.rubric} onChange={(value) => updateForm('rubric', value)} placeholder="배점, 페이지 제한, 필수 포함 요소를 붙여 넣으세요." />
              <label className="rounded-lg border border-dashed border-[var(--color-secondary-light)] bg-[var(--color-bg-light)] p-4">
                <span className="block text-sm font-semibold text-[var(--color-primary)]">{isReadingFiles ? '파일을 읽는 중...' : '파일 선택'}</span>
                <span className="mt-1 block text-sm leading-6 text-[var(--color-text-secondary)]">텍스트 파일은 본문을 읽고, 그 외 파일은 파일명만 저장합니다.</span>
                <input type="file" multiple className="sr-only" onChange={(event) => handleFiles(event.target.files)} />
              </label>
              {form.fileSummary && (
                <textarea
                  value={form.fileSummary}
                  onChange={(event) => updateForm('fileSummary', event.target.value)}
                  className="h-32 w-full resize-none rounded-lg border border-[var(--color-secondary-light)] bg-[var(--color-bg-white)] p-3 text-sm leading-6 outline-none focus:border-[var(--color-primary)]"
                />
              )}
            </div>
          </Panel>
        </div>
        {error && <ErrorBox>{error}</ErrorBox>}
        <div className="mt-6 flex items-center justify-between rounded-xl border border-[var(--color-secondary-light)] bg-[var(--color-bg-white)] p-4">
          <p className="text-sm text-[var(--color-text-secondary)]">프로젝트를 만든 뒤 상세 페이지에서 AI 분배를 실행합니다.</p>
          <PrimaryButton disabled={!canCreate} onClick={onCreate}>프로젝트 생성</PrimaryButton>
        </div>
      </div>
    </section>
  )
}

function ProjectDetail({ project, error, isGenerating, onBack, onDelete, onRunAi, onUpdateProject }) {
  const [profileDraft, setProfileDraft] = useState(() => project?.selfProfile || createEmptyProfile())
  const [showProfile, setShowProfile] = useState(false)

  useEffect(() => {
    if (project?.gemini && project.rolesPanelSeen === false) {
      onUpdateProject(project.id, { rolesPanelSeen: true })
    }
  }, [project?.id, project?.gemini, project?.rolesPanelSeen, onUpdateProject])

  if (!project) {
    return (
      <section className="px-5 py-16">
        <div className="mx-auto max-w-3xl rounded-xl border border-[var(--color-secondary-light)] bg-[var(--color-bg-white)] p-10 text-center">
          <h1 className="text-2xl font-normal tracking-[-0.02em] text-[var(--color-text-main)]">프로젝트를 찾을 수 없습니다</h1>
          <div className="mt-6">
            <PrimaryButton onClick={onBack}>대시보드로 이동</PrimaryButton>
          </div>
        </div>
      </section>
    )
  }

  const handleAiClick = () => {
    if (!project.selfProfile) {
      setShowProfile(true)
      return
    }
    onRunAi(project, project.selfProfile)
  }

  const saveProfileAndRun = () => {
    onRunAi(project, profileDraft)
    setShowProfile(false)
  }

  const updateMilestone = (milestoneIndex, patch) => {
    const nextMilestones = (project.gemini?.milestones || []).map((milestone, index) =>
      index === milestoneIndex ? { ...milestone, ...patch } : milestone,
    )
    onUpdateProject(project.id, {
      gemini: {
        ...project.gemini,
        milestones: nextMilestones,
      },
    })
  }

  return (
    <section className="px-5 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col justify-between gap-4 border-b border-[var(--color-secondary-light)] pb-6 lg:flex-row lg:items-end">
          <div>
            <Pill>{project.input.course}</Pill>
            <h1 className="mt-4 text-4xl font-normal leading-tight tracking-[-0.04em] text-[var(--color-text-main)]">{project.input.title}</h1>
            <p className="mt-3 text-[var(--color-text-secondary)]">마감: {project.input.deadline} · 팀원 {project.input.memberCount}명</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <SecondaryButton onClick={onBack}>대시보드</SecondaryButton>
            <PrimaryButton disabled={isGenerating} onClick={handleAiClick}>{isGenerating ? '분배 중...' : 'AI로 분배하기'}</PrimaryButton>
            <DangerButton onClick={() => onDelete(project.id)}>삭제</DangerButton>
          </div>
        </div>
        {error && <ErrorBox>{error}</ErrorBox>}
        {showProfile && (
          <ProfilePanel
            profile={profileDraft}
            setProfile={setProfileDraft}
            onCancel={() => setShowProfile(false)}
            onSubmit={saveProfileAndRun}
          />
        )}
        {!project.gemini ? (
          <PreAiState hasProfile={Boolean(project.selfProfile)} onOpenProfile={() => setShowProfile(true)} onRun={handleAiClick} />
        ) : (
          <ResultSections
            result={project.gemini}
            rolesDefaultOpen={project.rolesPanelSeen === false}
            onUpdateMilestone={updateMilestone}
          />
        )}
      </div>
    </section>
  )
}

function ProfilePanel({ profile, setProfile, onCancel, onSubmit }) {
  const update = (field, value) => setProfile((current) => ({ ...current, [field]: value }))
  const toggleSkill = (skill) => {
    setProfile((current) => ({
      ...current,
      selectedSkills: current.selectedSkills.includes(skill)
        ? current.selectedSkills.filter((item) => item !== skill)
        : [...current.selectedSkills, skill],
    }))
  }
  const canSubmit = profile.name.trim() && (profile.selectedSkills.length > 0 || profile.strengths.trim())

  return (
    <section className="mt-6 rounded-xl border border-[var(--color-primary)] bg-[var(--color-bg-white)]">
      <div className="border-b border-[var(--color-secondary-light)] px-5 py-4">
        <Pill>1회 입력</Pill>
        <h2 className="mt-3 text-2xl font-normal tracking-[-0.03em] text-[var(--color-text-main)]">본인의 역량을 입력해 주세요</h2>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">선택 카드와 자유 입력을 함께 사용하면 AI가 더 안정적으로 역할을 나눕니다.</p>
      </div>
      <div className="grid gap-5 p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <TextInput label="이름" value={profile.name} onChange={(value) => update('name', value)} placeholder="예: 민서" />
          <TextInput label="선호 역할" value={profile.preferredRole} onChange={(value) => update('preferredRole', value)} placeholder="예: 자료조사, 발표, 일정관리" />
        </div>
        <div>
          <p className="text-sm font-semibold text-[var(--color-dark-gray)]">역량 키워드 선택</p>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {skillKeywords.map((skill) => {
              const active = profile.selectedSkills.includes(skill.label)
              return (
                <button
                  key={skill.key}
                  type="button"
                  onClick={() => toggleSkill(skill.label)}
                  className={`rounded-lg border p-3 text-left ${
                    active
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)]'
                      : 'border-[var(--color-secondary-light)] bg-[var(--color-bg-light)]'
                  }`}
                >
                  <span className="block text-sm font-semibold text-[var(--color-text-main)]">{skill.label}</span>
                  <span className="mt-1 block text-xs leading-5 text-[var(--color-text-secondary)]">{skill.description}</span>
                </button>
              )
            })}
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <TextArea label="추가 강점" value={profile.strengths} onChange={(value) => update('strengths', value)} placeholder="예: 엑셀 계산, 자료조사, 논리 구조화가 가능합니다." />
          <TextArea label="부족한 부분 또는 피하고 싶은 업무" value={profile.weakness} onChange={(value) => update('weakness', value)} placeholder="예: 디자인은 자신 없고 발표는 가능하면 피하고 싶습니다." />
          <TextInput label="가능한 작업 시간" value={profile.availableTime} onChange={(value) => update('availableTime', value)} placeholder="예: 평일 저녁, 주말 오후" />
        </div>
      </div>
      <div className="flex justify-end gap-2 border-t border-[var(--color-secondary-light)] p-5">
        <SecondaryButton onClick={onCancel}>취소</SecondaryButton>
        <PrimaryButton disabled={!canSubmit} onClick={onSubmit}>저장 후 AI 분배</PrimaryButton>
      </div>
    </section>
  )
}

function PreAiState({ hasProfile, onOpenProfile, onRun }) {
  return (
    <section className="mt-6 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="rounded-xl border border-[var(--color-secondary-light)] bg-[var(--color-bg-white)] p-5">
        <Pill>Next action</Pill>
        <h2 className="mt-4 text-2xl font-normal tracking-[-0.03em] text-[var(--color-text-main)]">
          {hasProfile ? 'AI 분배를 실행할 준비가 됐습니다.' : '먼저 본인의 역량을 입력해야 합니다.'}
        </h2>
        <p className="mt-3 leading-7 text-[var(--color-text-secondary)]">
          Gemini는 본인의 역량을 기준점으로 삼고, 다른 팀원의 역량은 팀원 수와 과제 조건에 맞게 임의 추정해서 역할을 나눕니다.
        </p>
        <div className="mt-5 flex gap-2">
          <SecondaryButton onClick={onOpenProfile}>역량 입력</SecondaryButton>
          <PrimaryButton onClick={onRun}>AI로 분배하기</PrimaryButton>
        </div>
      </div>
      <AgentPanel />
    </section>
  )
}

function ResultSections({ result, rolesDefaultOpen, onUpdateMilestone }) {
  return (
    <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(300px,1fr)]">
      <CalendarMilestones milestones={result.milestones} roles={result.roles} onUpdateMilestone={onUpdateMilestone} />
      <ProjectSidePanels
        roles={result.roles}
        milestones={result.milestones}
        direction={result.direction}
        advice={result.advice}
        warnings={result.warnings}
        defaultOpen={rolesDefaultOpen ? 'roles' : null}
      />
    </div>
  )
}

function ProjectSidePanels({ roles = [], milestones = [], direction, advice = [], warnings = [], defaultOpen = null }) {
  const [activePanel, setActivePanel] = useState(defaultOpen)

  return (
    <aside className="grid content-start gap-3 xl:sticky xl:top-5 xl:self-start">
      <SidePanel id="roles" eyebrow="R&R" title="역할 분배" activePanel={activePanel} setActivePanel={setActivePanel}>
        <RolesGrid roles={roles} milestones={milestones} />
      </SidePanel>
      <SidePanel id="direction" eyebrow="Direction" title="방향" activePanel={activePanel} setActivePanel={setActivePanel}>
        <DirectionCard direction={direction} advice={advice} warnings={warnings} />
      </SidePanel>
      <SidePanel
        id="meetings"
        eyebrow="RECORD"
        title="회의록 목록"
        activePanel={activePanel}
        setActivePanel={setActivePanel}
        icon={googleMeetIcon}
        iconAlt="Google Meet"
        iconHref="https://meet.google.com/"
      >
        <MeetingMinutesBoard embedded />
      </SidePanel>
    </aside>
  )
}

function SidePanel({ id, eyebrow, title, activePanel, setActivePanel, children, icon = null, iconAlt = '', iconHref = '' }) {
  const isOpen = activePanel === id

  return (
    <section className={`overflow-hidden rounded-xl border border-[var(--color-secondary-light)] bg-[var(--color-bg-white)] transition-all duration-300 ease-out ${isOpen ? 'shadow-[0_14px_36px_rgba(0,35,78,0.08)]' : 'shadow-none'}`}>
      <div className="flex items-center justify-between gap-3 px-5 py-4">
        <button
          type="button"
          onClick={() => setActivePanel(isOpen ? null : id)}
          aria-expanded={isOpen}
          className="min-w-0 flex-1 text-left"
        >
          <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-primary)]">{eyebrow}</span>
          <span className="mt-1 flex items-center gap-2 text-xl font-normal tracking-[-0.02em] text-[var(--color-text-main)]">
            {title}
            {icon && !iconHref && <img src={icon} alt={iconAlt} className="h-6 w-6 object-contain" />}
          </span>
        </button>
        {icon && iconHref && (
          <a
            href={iconHref}
            target="_blank"
            rel="noreferrer"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-md hover:bg-[var(--color-bg-light)]"
            aria-label={`${iconAlt} 열기`}
          >
            <img src={icon} alt={iconAlt} className="h-6 w-6 object-contain" />
          </a>
        )}
        <button
          type="button"
          onClick={() => setActivePanel(isOpen ? null : id)}
          aria-expanded={isOpen}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[var(--color-secondary-light)] px-2 py-1 text-xs font-semibold text-[var(--color-text-main)] transition-colors duration-200 hover:bg-[var(--color-bg-light)]"
        >
          {isOpen ? '접기' : '펼치기'}
          <span className={`text-[10px] transition-transform duration-300 ease-out ${isOpen ? 'rotate-180' : 'rotate-0'}`} aria-hidden="true">▼</span>
        </button>
      </div>
      <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="min-h-0 overflow-hidden">
          <div className={`border-t border-[var(--color-secondary-light)] p-5 transition-all duration-300 ease-out ${isOpen ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'}`}>
            {children}
          </div>
        </div>
      </div>
    </section>
  )
}

function DirectionCard({ direction, advice = [], warnings = [] }) {
  return (
    <div>
      <div className="grid gap-4">
        <div>
          <h2 className="text-xl font-semibold leading-tight tracking-[-0.04em] text-[var(--color-text-main)]">{direction?.one_line}</h2>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <InsightPopover type="advice" title="AI 조언" items={advice} />
          <InsightPopover type="warning" title="보완점" items={warnings?.length ? warnings : ['현재 Gemini가 감지한 주요 누락 정보는 없습니다.']} />
        </div>
      </div>
      <div className="mt-5 grid gap-3">
        <ReadOnlyBlock title="전략" text={direction?.strategy || '생성된 전략이 없습니다.'} />
        <ReadOnlyBlock title="피해야 할 실수" text={direction?.avoid || '생성된 내용이 없습니다.'} tone="yellow" />
      </div>
    </div>
  )
}

function RolesGrid({ roles = [], milestones = [] }) {
  const [activeRoleIndex, setActiveRoleIndex] = useState(null)
  const activeRole = roles[activeRoleIndex] || null

  return (
    <div className="max-h-[520px] overflow-y-auto pr-1">
      <div className="grid gap-3">
        {roles.map((role, index) => {
          const summary = getRoleProgressSummary(role, index, roles, milestones)

          return (
            <div key={`${role.member}-${index}`} className="rounded-lg border border-[var(--color-secondary-light)] bg-[var(--color-bg-light)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-[var(--color-text-main)]">{role.member}</p>
                    {summary.urgent && <span className="text-xs font-semibold text-red-600">마감임박!</span>}
                  </div>
                  <p className="mt-1 text-xs leading-5 text-[var(--color-gray)]">{summary.nearestLabel}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveRoleIndex(index)}
                  className="shrink-0 rounded-md border border-[var(--color-secondary-light)] bg-[var(--color-bg-white)] px-2.5 py-1 text-xs font-semibold text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary-light)]"
                  aria-label={`${role.member} 역할 상세 보기`}
                >
                  상세보기
                </button>
              </div>
              <div className="mt-3">
                <div className="flex items-center justify-between gap-3 text-xs font-semibold text-[var(--color-gray)]">
                  <span>진척도</span>
                  <span>{summary.progress}%</span>
                </div>
                <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-[var(--color-bg-white)]">
                  <div className="h-full rounded-full bg-[var(--color-primary)]" style={{ width: `${summary.progress}%` }} />
                </div>
              </div>
            </div>
          )
        })}
      </div>
      {activeRole && (
        <RoleDetailModal role={activeRole} onClose={() => setActiveRoleIndex(null)} />
      )}
    </div>
  )
}

function RoleDetailModal({ role, onClose }) {
  return (
    <Modal title={`${role.member} 역할 상세`} onClose={onClose}>
      <div className="grid gap-4">
        <ReadOnlyBlock title="배정 역할" text={role.role_title || '역할 정보가 없습니다.'} />
        <ReadOnlyBlock title="배정 이유" text={role.reason || '배정 이유가 없습니다.'} />
        <div className="rounded-lg border border-[var(--color-secondary-light)] bg-[var(--color-bg-light)] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-primary)]">담당 업무</p>
          <ul className="mt-3 grid gap-2">
            {(role.responsibilities || []).map((item) => (
              <li key={item} className="rounded-md bg-[var(--color-bg-white)] px-3 py-2 text-sm leading-6 text-[var(--color-dark-gray)]">
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Modal>
  )
}

export default App
