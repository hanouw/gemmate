import { useEffect, useMemo, useState } from 'react'

const GEMINI_API_KEY = import.meta.env.GAK
const GEMINI_MODEL = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.0-flash'
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
          onCreate={resetForm}
          onDelete={deleteProject}
          onRunAi={runAiDistribution}
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
        <PageHead eyebrow="Dashboard" title="저장된 프로젝트" description="이 브라우저의 localStorage에 저장된 프로젝트만 표시됩니다." />
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
                  <Pill>{project.gemini ? 'AI 완료' : '입력 대기'}</Pill>
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

function ProjectDetail({ project, error, isGenerating, onBack, onCreate, onDelete, onRunAi }) {
  const [profileDraft, setProfileDraft] = useState(() => project?.selfProfile || createEmptyProfile())
  const [showProfile, setShowProfile] = useState(false)

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
            <SecondaryButton onClick={onCreate}>새 프로젝트</SecondaryButton>
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
          <ResultSections result={project.gemini} />
        )}
        <section className="mt-6 rounded-xl border border-[var(--color-secondary-light)] bg-[var(--color-bg-white)]">
          <div className="border-b border-[var(--color-secondary-light)] px-5 py-4">
            <h2 className="text-xl font-normal tracking-[-0.02em] text-[var(--color-text-main)]">프로젝트 입력 정보</h2>
          </div>
          <div className="grid gap-4 p-5 md:grid-cols-2">
            <ReadOnlyBlock title="공지사항" text={project.input.notice || '입력 없음'} />
            <ReadOnlyBlock title="평가기준" text={project.input.rubric || '입력 없음'} />
          </div>
        </section>
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

function ResultSections({ result }) {
  return (
    <div className="mt-6 grid gap-5">
      <DirectionCard direction={result.direction} />
      <RolesGrid roles={result.roles} />
      <MilestoneTimeline milestones={result.milestones} />
      <TaskGrid tasks={result.meeting_tasks} />
      <AdviceGrid advice={result.advice} warnings={result.warnings} />
    </div>
  )
}

function DirectionCard({ direction }) {
  return (
    <section className="rounded-xl border border-[var(--color-secondary-light)] bg-[var(--color-bg-white)] p-5">
      <Pill>Direction</Pill>
      <h2 className="mt-4 text-3xl font-normal leading-tight tracking-[-0.04em] text-[var(--color-text-main)]">{direction?.one_line}</h2>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <ReadOnlyBlock title="전략" text={direction?.strategy || '생성된 전략이 없습니다.'} />
        <ReadOnlyBlock title="피해야 할 실수" text={direction?.avoid || '생성된 내용이 없습니다.'} tone="yellow" />
      </div>
    </section>
  )
}

function RolesGrid({ roles = [] }) {
  return (
    <section className="rounded-xl border border-[var(--color-secondary-light)] bg-[var(--color-bg-white)] p-5">
      <SectionTitle eyebrow="R&R" title="역할 분배" />
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {roles.map((role, index) => (
          <div key={`${role.member}-${index}`} className="rounded-lg border border-[var(--color-secondary-light)] bg-[var(--color-bg-light)] p-4">
            <p className="text-sm font-semibold text-[var(--color-primary)]">{role.member}</p>
            <h3 className="mt-2 text-xl font-normal tracking-[-0.02em] text-[var(--color-text-main)]">{role.role_title}</h3>
            <p className="mt-3 text-sm leading-6 text-[var(--color-text-secondary)]">{role.reason}</p>
            <ul className="mt-4 grid gap-2">
              {(role.responsibilities || []).map((item) => (
                <li key={item} className="rounded-md bg-[var(--color-bg-white)] px-3 py-2 text-sm text-[var(--color-dark-gray)]">{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}

function MilestoneTimeline({ milestones = [] }) {
  return (
    <section className="rounded-xl border border-[var(--color-secondary-light)] bg-[var(--color-bg-white)] p-5">
      <SectionTitle eyebrow="Timeline" title="마일스톤" />
      <div className="mt-6 grid gap-4">
        {milestones.map((milestone, index) => (
          <div key={`${milestone.phase}-${index}`} className="grid gap-3 md:grid-cols-[120px_1fr]">
            <div className="flex md:block">
              <div className="rounded-full bg-[var(--color-primary)] px-3 py-1 text-center text-xs font-semibold text-white">{milestone.phase}</div>
            </div>
            <div className="rounded-lg border border-[var(--color-secondary-light)] bg-[var(--color-bg-light)] p-4">
              <div className="flex flex-col justify-between gap-2 sm:flex-row">
                <h3 className="text-xl font-normal tracking-[-0.02em] text-[var(--color-text-main)]">{milestone.goal}</h3>
                <span className="rounded-full bg-[var(--color-light-blue)] px-3 py-1 text-xs font-semibold text-[var(--color-primary)]">{milestone.deadline}</span>
              </div>
              <div className="mt-4 grid gap-2 md:grid-cols-2">
                {(milestone.checkpoints || []).map((checkpoint) => (
                  <div key={checkpoint} className="rounded-md bg-[var(--color-bg-white)] px-3 py-2 text-sm leading-6 text-[var(--color-text-secondary)]">
                    {checkpoint}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function TaskGrid({ tasks = [] }) {
  return (
    <section className="rounded-xl border border-[var(--color-secondary-light)] bg-[var(--color-bg-white)] p-5">
      <SectionTitle eyebrow="After meeting" title="회의 후 할 일" />
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {tasks.map((task, index) => (
          <div key={`${task.task}-${index}`} className="rounded-lg border border-[var(--color-secondary-light)] bg-[var(--color-bg-light)] p-4">
            <p className="text-sm font-semibold text-[var(--color-primary)]">{task.owner} · {task.due}</p>
            <h3 className="mt-2 text-lg font-semibold text-[var(--color-black)]">{task.task}</h3>
            <p className="mt-3 text-sm leading-6 text-[var(--color-text-secondary)]">{task.reason}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function AdviceGrid({ advice = [], warnings = [] }) {
  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-xl border border-[var(--color-secondary-light)] bg-[var(--color-bg-white)] p-5">
        <SectionTitle eyebrow="Advice" title="AI 조언" />
        <ListItems items={advice} tone="green" />
      </div>
      <div className="rounded-xl border border-[var(--color-secondary-light)] bg-[var(--color-bg-white)] p-5">
        <SectionTitle eyebrow="Risk" title="보완 필요" />
        <ListItems items={warnings?.length ? warnings : ['현재 Gemini가 감지한 주요 누락 정보는 없습니다.']} tone="yellow" />
      </div>
    </section>
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
