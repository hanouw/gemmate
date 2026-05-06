import { useEffect, useMemo, useState } from 'react'

const GEMINI_API_KEY = import.meta.env.GAK
const GEMINI_MODEL = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash-lite'
const STORAGE_KEY = 'gemmate_projects'

const skillKeywords = [
  { key: 'data_scanner', label: '데이터 스캐너', description: '자료, 공시, 기사에서 필요한 근거를 빠르게 찾습니다.' },
  { key: 'number_cruncher', label: '넘버 크런처', description: '엑셀, 계산, 재무비율, 통계 분석에 강합니다.' },
  { key: 'storyboarder', label: '스토리보더', description: '서론-본론-결론과 논리 흐름을 설계합니다.' },
  { key: 'visual_director', label: '비주얼 디렉터', description: 'PPT 레이아웃, 그래프, 표 시각화에 강합니다.' },
  { key: 'copywriter', label: '카피라이터', description: '분석 내용을 읽기 좋은 문장으로 다듬습니다.' },
  { key: 'presenter', label: '프레젠터', description: '발표와 질의응답을 명확하게 수행합니다.' },
  { key: 'pm', label: 'PM', description: '일정, 마감, 팀원 소통을 조율합니다.' },
  { key: 'detail_checker', label: '디테일 검수자', description: '오타, 참고문헌, 제출 형식을 꼼꼼히 확인합니다.' },
]

const sampleMeetings = [
  {
    date: '2026.05.08',
    title: '킥오프 회의',
    summary: '평가기준 확인과 역할 분배 방향 논의',
    body: `참석자: 팀원 전체

1. 평가기준을 먼저 읽고 높은 배점 영역에 시간을 집중하기로 했습니다.
2. 자료 조사와 분석 결과가 발표 자료로 바로 이어지도록 산출물 형식을 통일하기로 했습니다.
3. 다음 회의 전까지 각자 맡을 수 있는 역량과 가능한 시간을 정리해 오기로 했습니다.`,
  },
  {
    date: '2026.05.15',
    title: '중간 점검',
    summary: '자료 수집 현황과 마일스톤 조정',
    body: `참석자: 팀원 전체

1. 수집된 자료의 출처와 신뢰도를 다시 확인했습니다.
2. 마감일 기준으로 분석 단계가 늦어질 위험이 있어 시각화 작업을 병행하기로 했습니다.
3. Gemini가 제안한 체크포인트를 기준으로 다음 주까지 1차 산출물을 만들기로 했습니다.`,
  },
  {
    date: '2026.05.22',
    title: '최종 구조 회의',
    summary: '발표 흐름과 최종 검수 항목 확정',
    body: `참석자: 팀원 전체

1. 발표 흐름은 문제 정의, 분석 근거, 결론 순서로 확정했습니다.
2. 참고문헌, 표기 통일, 파일 형식 검수를 별도 체크리스트로 관리하기로 했습니다.
3. 마지막 회의에서는 발표 리허설과 예상 질문 대응만 진행하기로 했습니다.`,
  },
]

const makeId = () => `project_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

const createEmptyForm = () => ({
  title: '',
  course: '',
  deadline: '',
  notice: '',
  rubric: '',
  fileSummary: '',
  memberCount: 2,
})

const createEmptyProfile = () => ({
  name: '',
  selectedSkills: [],
  strengths: '',
  weakness: '',
  preferredRole: '',
  availableTime: '',
})

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
    if (!GEMINI_API_KEY) {
      setError('GAK가 설정되어 있지 않습니다. Vercel 환경 변수에 Gemini API 키를 넣고 재배포해 주세요.')
      return
    }

    setIsGenerating(true)
    try {
      const gemini = await callGemini(buildDistributionPrompt(project, profile))
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
      <Header navigate={navigate} />
      {screen === 'landing' && <Landing onStart={resetForm} onDashboard={() => navigate('dashboard')} projectCount={projects.length} />}
      {screen === 'dashboard' && <Dashboard projects={projects} onCreate={resetForm} onOpen={openProject} onDelete={deleteProject} />}
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

function Header({ navigate }) {
  return (
    <header className="border-b border-[var(--color-secondary-light)] bg-[var(--color-bg-light)]">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <button type="button" onClick={() => navigate('landing')} className="text-left">
          <span className="block text-lg font-semibold tracking-[-0.02em] text-[var(--color-primary)]">Gemmate</span>
          <span className="block text-xs text-[var(--color-secondary)]">Yonsei x Gemini</span>
        </button>
        <span className="rounded-full border border-[var(--color-secondary-light)] bg-[var(--color-bg-white)] px-3 py-1 text-xs font-semibold text-[var(--color-secondary)]">
          Local prototype
        </span>
      </div>
    </header>
  )
}

function Landing({ onStart, onDashboard, projectCount }) {
  return (
    <>
      <section className="border-b border-[var(--color-secondary-light)]">
        <div className="mx-auto grid min-h-[calc(100vh-64px)] max-w-6xl gap-10 px-5 py-20 lg:grid-cols-[1fr_0.9fr] lg:items-center">
          <div>
            <Pill>Yonsei Social Sciences</Pill>
            <h1 className="mt-6 max-w-3xl text-5xl font-normal leading-[1.08] tracking-[-0.04em] text-[var(--color-text-main)] sm:text-6xl">
              팀 프로젝트를 데이터로 정리하고 Gemini로 역할을 나눕니다.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-[var(--color-text-secondary)]">
              Gemmate는 프로젝트 정보와 본인의 역량을 바탕으로 역할 분배, 마일스톤, 회의 후 할 일을 생성합니다.
              결과는 현재 브라우저의 localStorage에 저장됩니다.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <PrimaryButton onClick={onStart}>프로젝트 만들기</PrimaryButton>
              <SecondaryButton onClick={onDashboard}>저장된 프로젝트 {projectCount > 0 ? `(${projectCount})` : ''}</SecondaryButton>
            </div>
          </div>
          <AgentPanel />
        </div>
      </section>

      <section className="px-5 py-16">
        <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-3">
          <InfoCard title="1. 최소 정보로 생성" text="프로젝트 생성 시에는 팀원 수와 과제 정보만 입력합니다." />
          <InfoCard title="2. 내 역량은 상세에서" text="프로젝트에 들어가서 본인의 역량 정보가 없을 때 한 번만 입력합니다." />
          <InfoCard title="3. AI로 분배" text="내 정보를 기준으로 나머지 팀원 역량은 Gemini가 합리적으로 가정합니다." />
        </div>
      </section>
    </>
  )
}

function AgentPanel() {
  return (
    <div className="rounded-xl border border-[var(--color-secondary-light)] bg-[var(--color-bg-white)]">
      <div className="border-b border-[var(--color-secondary-light)] px-5 py-4">
        <p className="text-sm font-semibold text-[var(--color-primary)]">Gemmate agent timeline</p>
      </div>
      <div className="grid gap-3 p-5">
        <TimelineRow tone="blue" label="READ" text="평가기준과 공지사항을 읽습니다." />
        <TimelineRow tone="green" label="MATCH" text="내 역량과 팀원 수를 바탕으로 역할을 추론합니다." />
        <TimelineRow tone="yellow" label="PLAN" text="마감일부터 역산한 마일스톤을 구성합니다." />
        <TimelineRow tone="red" label="DONE" text="대시보드에 저장 가능한 프로젝트 계획을 반환합니다." />
      </div>
    </div>
  )
}

function Dashboard({ projects, onCreate, onOpen, onDelete }) {
  return (
    <section className="px-5 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <PageHead eyebrow="Dashboard" title="저장된 프로젝트" description="이 브라우저의 localStorage에 저장된 프로젝트만 표시됩니다." />
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
              <TextInput label="프로젝트명" value={form.title} onChange={(value) => updateForm('title', value)} placeholder="예: 회계원리 가치투자 분석 과제" />
              <TextInput label="강의명" value={form.course} onChange={(value) => updateForm('course', value)} placeholder="예: 회계원리" />
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
      <SidePanel id="meetings" eyebrow="Example" title="회의목록" activePanel={activePanel} setActivePanel={setActivePanel}>
        <MeetingMinutesBoard embedded />
      </SidePanel>
    </aside>
  )
}

function SidePanel({ id, eyebrow, title, activePanel, setActivePanel, children }) {
  const isOpen = activePanel === id

  return (
    <section className="rounded-xl border border-[var(--color-secondary-light)] bg-[var(--color-bg-white)]">
      <button
        type="button"
        onClick={() => setActivePanel(isOpen ? null : id)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span>
          <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-primary)]">{eyebrow}</span>
          <span className="mt-1 block text-xl font-normal tracking-[-0.02em] text-[var(--color-text-main)]">{title}</span>
        </span>
        <span className="rounded-lg border border-[var(--color-secondary-light)] px-2 py-1 text-xs font-semibold text-[var(--color-text-main)]">
          {isOpen ? '접기' : '펼치기'}
        </span>
      </button>
      {isOpen && <div className="border-t border-[var(--color-secondary-light)] p-5">{children}</div>}
    </section>
  )
}

function DirectionCard({ direction, advice = [], warnings = [] }) {
  return (
    <div>
      <div className="grid gap-4">
        <div>
          <h2 className="text-2xl font-normal leading-tight tracking-[-0.04em] text-[var(--color-text-main)]">{direction?.one_line}</h2>
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
                  className="rounded-md px-2 py-1 text-sm font-semibold text-[var(--color-primary)]"
                  aria-label={`${role.member} 역할 상세 보기`}
                >
                  &gt;&gt;
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

function ListItems({ items = [], tone = 'blue' }) {
  const color = tone === 'green' ? 'var(--color-light-green)' : tone === 'yellow' ? 'var(--color-light-yellow)' : 'var(--color-light-blue)'
  return (
    <ul className="mt-4 grid gap-2">
      {items.map((item) => (
        <li key={item} style={{ backgroundColor: color }} className="rounded-md px-3 py-2 text-sm leading-6 text-[var(--color-dark-gray)]">
          {item}
        </li>
      ))}
    </ul>
  )
}

function CalendarMilestones({ milestones = [], roles = [], onUpdateMilestone }) {
  const normalized = assignMilestoneStatuses(normalizeMilestonesForCalendar(milestones))
  const months = buildCalendarMonths(normalized)
  const currentMonthIndex = getInitialCalendarMonthIndex(months)
  const [visibleMonthIndex, setVisibleMonthIndex] = useState(currentMonthIndex)
  const [activeMilestoneIndex, setActiveMilestoneIndex] = useState(null)
  const visibleMonth = months[visibleMonthIndex] || months[0]
  const activeMilestone = normalized.find((milestone) => milestone.originalIndex === activeMilestoneIndex) || null

  return (
    <section className="rounded-xl border border-[var(--color-secondary-light)] bg-[var(--color-bg-white)] p-5">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <SectionTitle eyebrow="Calendar" title="마일스톤 달력" />
        <div className="flex flex-wrap items-center gap-3">
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
          <div key={visibleMonth.key} className="rounded-lg border border-[var(--color-secondary-light)] bg-[var(--color-bg-light)] p-4">
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

            <div className="mt-4 grid grid-cols-7 border-y border-l border-[var(--color-secondary-light)] bg-[var(--color-bg-white)] text-center text-xs font-semibold text-[var(--color-gray)]">
              {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
                <div key={day} className="border-r border-[var(--color-secondary-light)] py-2">
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
                    className={`aspect-[1/2.5] min-h-0 border-r border-b border-[var(--color-secondary-light)] p-1.5 md:aspect-auto md:min-h-24 md:p-2 ${
                      day ? 'bg-[var(--color-bg-white)]' : 'bg-[var(--color-bg-light)]'
                    }`}
                  >
                    {day && (
                      <p className="text-xs font-semibold text-[var(--color-gray)]">{day.getDate()}</p>
                    )}
                    <div className="mt-2 grid gap-1.5">
                      {dayMilestones.map((milestone) => {
                        const tone = getMilestoneTone(milestone.status)
                        return (
                          <button
                            key={`${milestone.phase}-${milestone.originalIndex}`}
                            type="button"
                            onClick={() => setActiveMilestoneIndex(milestone.originalIndex)}
                            className="rounded-md border px-2 py-1.5 text-left text-xs font-semibold leading-5 shadow-sm transition hover:-translate-y-0.5"
                            style={{ borderColor: tone.border, backgroundColor: tone.badgeBg, color: tone.badgeText }}
                          >
                            <span className="hidden sm:block">{getPhaseDisplayLabel(milestone.phase)}</span>
                            <span className="block sm:hidden">{getPhaseMobileLabel(milestone.phase)}</span>
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

function MeetingMinutesBoard({ embedded = false }) {
  const [activeMeeting, setActiveMeeting] = useState(null)

  const content = (
    <>
      {!embedded && (
      <SectionTitle eyebrow="Example" title="회의록 목록" />
      )}
      <p className="mt-3 text-sm text-[var(--color-text-secondary)]">예시입니다) AI 분배 후 보이는 고정 회의록입니다. 날짜를 클릭하면 내용을 볼 수 있습니다.</p>
      <div className="mt-5 grid gap-3">
        {sampleMeetings.map((meeting) => (
          <button
            key={meeting.date}
            type="button"
            onClick={() => setActiveMeeting(meeting)}
            className="rounded-lg border border-[var(--color-secondary-light)] bg-[var(--color-bg-light)] p-4 text-left"
          >
            <p className="text-sm font-semibold text-[var(--color-primary)]">{meeting.date}</p>
            <p className="mt-2 text-lg font-semibold text-[var(--color-text-main)]">{meeting.title}</p>
            <p className="mt-2 text-xs text-[var(--color-gray)]">{meeting.summary}</p>
          </button>
        ))}
      </div>
      {activeMeeting && (
        <Modal title={`${activeMeeting.date} 회의록`} onClose={() => setActiveMeeting(null)}>
          <p className="text-sm font-semibold text-[var(--color-primary)]">예시입니다)</p>
          <div className="mt-4 whitespace-pre-wrap rounded-lg bg-[var(--color-bg-light)] p-4 text-sm leading-7 text-[var(--color-text-secondary)]">
            {activeMeeting.body}
          </div>
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

function InsightPopover({ type, title, items = [] }) {
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
        {isWarning ? (
          <span className="grid h-5 w-5 place-items-center bg-[var(--color-primary)] text-[10px] font-bold text-white [clip-path:polygon(50%_0,100%_100%,0_100%)]">
            <span className="translate-y-[2px]">!</span>
          </span>
        ) : (
          <span className="relative h-5 w-5 rounded-full bg-[var(--color-primary)] after:absolute after:bottom-[-2px] after:left-1 after:h-2 after:w-2 after:rotate-45 after:bg-[var(--color-primary)]" />
        )}
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

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[rgba(0,35,78,0.36)] px-5" onMouseDown={onClose}>
      <div
        className="max-h-[82vh] w-full max-w-2xl overflow-auto rounded-xl border border-[var(--color-secondary-light)] bg-[var(--color-bg-white)] p-5"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 border-b border-[var(--color-secondary-light)] pb-4">
          <h3 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-text-main)]">{title}</h3>
          <button type="button" onClick={onClose} className="rounded-lg border border-[var(--color-secondary-light)] px-3 py-1 text-sm font-semibold text-[var(--color-text-main)]">
            닫기
          </button>
        </div>
        <div className="pt-4">{children}</div>
      </div>
    </div>
  )
}

function DeadlineSelect({ value, onChange }) {
  const options = useMemo(() => buildDeadlineOptions(120), [])
  return (
    <label className="block">
      <span className="text-sm font-semibold text-[var(--color-dark-gray)]">종료 날짜</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-11 w-full rounded-lg border border-[var(--color-secondary-light)] bg-[var(--color-bg-white)] px-3 text-[var(--color-black)] outline-none focus:border-[var(--color-primary)]"
      >
        <option value="">종료 날짜를 선택하세요</option>
        {options.map((option) => (
          <option key={option.value} value={option.label}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function PageHead({ eyebrow, title, description }) {
  return (
    <div className="max-w-3xl">
      <Pill>{eyebrow}</Pill>
      <h1 className="mt-4 text-4xl font-normal tracking-[-0.04em] text-[var(--color-text-main)] sm:text-5xl">{title}</h1>
      <p className="mt-4 text-base leading-7 text-[var(--color-text-secondary)]">{description}</p>
    </div>
  )
}

function SectionTitle({ eyebrow, title }) {
  return (
    <div>
      <Pill>{eyebrow}</Pill>
      <h2 className="mt-3 text-2xl font-normal tracking-[-0.03em] text-[var(--color-text-main)]">{title}</h2>
    </div>
  )
}

function TimelineRow({ tone, label, text }) {
  const tones = {
    blue: 'bg-[var(--color-light-blue)]',
    green: 'bg-[var(--color-light-green)]',
    yellow: 'bg-[var(--color-light-yellow)]',
    red: 'bg-[var(--color-light-red)]',
  }

  return (
    <div className="flex items-start gap-3 rounded-lg border border-[var(--color-secondary-light)] bg-[var(--color-bg-light)] p-3">
      <span className={`${tones[tone]} rounded-full px-2 py-1 text-[11px] font-semibold tracking-[0.08em] text-[var(--color-text-main)]`}>{label}</span>
      <p className="text-sm leading-6 text-[var(--color-text-secondary)]">{text}</p>
    </div>
  )
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-lg border border-[var(--color-secondary-light)] bg-[var(--color-bg-light)] p-3">
      <p className="text-xs text-[var(--color-gray)]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[var(--color-text-main)]">{value}</p>
    </div>
  )
}

function ReadOnlyBlock({ title, text, tone = 'blue' }) {
  const bg = tone === 'yellow' ? 'var(--color-light-yellow)' : 'var(--color-bg-light)'
  return (
    <div style={{ backgroundColor: bg }} className="rounded-lg border border-[var(--color-secondary-light)] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-primary)]">{title}</p>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-[var(--color-text-secondary)]">{text}</p>
    </div>
  )
}

function InfoCard({ title, text }) {
  return (
    <div className="rounded-xl border border-[var(--color-secondary-light)] bg-[var(--color-bg-white)] p-5">
      <h2 className="text-xl font-normal tracking-[-0.02em] text-[var(--color-text-main)]">{title}</h2>
      <p className="mt-3 text-sm leading-7 text-[var(--color-text-secondary)]">{text}</p>
    </div>
  )
}

function Panel({ title, children }) {
  return (
    <section className="rounded-xl border border-[var(--color-secondary-light)] bg-[var(--color-bg-white)] p-5">
      <h2 className="text-xl font-normal tracking-[-0.02em] text-[var(--color-text-main)]">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  )
}

function TextInput({ label, value, onChange, placeholder = '' }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-[var(--color-dark-gray)]">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 h-11 w-full rounded-lg border border-[var(--color-secondary-light)] bg-[var(--color-bg-white)] px-3 text-[var(--color-black)] outline-none placeholder:text-[var(--color-light-gray)] focus:border-[var(--color-primary)]"
      />
    </label>
  )
}

function TextArea({ label, value, onChange, placeholder }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-[var(--color-dark-gray)]">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={5}
        className="mt-2 w-full resize-none rounded-lg border border-[var(--color-secondary-light)] bg-[var(--color-bg-white)] p-3 leading-7 text-[var(--color-black)] outline-none placeholder:text-[var(--color-light-gray)] focus:border-[var(--color-primary)]"
      />
    </label>
  )
}

function Pill({ children }) {
  return (
    <span className="inline-flex rounded-full bg-[var(--color-primary-light)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-primary)]">
      {children}
    </span>
  )
}

function PrimaryButton({ children, onClick, disabled = false }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-[var(--color-light-gray)]"
    >
      {children}
    </button>
  )
}

function SecondaryButton({ children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border border-[var(--color-secondary-light)] bg-[var(--color-bg-white)] px-4 py-2.5 text-sm font-semibold text-[var(--color-text-main)]"
    >
      {children}
    </button>
  )
}

function DangerButton({ children, onClick }) {
  return (
    <button type="button" onClick={onClick} className="rounded-lg bg-[var(--color-light-red)] px-4 py-2.5 text-sm font-semibold text-[var(--color-black)]">
      {children}
    </button>
  )
}

function ErrorBox({ children }) {
  return <div className="mt-6 rounded-lg border border-[var(--color-light-red)] bg-[var(--color-light-red)] p-4 text-sm font-semibold text-[var(--color-black)]">{children}</div>
}

async function callGemini(prompt) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.35,
          responseMimeType: 'application/json',
        },
      }),
    },
  )

  if (response.status === 503) {
    throw new Error('Gemini 모델 수요가 높아 일시적으로 응답하지 못했습니다. 모델을 낮추거나 잠시 후 다시 시도해 주세요.')
  }

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`Gemini API 오류 ${response.status}: ${detail}`)
  }

  const data = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text).join('\n')
  if (!text) throw new Error('Gemini 응답에서 텍스트를 찾지 못했습니다.')

  try {
    return JSON.parse(text)
  } catch {
    throw new Error('Gemini가 JSON 형식이 아닌 응답을 반환했습니다. 다시 시도해 주세요.')
  }
}

function buildDistributionPrompt(project, profile) {
  return `
너는 연세대학교 사회과학대학 학생들의 팀 프로젝트를 돕는 AI 팀메이트 Gemmate다.
아래 프로젝트 정보와 "본인"의 역량 정보는 실제 입력값이다.
다른 팀원의 역량은 아직 입력되지 않았으므로, 프로젝트 성격과 팀원 수를 바탕으로 합리적으로 가정하되 가정임을 reason 또는 warnings에 명시하라.

프로젝트:
- 프로젝트명: ${limitText(project.input.title, 200)}
- 강의명: ${limitText(project.input.course, 120)}
- 마감일: ${project.input.deadline}
- 팀원 수: ${project.input.memberCount}

공지사항:
${limitText(project.input.notice || '입력 없음', 1600)}

평가기준:
${limitText(project.input.rubric, 2200)}

업로드 파일 내용 또는 파일명:
${limitText(project.input.fileSummary || '입력 없음', 2200)}

본인 역량:
- 이름: ${profile.name}
- 선택 키워드: ${profile.selectedSkills?.length ? profile.selectedSkills.join(', ') : '선택 없음'}
- 추가 강점: ${profile.strengths || '입력 없음'}
- 부족한 부분: ${profile.weakness || '입력 없음'}
- 선호 역할: ${profile.preferredRole || '입력 없음'}
- 가능한 작업 시간: ${profile.availableTime || '입력 없음'}

반드시 아래 JSON 스키마로만 답하라. 마크다운 코드블록은 쓰지 마라.
{
  "direction": {
    "one_line": "프로젝트 전체 방향성 한 문장",
    "strategy": "평가기준을 근거로 한 진행 전략",
    "avoid": "팀이 피해야 할 실수"
  },
  "roles": [
    {
      "member": "팀원 이름 또는 팀원 번호",
      "role_title": "역할명",
      "reason": "본인 입력 또는 가정한 역량에 근거한 배정 이유",
      "responsibilities": ["구체 업무 1", "구체 업무 2"]
    }
  ],
  "milestones": [
    {
      "phase": "Phase 1",
      "deadline": "권장 완료일",
      "goal": "목표",
      "checkpoints": ["점검 기준 1", "점검 기준 2"]
    }
  ],
  "meeting_tasks": [
    {
      "task": "회의 후 할 일",
      "owner": "담당자",
      "due": "권장 마감",
      "reason": "추천 이유"
    }
  ],
  "advice": ["객관적 조언 1", "객관적 조언 2", "객관적 조언 3"],
  "warnings": ["부족한 입력 정보 또는 리스크"]
}
`
}

function parseHashRoute() {
  const raw = window.location.hash.replace(/^#\/?/, '')
  const [screen, projectId] = raw.split('/')
  if (screen === 'dashboard') return { screen: 'dashboard', projectId: null }
  if (screen === 'create') return { screen: 'create', projectId: null }
  if (screen === 'project' && projectId) return { screen: 'project', projectId }
  return { screen: 'landing', projectId: null }
}

function toHash(screen, projectId = null) {
  if (screen === 'dashboard') return '#/dashboard'
  if (screen === 'create') return '#/create'
  if (screen === 'project' && projectId) return `#/project/${projectId}`
  return '#/'
}

function buildDeadlineOptions(days) {
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

function normalizeMilestonesForCalendar(milestones = []) {
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

function assignMilestoneStatuses(milestones = []) {
  return milestones.map((milestone) => {
    if (['완료', '진행 중', '예정'].includes(milestone.status)) return milestone
    return { ...milestone, status: '예정' }
  })
}

function getMilestoneTone(status) {
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

function buildCalendarMonths(milestones = []) {
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

function getInitialCalendarMonthIndex(months = []) {
  const today = new Date()
  const currentIndex = months.findIndex((month) =>
    month.days.some((day) => day && day.getFullYear() === today.getFullYear() && day.getMonth() === today.getMonth()),
  )

  if (currentIndex >= 0) return currentIndex
  return 0
}

function getPhaseNumber(phase = '') {
  const match = String(phase).match(/phase\s*(\d+)/i)
  return match?.[1] || ''
}

function getPhaseDisplayLabel(phase = '') {
  const number = getPhaseNumber(phase)
  if (number) return `Phase${number}`
  return String(phase).split(':')[0] || 'Phase'
}

function getPhaseMobileLabel(phase = '') {
  const number = getPhaseNumber(phase)
  if (number) return `P.${number}`
  return getPhaseDisplayLabel(phase).slice(0, 4)
}

function getRoleProgressSummary(role, roleIndex, roles = [], milestones = []) {
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

function getMilestoneCheckpoints(milestone) {
  return milestone.checkpoints || milestone.tasks || []
}

function getCheckpointText(item) {
  if (typeof item === 'string') return item
  return item?.task || item?.text || item?.title || item?.goal || '세부 업무'
}

function getCheckpointOwner(milestone, checkpointIndex, roles = []) {
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

function getCheckpointOwnerIndex(milestone, checkpointIndex, roles = []) {
  if (!roles.length) return -1
  return (milestone.originalIndex + checkpointIndex) % roles.length
}

function isSameDate(left, right) {
  return (
    left?.getFullYear() === right?.getFullYear() &&
    left?.getMonth() === right?.getMonth() &&
    left?.getDate() === right?.getDate()
  )
}

function parseLooseDate(value) {
  if (!value) return null
  const text = String(value)
  const match = text.match(/20\d{2}\D+\d{1,2}\D+\d{1,2}/)
  if (!match) return null

  const [year, month, day] = match[0].split(/\D+/).filter(Boolean).map(Number)
  const date = new Date(year, month - 1, day)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatShortDate(date) {
  return `${date.getMonth() + 1}/${date.getDate()}`
}

function addDays(date, days) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function loadProjects() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : []
  } catch {
    return []
  }
}

function normalizeTasks(tasks) {
  if (!Array.isArray(tasks)) return []
  return tasks.map((task) => ({
    ...task,
    id: makeId(),
    done: false,
  }))
}

function limitText(text, maxLength) {
  if (!text) return ''
  return text.length > maxLength ? `${text.slice(0, maxLength)}\n[내용이 길어 일부만 전달됨]` : text
}

export default App
