import { useMemo, useState } from 'react'

const features = [
  {
    title: '전략적 온보딩',
    desc: '주제, 평가 방식, 제출물을 입력하면 프로젝트 목표와 성공 기준을 먼저 정리합니다.',
    metric: '4분',
    tag: 'Goal',
  },
  {
    title: 'AI 역량 매칭',
    desc: '팀원별 강점과 선호도를 바탕으로 역할을 자동 배분하고 빈 역할을 알려줍니다.',
    metric: '92%',
    tag: 'Match',
  },
  {
    title: '지능형 마일스톤',
    desc: '마감일부터 역산해 주차별 로드맵과 회의 안건을 자동 생성합니다.',
    metric: '6단계',
    tag: 'Plan',
  },
  {
    title: '실시간 기여도 트래킹',
    desc: 'Docs, Drive, Meet 활동을 읽어 실제 작업량과 참여 흐름을 수치화합니다.',
    metric: 'Live',
    tag: 'Track',
  },
  {
    title: '성장형 넛지',
    desc: '진행률이 낮아지면 감정 소모 없이 구체적인 다음 행동을 제안합니다.',
    metric: '+18%',
    tag: 'Nudge',
  },
  {
    title: '스마트 미트 모더레이션',
    desc: '회의록을 정리하고 논점이 벗어날 때 다시 평가 기준으로 복귀시킵니다.',
    metric: '실시간',
    tag: 'Meet',
  },
  {
    title: '객관적 갈등 중재',
    desc: '의견 대립을 감지하면 각 안의 장단점과 절충안을 제시합니다.',
    metric: '중립',
    tag: 'Mediate',
  },
  {
    title: '교수자용 리포트',
    desc: '참여율, 산출물, 회의 기여도를 평가 근거로 정리합니다.',
    metric: 'PDF',
    tag: 'Report',
  },
]

const members = [
  { name: '민서', role: '자료 조사', progress: 92, signal: '안정', color: 'bg-[#003876]' },
  { name: '지훈', role: '발표 설계', progress: 76, signal: '집중 필요', color: 'bg-[#4285F4]' },
  { name: '서연', role: '데이터 분석', progress: 84, signal: '안정', color: 'bg-[#34A853]' },
  { name: '도윤', role: '시각 자료', progress: 61, signal: '넛지 예정', color: 'bg-[#FBBC05]' },
]

const projectTypes = {
  report: {
    label: '전공 리포트',
    goal: '평가 루브릭에 맞춘 논증 구조와 참고문헌 품질을 우선합니다.',
    steps: ['강의 자료 RAG 인덱싱', '논점별 자료 분담', '1차 초안 검토', '최종 기여도 리포트'],
  },
  presentation: {
    label: '발표 과제',
    goal: '스토리라인, 슬라이드 완성도, 발표 리허설 시간을 균형 있게 배분합니다.',
    steps: ['청중과 평가 기준 정의', '역할 기반 슬라이드 분배', 'Meet 리허설 분석', '발표 Q&A 대비'],
  },
  research: {
    label: '조사 프로젝트',
    goal: '현장 자료, 인터뷰, 데이터 정리를 추적해 무임승차 리스크를 낮춥니다.',
    steps: ['조사 질문 확정', '데이터 수집 책임자 지정', '중간 점검 넛지', '교수자용 근거 정리'],
  },
}

const conflictPlans = {
  quiet: {
    title: '연락 두절 감지',
    risk: '응답 지연이 36시간을 넘었고 Drive 활동이 낮습니다.',
    action: '개인 비난 없이 “오늘 21시까지 가능한 산출물 범위”를 묻는 메시지를 제안합니다.',
  },
  scope: {
    title: '방향성 충돌',
    risk: '자료 조사팀은 이론 중심, 발표팀은 사례 중심으로 목표가 갈라졌습니다.',
    action: '평가 기준 40%, 설득력 35%, 실현 가능성 25%로 두 안을 비교해 혼합안을 만듭니다.',
  },
  load: {
    title: '업무 편중',
    risk: '한 명의 문서 수정 비중이 48%로 올라 팀 피로도가 높아질 수 있습니다.',
    action: '남은 작업을 난이도별로 재분배하고 낮은 기여 팀원에게 작은 완료 단위를 배정합니다.',
  },
}

function App() {
  const [activeFeature, setActiveFeature] = useState(0)
  const [view, setView] = useState('student')
  const [projectType, setProjectType] = useState('presentation')
  const [deadline, setDeadline] = useState(21)
  const [conflict, setConflict] = useState('scope')
  const [nudgeSent, setNudgeSent] = useState(false)

  const selectedProject = projectTypes[projectType]
  const selectedConflict = conflictPlans[conflict]
  const teamAverage = useMemo(
    () => Math.round(members.reduce((sum, member) => sum + member.progress, 0) / members.length),
    [],
  )

  return (
    <main className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f]">
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-black/95 text-white backdrop-blur-xl">
        <div className="mx-auto flex h-11 max-w-6xl items-center justify-between px-5 text-[12px]">
          <a className="font-semibold tracking-normal" href="#top" aria-label="Gemmate home">
            Gemmate
          </a>
          <div className="hidden items-center gap-7 text-white/72 md:flex">
            <a href="#dashboard" className="transition hover:text-white">Dashboard</a>
            <a href="#features" className="transition hover:text-white">AI Functions</a>
            <a href="#report" className="transition hover:text-white">Report</a>
          </div>
          <a
            href="#onboarding"
            className="rounded-full bg-[#0066cc] px-4 py-1.5 text-[12px] text-white transition active:scale-95"
          >
            시작하기
          </a>
        </div>
      </nav>

      <section id="top" className="bg-white">
        <div className="mx-auto grid min-h-[calc(100vh-44px)] max-w-6xl content-center gap-10 px-5 py-20 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div className="mx-auto max-w-xl text-center lg:mx-0 lg:text-left">
            <p className="mb-5 text-[13px] font-semibold text-[#003876]">Yonsei Social Sciences x Gemini</p>
            <h1 className="text-[44px] font-semibold leading-[1.06] tracking-normal text-[#111113] sm:text-[56px] lg:text-[64px]">
              팀플의 공정성을 설계하는 AI 팀메이트.
            </h1>
            <p className="mx-auto mt-6 max-w-lg text-[19px] leading-[1.55] text-[#333] lg:mx-0">
              Gemmate는 팀원의 역량, 회의, 문서 활동, 갈등 신호를 함께 읽고 프로젝트가 끝까지 굴러가도록 조율하는 지능형 AI 팀장입니다.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3 lg:justify-start">
              <a className="rounded-full bg-[#0066cc] px-6 py-3 text-[17px] text-white transition active:scale-95" href="#dashboard">
                데모 보기
              </a>
              <a className="rounded-full border border-[#0066cc] px-6 py-3 text-[17px] text-[#0066cc] transition active:scale-95" href="#features">
                기능 살펴보기
              </a>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[620px]">
            <div className="rounded-[28px] border border-[#dfe4ee] bg-[#f8fbff] p-3 shadow-[3px_5px_30px_rgba(0,0,0,0.18)]">
              <div className="rounded-[20px] bg-white p-5">
                <div className="flex items-center justify-between border-b border-[#edf0f4] pb-4">
                  <div>
                    <p className="text-[13px] font-semibold text-[#003876]">사회문제 분석 팀 프로젝트</p>
                    <p className="mt-1 text-[12px] text-[#7a7a7a]">Gemini가 4개 워크스페이스를 동기화 중</p>
                  </div>
                  <span className="rounded-full bg-[#eaf2ff] px-3 py-1 text-[12px] font-semibold text-[#0066cc]">Live</span>
                </div>
                <div className="grid gap-4 py-5 sm:grid-cols-3">
                  <Metric label="팀 진행률" value={`${teamAverage}%`} />
                  <Metric label="갈등 위험" value="낮음" />
                  <Metric label="남은 일정" value="D-21" />
                </div>
                <div className="space-y-3">
                  {members.map((member) => (
                    <div key={member.name} className="rounded-[18px] border border-[#e8ebf0] bg-[#fafafc] p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[15px] font-semibold">{member.name} · {member.role}</p>
                          <p className="text-[12px] text-[#7a7a7a]">{member.signal}</p>
                        </div>
                        <span className="text-[17px] font-semibold">{member.progress}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-[#e8ebf0]">
                        <div className={`h-full rounded-full ${member.color}`} style={{ width: `${member.progress}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="dashboard" className="bg-[#252527] px-5 py-20 text-white">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="text-[13px] font-semibold text-[#8ab4f8]">Dashboard Mode</p>
              <h2 className="mt-3 text-[34px] font-semibold leading-tight sm:text-[44px]">학생에게는 동기부여, 교수자에게는 근거.</h2>
            </div>
            <div className="flex w-full rounded-full bg-white/10 p-1 md:w-auto">
              {['student', 'professor'].map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setView(mode)}
                  className={`flex-1 rounded-full px-5 py-2 text-[14px] transition active:scale-95 md:flex-none ${
                    view === mode ? 'bg-white text-[#1d1d1f]' : 'text-white/72'
                  }`}
                >
                  {mode === 'student' ? '학생용' : '교수자용'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
            <Panel dark>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[14px] text-white/60">{view === 'student' ? '나의 다음 행동' : '평가 근거 요약'}</p>
                  <h3 className="mt-2 text-[28px] font-semibold">
                    {view === 'student' ? '도윤에게 작은 완료 단위를 제안했어요.' : '기여도 편차와 산출물 근거를 분리했어요.'}
                  </h3>
                </div>
                <div className="hidden rounded-full bg-[#0066cc] px-4 py-2 text-[14px] sm:block">Gemini 분석</div>
              </div>
              <div className="mt-8 grid gap-4 md:grid-cols-3">
                {(view === 'student'
                  ? [
                      ['회의 발언 균형', '82%'],
                      ['문서 반영률', '76%'],
                      ['마감 위험', '낮음'],
                    ]
                  : [
                      ['평균 참여율', '78%'],
                      ['근거 이벤트', '146개'],
                      ['중재 기록', '3건'],
                    ]
                ).map(([label, value]) => (
                  <div key={label} className="rounded-[18px] border border-white/10 bg-white/[0.06] p-5">
                    <p className="text-[13px] text-white/55">{label}</p>
                    <p className="mt-3 text-[32px] font-semibold">{value}</p>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel dark>
              <p className="text-[14px] text-white/60">실시간 넛지</p>
              <h3 className="mt-2 text-[26px] font-semibold">감정 대신 행동을 보냅니다.</h3>
              <p className="mt-4 text-[16px] leading-relaxed text-white/72">
                {nudgeSent
                  ? '넛지가 발송되었습니다. 다음 회의 전까지 “자료 카드 3개 추가”가 도윤의 할 일로 등록됐습니다.'
                  : '진행률이 낮은 팀원에게 비난 없이 작고 명확한 다음 작업을 제안할 수 있습니다.'}
              </p>
              <button
                type="button"
                onClick={() => setNudgeSent((value) => !value)}
                className="mt-7 rounded-full bg-[#0066cc] px-5 py-3 text-[15px] text-white transition active:scale-95"
              >
                {nudgeSent ? '넛지 되돌리기' : '넛지 보내기'}
              </button>
            </Panel>
          </div>
        </div>
      </section>

      <section id="onboarding" className="bg-white px-5 py-20">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="text-[13px] font-semibold text-[#003876]">Strategic Onboarding</p>
            <h2 className="mt-3 text-[36px] font-semibold leading-tight sm:text-[48px]">입력하면, 팀의 운영 체계가 먼저 잡힙니다.</h2>
            <p className="mt-5 text-[17px] leading-[1.47] text-[#333]">
              백엔드 없이도 선택값에 따라 Gemini가 생성하는 목표, 일정, 역할 분배의 흐름을 미리 체험할 수 있게 구성했습니다.
            </p>
          </div>
          <div className="rounded-[18px] border border-[#e0e0e0] bg-[#fafafc] p-5">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-[14px] font-semibold">프로젝트 유형</span>
                <select
                  value={projectType}
                  onChange={(event) => setProjectType(event.target.value)}
                  className="mt-2 h-12 w-full rounded-full border border-[#d9dde5] bg-white px-4 text-[15px] outline-none focus:border-[#0071e3]"
                >
                  {Object.entries(projectTypes).map(([key, item]) => (
                    <option key={key} value={key}>{item.label}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-[14px] font-semibold">마감까지 남은 날</span>
                <input
                  type="range"
                  min="7"
                  max="45"
                  value={deadline}
                  onChange={(event) => setDeadline(event.target.value)}
                  className="mt-4 w-full accent-[#0066cc]"
                />
                <span className="mt-2 block text-[15px] text-[#0066cc]">D-{deadline}</span>
              </label>
            </div>
            <div className="mt-6 rounded-[18px] bg-white p-5">
              <p className="text-[13px] font-semibold text-[#4285F4]">Gemini generated brief</p>
              <h3 className="mt-2 text-[24px] font-semibold">{selectedProject.label} 운영 목표</h3>
              <p className="mt-3 text-[16px] leading-relaxed text-[#333]">{selectedProject.goal}</p>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {selectedProject.steps.map((step, index) => (
                  <div key={step} className="rounded-[14px] border border-[#edf0f4] p-4">
                    <p className="text-[12px] text-[#7a7a7a]">Step {index + 1}</p>
                    <p className="mt-1 text-[15px] font-semibold">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="bg-[#f5f5f7] px-5 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[13px] font-semibold text-[#003876]">8 Core Functions</p>
            <h2 className="mt-3 text-[36px] font-semibold leading-tight sm:text-[48px]">팀 프로젝트의 병목을 기능으로 쪼갰습니다.</h2>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => (
              <button
                key={feature.title}
                type="button"
                onClick={() => setActiveFeature(index)}
                className={`min-h-[190px] rounded-[18px] border p-5 text-left transition active:scale-[0.98] ${
                  activeFeature === index
                    ? 'border-[#0071e3] bg-white'
                    : 'border-[#e0e0e0] bg-white/70 hover:bg-white'
                }`}
              >
                <span className="rounded-full bg-[#eaf2ff] px-3 py-1 text-[12px] font-semibold text-[#0066cc]">{feature.tag}</span>
                <h3 className="mt-5 text-[19px] font-semibold">{feature.title}</h3>
                <p className="mt-3 text-[14px] leading-relaxed text-[#555]">{feature.desc}</p>
                <p className="mt-4 text-[24px] font-semibold text-[#003876]">{feature.metric}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-5 py-20">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-2">
          <div>
            <p className="text-[13px] font-semibold text-[#003876]">Conflict Mediation</p>
            <h2 className="mt-3 text-[36px] font-semibold leading-tight sm:text-[48px]">갈등은 숨기지 않고, 구조화합니다.</h2>
            <div className="mt-6 flex flex-wrap gap-2">
              {Object.entries(conflictPlans).map(([key, item]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setConflict(key)}
                  className={`rounded-full px-4 py-2 text-[14px] transition active:scale-95 ${
                    conflict === key ? 'bg-[#0066cc] text-white' : 'border border-[#d9dde5] bg-white text-[#333]'
                  }`}
                >
                  {item.title}
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-[18px] border border-[#e0e0e0] bg-[#fafafc] p-6">
            <p className="text-[13px] font-semibold text-[#EA4335]">Risk signal</p>
            <h3 className="mt-2 text-[28px] font-semibold">{selectedConflict.title}</h3>
            <p className="mt-4 text-[17px] leading-relaxed text-[#333]">{selectedConflict.risk}</p>
            <div className="my-6 h-px bg-[#e0e0e0]" />
            <p className="text-[13px] font-semibold text-[#34A853]">Neutral action</p>
            <p className="mt-3 text-[17px] leading-relaxed text-[#333]">{selectedConflict.action}</p>
          </div>
        </div>
      </section>

      <section id="report" className="bg-[#003876] px-5 py-20 text-white">
        <div className="mx-auto max-w-6xl text-center">
          <p className="text-[13px] font-semibold text-[#8ab4f8]">For Better Learning at University</p>
          <h2 className="mx-auto mt-3 max-w-3xl text-[38px] font-semibold leading-tight sm:text-[54px]">
            Gemmate는 팀플을 관리하는 도구가 아니라, 협업을 배우게 하는 동료입니다.
          </h2>
          <div className="mx-auto mt-10 grid max-w-4xl gap-4 md:grid-cols-3">
            {[
              ['공정성', '기여도가 데이터로 남아 평가 근거가 됩니다.'],
              ['몰입', '회의록, 일정, 리마인드를 AI가 정리합니다.'],
              ['성장', '갈등 상황을 합리적 의사결정 훈련으로 전환합니다.'],
            ].map(([title, desc]) => (
              <div key={title} className="rounded-[18px] border border-white/15 bg-white/10 p-6 text-left">
                <h3 className="text-[21px] font-semibold">{title}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-white/72">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}

function Metric({ label, value }) {
  return (
    <div className="rounded-[18px] bg-[#f5f5f7] p-4">
      <p className="text-[12px] text-[#7a7a7a]">{label}</p>
      <p className="mt-2 text-[28px] font-semibold text-[#1d1d1f]">{value}</p>
    </div>
  )
}

function Panel({ children, dark = false }) {
  return (
    <div className={`rounded-[18px] border p-6 ${dark ? 'border-white/10 bg-white/[0.06]' : 'border-[#e0e0e0] bg-white'}`}>
      {children}
    </div>
  )
}

export default App
