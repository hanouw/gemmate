import { useMemo, useState } from 'react'

const GEMINI_API_KEY = import.meta.env.GAK
const GEMINI_MODEL = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash'
const STORAGE_KEY = 'gemmate_projects'

const skillKeywords = [
  { key: 'data_scanner', label: '데이터 스캐너', category: '자료 조사' },
  { key: 'number_cruncher', label: '넘버 크런처', category: '데이터 분석' },
  { key: 'storyboarder', label: '스토리보더', category: '논리 설계' },
  { key: 'visual_director', label: '비주얼 디렉터', category: '디자인' },
  { key: 'copywriter', label: '카피라이터', category: '글쓰기' },
  { key: 'presenter', label: '프레젠터', category: '발표' },
  { key: 'pm', label: 'PM', category: '관리' },
  { key: 'detail_checker', label: '디테일 검수자', category: '검수' },
]

const makeId = () => `project_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

const emptyMember = (index) => ({
  id: makeId(),
  name: `팀원 ${index + 1}`,
  skills: [],
})

const createEmptyForm = () => ({
  title: '',
  course: '',
  deadline: '',
  notice: '',
  rubric: '',
  fileSummary: '',
  members: [emptyMember(0), emptyMember(1)],
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
  const canGenerate = useMemo(
    () => form.title.trim() && form.course.trim() && form.deadline.trim() && form.rubric.trim(),
    [form],
  )

  const saveProjects = (nextProjects) => {
    setProjects(nextProjects)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextProjects))
  }

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const updateMember = (memberId, nextMember) => {
    setForm((current) => ({
      ...current,
      members: current.members.map((member) => (member.id === memberId ? nextMember : member)),
    }))
  }

  const setMemberCount = (count) => {
    setForm((current) => {
      const nextMembers = [...current.members]
      while (nextMembers.length < count) nextMembers.push(emptyMember(nextMembers.length))
      return { ...current, members: nextMembers.slice(0, count) }
    })
  }

  const handleFiles = async (files) => {
    if (!files.length) return
    setIsReadingFiles(true)
    setError('')

    try {
      const summaries = await Promise.all(
        Array.from(files).map(async (file) => {
          const textLike = /\.(txt|md|csv|json|html|css|js|jsx|ts|tsx)$/i.test(file.name)
          if (!textLike) {
            return `[${file.name}] 현재 프론트 구현에서는 이 파일의 본문을 읽지 않고 파일명만 Gemini에 전달합니다.`
          }

          const text = await file.text()
          return `[${file.name}]\n${text.slice(0, 6000)}`
        }),
      )

      updateForm('fileSummary', summaries.join('\n\n'))
    } catch {
      setError('파일을 읽는 중 문제가 생겼습니다. 텍스트 파일인지 확인해 주세요.')
    } finally {
      setIsReadingFiles(false)
    }
  }

  const generatePlan = async () => {
    setError('')

    if (!GEMINI_API_KEY) {
      setError('GAK가 설정되어 있지 않습니다. Vercel 환경 변수 또는 로컬 .env.local에 Gemini API 키를 넣어주세요.')
      return
    }

    if (!canGenerate) {
      setError('프로젝트명, 강의명, 마감일, 평가기준은 필수 입력값입니다.')
      return
    }

    setIsGenerating(true)

    try {
      const gemini = await callGemini(buildProjectPrompt(form))
      const project = {
        id: makeId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        input: structuredClone(form),
        gemini,
        progress: {
          tasks: normalizeTasks(gemini.meeting_tasks),
          minutes: [],
          memberProgress: form.members.map((member) => ({
            memberId: member.id,
            name: member.name,
            progress: 0,
          })),
        },
      }

      saveProjects([project, ...projects])
      setActiveProjectId(project.id)
      setScreen('project')
    } catch (requestError) {
      setError(requestError.message || 'Gemini API 호출 중 문제가 생겼습니다.')
    } finally {
      setIsGenerating(false)
    }
  }

  const openProject = (projectId) => {
    setActiveProjectId(projectId)
    setScreen('project')
  }

  const deleteProject = (projectId) => {
    const nextProjects = projects.filter((project) => project.id !== projectId)
    saveProjects(nextProjects)
    if (activeProjectId === projectId) {
      setActiveProjectId(null)
      setScreen('dashboard')
    }
  }

  const resetForm = () => {
    setForm(createEmptyForm())
    setError('')
    setScreen('create')
  }

  return (
    <main className="min-h-screen bg-[#f7faff] text-[#111827]">
      <Header screen={screen} setScreen={setScreen} projectCount={projects.length} />

      {screen === 'landing' && <Landing onStart={resetForm} onDashboard={() => setScreen('dashboard')} projectCount={projects.length} />}
      {screen === 'dashboard' && <Dashboard projects={projects} onCreate={resetForm} onOpen={openProject} onDelete={deleteProject} />}
      {screen === 'create' && (
        <ProjectCreate
          form={form}
          updateForm={updateForm}
          updateMember={updateMember}
          setMemberCount={setMemberCount}
          handleFiles={handleFiles}
          isReadingFiles={isReadingFiles}
          isGenerating={isGenerating}
          canGenerate={canGenerate}
          error={error}
          onGenerate={generatePlan}
        />
      )}
      {screen === 'project' && (
        <ProjectDetail
          project={activeProject}
          onBack={() => setScreen('dashboard')}
          onCreate={resetForm}
          onDelete={deleteProject}
        />
      )}
    </main>
  )
}

function Header({ screen, setScreen, projectCount }) {
  return (
    <header className="sticky top-0 z-40 border-b border-[#d9e3f8] bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <button type="button" onClick={() => setScreen('landing')} className="text-left">
          <span className="block text-lg font-black tracking-tight text-[#003876]">Gemmate</span>
          <span className="block text-xs font-medium text-[#5f6f8f]">Yonsei x Gemini Learning System</span>
        </button>

        <div className="flex items-center gap-2">
          {screen !== 'landing' && (
            <button
              type="button"
              onClick={() => setScreen('dashboard')}
              className="rounded-full border border-[#9ab7e5] bg-white px-4 py-2 text-sm font-bold text-[#003876]"
            >
              대시보드 {projectCount > 0 ? projectCount : ''}
            </button>
          )}
          <button
            type="button"
            onClick={() => setScreen('create')}
            className="rounded-full bg-[#003876] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#002b5c]"
          >
            프로젝트 생성
          </button>
        </div>
      </div>
    </header>
  )
}

function Landing({ onStart, onDashboard, projectCount }) {
  return (
    <>
      <section className="relative overflow-hidden border-b border-[#d9e3f8] bg-[#eef5ff]">
        <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#003876,#4285F4,#34A853,#FBBC05,#EA4335)]" />
        <div className="mx-auto grid min-h-[calc(100vh-64px)] max-w-6xl gap-10 px-5 py-20 lg:grid-cols-[1fr_0.9fr] lg:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#003876]">Yonsei Social Sciences</p>
            <h1 className="mt-5 max-w-3xl text-5xl font-black leading-[1.05] tracking-tight text-[#071526] sm:text-6xl">
              팀 프로젝트를 공정하게 굴리는 Gemini 기반 학습 파트너
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[#334155]">
              Gemmate는 사용자가 입력한 공지사항, 평가기준, 파일 내용, 팀원 역량을 Gemini로 분석하고
              생성 결과를 브라우저 localStorage에 저장합니다.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onStart}
                className="rounded-full bg-[#003876] px-6 py-3 text-base font-bold text-white shadow-[0_12px_30px_rgba(0,56,118,0.2)] transition hover:bg-[#002b5c]"
              >
                프로젝트 생성 시작
              </button>
              <button
                type="button"
                onClick={onDashboard}
                className="rounded-full border border-[#9ab7e5] bg-white px-6 py-3 text-base font-bold text-[#003876] transition hover:border-[#4285F4]"
              >
                저장된 프로젝트 보기 {projectCount > 0 ? `(${projectCount})` : ''}
              </button>
            </div>
          </div>

          <div className="rounded-[28px] border border-[#c8d9f3] bg-white p-5 shadow-[0_24px_60px_rgba(15,23,42,0.12)]">
            <div className="rounded-3xl bg-[#003876] p-6 text-white">
              <p className="text-sm font-semibold text-[#bcd5ff]">Local-first workflow</p>
              <h2 className="mt-3 text-3xl font-black">DB 없이 프로젝트 저장</h2>
              <div className="mt-8 space-y-3">
                {['입력 데이터 수집', 'Gemini 계획 생성', 'localStorage 저장', '대시보드에서 재열람'].map((item, index) => (
                  <div key={item} className="flex items-center gap-3 rounded-2xl bg-white/10 p-4">
                    <span className={['bg-[#4285F4]', 'bg-[#34A853]', 'bg-[#FBBC05]', 'bg-[#EA4335]'][index] + ' h-3 w-3 rounded-full'} />
                    <span className="font-semibold">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-16">
        <div className="mx-auto grid max-w-6xl gap-5 md:grid-cols-3">
          <InfoCard title="1. 자료 입력" text="공지사항, 평가기준, 마감일, 파일 텍스트를 프로젝트 맥락으로 전달합니다." />
          <InfoCard title="2. Gemini 생성" text="상황별 프롬프트로 방향성, 역할 분배, 마일스톤, 회의 후 할 일을 생성합니다." />
          <InfoCard title="3. 로컬 저장" text="생성된 프로젝트는 현재 브라우저 localStorage에 저장되어 새로고침 후에도 유지됩니다." />
        </div>
      </section>
    </>
  )
}

function Dashboard({ projects, onCreate, onOpen, onDelete }) {
  return (
    <section className="px-5 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#003876]">Dashboard</p>
            <h1 className="mt-4 text-4xl font-black tracking-tight text-[#071526]">저장된 프로젝트</h1>
            <p className="mt-3 text-[#64748b]">이 브라우저에 저장된 프로젝트만 표시됩니다.</p>
          </div>
          <button type="button" onClick={onCreate} className="rounded-full bg-[#003876] px-5 py-3 font-bold text-white">
            새 프로젝트
          </button>
        </div>

        {projects.length === 0 ? (
          <div className="mt-10 rounded-3xl border border-dashed border-[#9ab7e5] bg-white p-10 text-center">
            <h2 className="text-2xl font-black text-[#003876]">아직 저장된 프로젝트가 없습니다</h2>
            <p className="mt-3 text-[#64748b]">프로젝트 정보를 입력하고 Gemini 계획을 생성하면 여기에 저장됩니다.</p>
            <button type="button" onClick={onCreate} className="mt-6 rounded-full bg-[#003876] px-5 py-3 font-bold text-white">
              첫 프로젝트 만들기
            </button>
          </div>
        ) : (
          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            {projects.map((project) => (
              <article key={project.id} className="rounded-3xl border border-[#d9e3f8] bg-white p-6 shadow-[0_18px_42px_rgba(15,23,42,0.06)]">
                <p className="text-sm font-bold text-[#4285F4]">{project.input.course}</p>
                <h2 className="mt-2 text-2xl font-black text-[#071526]">{project.input.title}</h2>
                <p className="mt-3 text-sm leading-6 text-[#64748b]">마감: {project.input.deadline}</p>
                <p className="mt-4 line-clamp-2 text-sm leading-6 text-[#334155]">{project.gemini.direction?.one_line || '생성된 방향성이 없습니다.'}</p>
                <div className="mt-6 flex flex-wrap gap-2">
                  <button type="button" onClick={() => onOpen(project.id)} className="rounded-full bg-[#003876] px-4 py-2 text-sm font-bold text-white">
                    열기
                  </button>
                  <button type="button" onClick={() => onDelete(project.id)} className="rounded-full border border-[#f4b4aa] px-4 py-2 text-sm font-bold text-[#b42318]">
                    삭제
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function ProjectCreate({
  form,
  updateForm,
  updateMember,
  setMemberCount,
  handleFiles,
  isReadingFiles,
  isGenerating,
  canGenerate,
  error,
  onGenerate,
}) {
  return (
    <section className="px-5 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#003876]">Create Project</p>
          <h1 className="mt-4 text-4xl font-black tracking-tight text-[#071526] sm:text-5xl">프로젝트 정보를 입력하세요</h1>
          <p className="mt-4 text-base leading-7 text-[#475569]">
            Gemini 생성 결과는 프로젝트 데이터로 합쳐져 localStorage에 저장됩니다.
          </p>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <Panel title="기본 정보">
            <div className="grid gap-4">
              <TextInput label="프로젝트명" value={form.title} onChange={(value) => updateForm('title', value)} placeholder="예: 회계원리 가치투자 분석 과제" />
              <TextInput label="강의명" value={form.course} onChange={(value) => updateForm('course', value)} placeholder="예: 회계원리" />
              <TextInput label="마감일" value={form.deadline} onChange={(value) => updateForm('deadline', value)} placeholder="예: 2026년 6월 7일 자정" />
              <TextArea label="공지사항" value={form.notice} onChange={(value) => updateForm('notice', value)} placeholder="교수님 공지, 제출 방식, 제한 사항을 붙여 넣으세요." />
              <TextArea label="평가기준" value={form.rubric} onChange={(value) => updateForm('rubric', value)} placeholder="배점, 페이지 제한, 필수 포함 요소를 붙여 넣으세요." />
            </div>
          </Panel>

          <div className="space-y-6">
            <Panel title="파일 업로드">
              <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-[#9ab7e5] bg-[#f7faff] p-6 text-center transition hover:border-[#4285F4]">
                <span className="text-base font-bold text-[#003876]">{isReadingFiles ? '파일을 읽는 중...' : '파일 선택'}</span>
                <span className="mt-2 text-sm leading-6 text-[#64748b]">
                  txt, md, csv, json 등 텍스트 파일은 본문을 읽고 PDF/DOCX/PPTX는 파일명만 전달합니다.
                </span>
                <input type="file" multiple className="sr-only" onChange={(event) => handleFiles(event.target.files)} />
              </label>
              {form.fileSummary && (
                <textarea
                  value={form.fileSummary}
                  onChange={(event) => updateForm('fileSummary', event.target.value)}
                  className="mt-4 h-40 w-full resize-none rounded-3xl border border-[#d9e3f8] bg-white p-4 text-sm leading-6 outline-none focus:border-[#4285F4]"
                />
              )}
            </Panel>

            <Panel title="팀원 역량">
              <label className="block">
                <span className="text-sm font-bold text-[#1e293b]">팀원 인원수</span>
                <input
                  type="range"
                  min="2"
                  max="8"
                  value={form.members.length}
                  onChange={(event) => setMemberCount(Number(event.target.value))}
                  className="mt-4 w-full accent-[#003876]"
                />
                <span className="mt-2 block text-sm font-bold text-[#003876]">{form.members.length}명</span>
              </label>

              <div className="mt-5 space-y-5">
                {form.members.map((member) => (
                  <MemberEditor key={member.id} member={member} updateMember={updateMember} />
                ))}
              </div>
            </Panel>
          </div>
        </div>

        {error && <div className="mt-6 rounded-3xl border border-[#f4b4aa] bg-[#fff4f2] p-4 text-sm font-semibold text-[#9a3412]">{error}</div>}

        <div className="mt-8 flex flex-col gap-3 rounded-3xl border border-[#d9e3f8] bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-black text-[#071526]">Gemini로 프로젝트 계획 생성 및 저장</p>
            <p className="mt-1 text-sm text-[#64748b]">필수값: 프로젝트명, 강의명, 마감일, 평가기준</p>
          </div>
          <button
            type="button"
            disabled={!canGenerate || isGenerating}
            onClick={onGenerate}
            className="rounded-full bg-[#003876] px-6 py-3 text-base font-bold text-white transition hover:bg-[#002b5c] disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isGenerating ? 'Gemini 분석 중...' : '생성하고 저장'}
          </button>
        </div>
      </div>
    </section>
  )
}

function MemberEditor({ member, updateMember }) {
  return (
    <div className="rounded-3xl border border-[#d9e3f8] bg-[#f7faff] p-4">
      <TextInput label="이름" value={member.name} onChange={(value) => updateMember(member.id, { ...member, name: value })} />
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {skillKeywords.map((skill) => {
          const active = member.skills.includes(skill.label)
          return (
            <button
              key={skill.key}
              type="button"
              onClick={() =>
                updateMember(member.id, {
                  ...member,
                  skills: active ? member.skills.filter((item) => item !== skill.label) : [...member.skills, skill.label],
                })
              }
              className={`rounded-2xl border p-3 text-left transition ${
                active ? 'border-[#4285F4] bg-white shadow-[0_8px_24px_rgba(66,133,244,0.12)]' : 'border-[#d9e3f8] bg-white/65 hover:bg-white'
              }`}
            >
              <span className="block text-xs font-bold text-[#003876]">{skill.category}</span>
              <span className="mt-1 block text-sm font-black text-[#111827]">{skill.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ProjectDetail({ project, onBack, onCreate, onDelete }) {
  if (!project) {
    return (
      <section className="px-5 py-16">
        <div className="mx-auto max-w-3xl rounded-3xl border border-[#d9e3f8] bg-white p-10 text-center">
          <h1 className="text-2xl font-black text-[#003876]">프로젝트를 찾을 수 없습니다</h1>
          <button type="button" onClick={onBack} className="mt-6 rounded-full bg-[#003876] px-5 py-3 font-bold text-white">
            대시보드로 이동
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="px-5 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#003876]">{project.input.course}</p>
            <h1 className="mt-4 text-4xl font-black tracking-tight text-[#071526]">{project.input.title}</h1>
            <p className="mt-3 text-[#64748b]">마감: {project.input.deadline}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onBack} className="rounded-full border border-[#9ab7e5] bg-white px-5 py-3 font-bold text-[#003876]">
              대시보드
            </button>
            <button type="button" onClick={onCreate} className="rounded-full bg-[#003876] px-5 py-3 font-bold text-white">
              새 프로젝트
            </button>
            <button type="button" onClick={() => onDelete(project.id)} className="rounded-full border border-[#f4b4aa] px-5 py-3 font-bold text-[#b42318]">
              삭제
            </button>
          </div>
        </div>

        <ResultSections result={project.gemini} />

        <section className="mt-6 rounded-3xl border border-[#d9e3f8] bg-white p-6">
          <h2 className="text-2xl font-black text-[#071526]">저장된 입력 정보</h2>
          <pre className="mt-4 overflow-auto rounded-2xl bg-slate-950 p-4 text-xs leading-6 text-slate-100">{JSON.stringify(project.input, null, 2)}</pre>
        </section>
      </div>
    </section>
  )
}

function ResultSections({ result }) {
  return (
    <div className="mt-8 grid gap-6">
      <ResultCard title="프로젝트 방향성" content={result.direction} accent="blue" />
      <ResultCard title="역할 분배" content={result.roles} />
      <ResultCard title="마일스톤" content={result.milestones} />
      <ResultCard title="회의 후 할 일" content={result.meeting_tasks} />
      <ResultCard title="AI 조언" content={result.advice} accent="green" />
      {result.warnings?.length > 0 && <ResultCard title="입력 보완 필요" content={result.warnings} accent="red" />}
    </div>
  )
}

function ResultCard({ title, content, accent = 'default' }) {
  const accentClass =
    accent === 'blue'
      ? 'border-l-[#4285F4]'
      : accent === 'green'
        ? 'border-l-[#34A853]'
        : accent === 'red'
          ? 'border-l-[#EA4335]'
          : 'border-l-[#003876]'

  return (
    <section className={`rounded-3xl border border-[#d9e3f8] border-l-8 ${accentClass} bg-white p-6`}>
      <h2 className="text-2xl font-black text-[#071526]">{title}</h2>
      {Array.isArray(content) ? (
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {content.map((item, index) => (
            <div key={index} className="rounded-2xl bg-[#f7faff] p-4">
              {typeof item === 'string' ? <p className="leading-7 text-[#334155]">{item}</p> : <ObjectView data={item} />}
            </div>
          ))}
        </div>
      ) : typeof content === 'object' && content !== null ? (
        <div className="mt-5 rounded-2xl bg-[#f7faff] p-4">
          <ObjectView data={content} />
        </div>
      ) : (
        <p className="mt-4 whitespace-pre-wrap leading-8 text-[#334155]">{content || '생성된 내용이 없습니다.'}</p>
      )}
    </section>
  )
}

function ObjectView({ data }) {
  return (
    <dl className="space-y-3">
      {Object.entries(data).map(([key, value]) => (
        <div key={key}>
          <dt className="text-xs font-black uppercase tracking-[0.12em] text-[#003876]">{key}</dt>
          <dd className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[#334155]">
            {Array.isArray(value) ? value.join('\n') : typeof value === 'object' && value !== null ? JSON.stringify(value, null, 2) : value}
          </dd>
        </div>
      ))}
    </dl>
  )
}

function InfoCard({ title, text }) {
  return (
    <div className="rounded-3xl border border-[#d9e3f8] bg-white p-6">
      <h2 className="text-xl font-black text-[#003876]">{title}</h2>
      <p className="mt-3 leading-7 text-[#475569]">{text}</p>
    </div>
  )
}

function Panel({ title, children }) {
  return (
    <section className="rounded-3xl border border-[#d9e3f8] bg-white p-6 shadow-[0_18px_42px_rgba(15,23,42,0.06)]">
      <h2 className="text-xl font-black text-[#003876]">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  )
}

function TextInput({ label, value, onChange, placeholder = '' }) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-[#1e293b]">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 h-12 w-full rounded-2xl border border-[#d9e3f8] bg-white px-4 outline-none transition placeholder:text-slate-400 focus:border-[#4285F4] focus:ring-4 focus:ring-[#4285F4]/10"
      />
    </label>
  )
}

function TextArea({ label, value, onChange, placeholder }) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-[#1e293b]">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={6}
        className="mt-2 w-full resize-none rounded-3xl border border-[#d9e3f8] bg-white p-4 leading-7 outline-none transition placeholder:text-slate-400 focus:border-[#4285F4] focus:ring-4 focus:ring-[#4285F4]/10"
      />
    </label>
  )
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
    throw new Error('Gemini가 JSON 형식이 아닌 응답을 반환했습니다. 다시 생성해 주세요.')
  }
}

function buildProjectPrompt(form) {
  const members = form.members
    .map((member) => `- ${member.name}: ${member.skills.length ? member.skills.join(', ') : '선택 키워드 없음'}`)
    .join('\n')

  return `
너는 연세대학교 사회과학대학 학생들의 팀 프로젝트를 돕는 Gemini 기반 AI 팀메이트 "Gemmate"다.
사용자가 입력한 실제 프로젝트 데이터만 근거로 삼아야 하며, 없는 파일 내용이나 팀원 데이터를 임의로 지어내지 마라.

목표:
1. 평가기준에 맞춘 프로젝트 진행 방향성을 정한다.
2. 팀원 역량 키워드에 맞춰 역할과 책임을 배분한다.
3. 마감일부터 역산한 마일스톤을 만든다.
4. 첫 회의 후 바로 실행할 할 일을 추천한다.
5. 누락된 정보가 있으면 warnings에 명시한다.

프로젝트 정보:
- 프로젝트명: ${form.title}
- 강의명: ${form.course}
- 마감일: ${form.deadline}

공지사항:
${form.notice || '입력 없음'}

평가기준:
${form.rubric}

업로드 파일에서 읽은 내용 또는 파일명:
${form.fileSummary || '입력 없음'}

팀원 역량 키워드:
${members}

반드시 아래 JSON 스키마로만 답하라. 마크다운 코드블록은 쓰지 마라.
{
  "direction": {
    "one_line": "프로젝트 전체 방향성 한 문장",
    "strategy": "평가기준을 근거로 한 진행 전략",
    "avoid": "팀이 피해야 할 실수"
  },
  "roles": [
    {
      "member": "팀원 이름",
      "role_title": "역할명",
      "reason": "선택한 역량 키워드에 근거한 배정 이유",
      "responsibilities": ["구체 업무 1", "구체 업무 2"]
    }
  ],
  "milestones": [
    {
      "phase": "Phase 이름",
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

export default App
