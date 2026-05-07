export const skillKeywords = [
  { key: 'data_scanner', label: '데이터 스캐너', description: '자료, 공시, 기사에서 필요한 근거를 빠르게 찾습니다.' },
  { key: 'number_cruncher', label: '넘버 크런처', description: '엑셀, 계산, 재무비율, 통계 분석에 강합니다.' },
  { key: 'storyboarder', label: '스토리보더', description: '서론-본론-결론과 논리 흐름을 설계합니다.' },
  { key: 'visual_director', label: '비주얼 디렉터', description: 'PPT 레이아웃, 그래프, 표 시각화에 강합니다.' },
  { key: 'copywriter', label: '카피라이터', description: '분석 내용을 읽기 좋은 문장으로 다듬습니다.' },
  { key: 'presenter', label: '프레젠터', description: '발표와 질의응답을 명확하게 수행합니다.' },
  { key: 'pm', label: 'PM', description: '일정, 마감, 팀원 소통을 조율합니다.' },
  { key: 'detail_checker', label: '디테일 검수자', description: '오타, 참고문헌, 제출 형식을 꼼꼼히 확인합니다.' },
]

export const sampleMeetings = [
  {
    date: '2026.05.08',
    title: '킥오프 회의',
    summary: '평가기준 확인과 역할 분배 방향 논의',
    attendees: ['민서', '지훈', '서연', '도윤'],
    sections: [
      {
        title: '평가기준 해석',
        items: [
          '본문 10페이지 제한을 기준으로 배점이 높은 재무제표 분석과 적정 주가 예측에 가장 많은 시간을 배정하기로 했습니다.',
          '기업 소개와 거시환경 설명은 최소화하고, 투자 논리와 수치 근거가 직접 연결되도록 구성합니다.',
        ],
      },
      {
        title: '역할 분배',
        items: [
          '민서는 DART 재무제표 수집과 재무비율 계산을 맡습니다.',
          '지훈은 산업 분석과 SWOT 논리 구조를 담당합니다.',
          '서연은 PPT 흐름과 시각화 템플릿을 정리합니다.',
          '도윤은 참고문헌, 제출 형식, 발표 스크립트 검수를 맡습니다.',
        ],
      },
    ],
    decisions: [
      '분석 대상 산업은 2차전지 소재 산업으로 확정합니다.',
      '비교 기업은 동일 산업 내 경쟁 관계가 명확한 2개 기업으로 압축합니다.',
      '모든 자료는 출처와 수집일을 함께 기록합니다.',
    ],
    nextSchedule: [
      '다음 회의: 2026.05.15 20:00, Google Meet',
      '다음 회의 전까지 기업 후보 3곳과 최근 3개년 재무제표 원본을 업로드합니다.',
      '각자 맡은 자료는 Google Docs 회의록 하단에 링크로 남깁니다.',
    ],
    attachment: 'kickoff_meeting_transcript_20260508.txt',
  },
  {
    date: '2026.05.15',
    title: '중간 점검',
    summary: '자료 수집 현황과 마일스톤 조정',
    attendees: ['민서', '지훈', '서연', '도윤'],
    sections: [
      {
        title: '자료 수집 현황',
        items: [
          '기업 A와 기업 B의 사업보고서, 재무상태표, 손익계산서, 현금흐름표를 확보했습니다.',
          '일부 보도자료는 투자 논리 근거로 쓰기에는 출처 신뢰도가 낮아 제외하기로 했습니다.',
        ],
      },
      {
        title: '분석 방향 조정',
        items: [
          '수익성 지표는 영업이익률과 ROE를 중심으로 비교합니다.',
          '안정성 지표는 부채비율과 유동비율을 같이 제시해 단일 지표 해석을 피합니다.',
          'SWOT의 강점과 기회가 재무제표 수치와 연결되도록 문장을 재작성합니다.',
        ],
      },
    ],
    decisions: [
      '최종 타겟 기업은 기업 A로 가설을 세우고 기업 B는 대조군으로 둡니다.',
      'PPT 본문은 10페이지를 넘기지 않도록 페이지별 담당자를 지정합니다.',
      '5월 23일까지 재무비율 표와 SWOT 초안을 동시에 완성합니다.',
    ],
    nextSchedule: [
      '다음 회의: 2026.05.22 21:00, Google Meet',
      '민서는 재무비율 계산표를 완성하고 주요 해석 문장을 함께 작성합니다.',
      '서연은 그래프 스타일 2안을 만들어 팀 채팅에 공유합니다.',
    ],
    attachment: 'midcheck_transcript_20260515.txt',
  },
  {
    date: '2026.05.22',
    title: '최종 구조 회의',
    summary: '발표 흐름과 최종 검수 항목 확정',
    attendees: ['민서', '지훈', '서연', '도윤'],
    sections: [
      {
        title: '스토리라인 확정',
        items: [
          '도입부는 기업 선정 논리와 PESTLE 요약으로 압축합니다.',
          '본문은 재무비율 비교, SWOT 기반 투자 논리, 2026년 적정 주가 예측 순서로 구성합니다.',
          '결론에서는 투자 판단의 한계와 수업 평가 기준과의 연결성을 함께 제시합니다.',
        ],
      },
      {
        title: '최종 검수 기준',
        items: [
          '표와 그래프의 단위, 기준연도, 출처 표기를 통일합니다.',
          'PPT와 PDF 두 파일이 모두 제출 가능한 상태인지 별도 체크합니다.',
          '발표 스크립트는 5분 이내 버전과 질의응답 대비 버전으로 분리합니다.',
        ],
      },
    ],
    decisions: [
      '최종 PPT는 표지 1장, 본문 10장, 참고문헌 1장으로 확정합니다.',
      '6월 6일에는 내용 수정 없이 오탈자와 파일 형식만 검수합니다.',
      '제출은 도윤이 담당하고, 제출 직후 팀 채팅에 캡처를 공유합니다.',
    ],
    nextSchedule: [
      '다음 회의: 2026.06.01 20:30, Google Meet',
      '다음 회의 전까지 PPT 초안과 DCF 계산 근거표를 모두 업로드합니다.',
      '발표 예상 질문 5개를 각자 1개 이상 작성합니다.',
    ],
    attachment: 'final_structure_transcript_20260522.txt',
  },
]

export const createStarterProject = () => ({
  id: 'starter_value_investing_2026',
  createdAt: '2026-05-07T09:00:00.000Z',
  updatedAt: '2026-05-07T09:00:00.000Z',
  input: {
    title: '회계원리 가치투자 분석 프로젝트',
    course: '회계원리',
    deadline: '2026. 06. 07. (일)',
    notice: '본문 10페이지 이내, PPT와 PDF 동시 제출. 동일 산업 내 경쟁 기업 2개를 선정하고 2026년 12월 말 기준 적정 주가를 예측합니다.',
    rubric: '기업 선정 및 PESTLE 2점, 재무제표 분석 3점, SWOT 기반 투자 논리 2점, 적정 주가 예측 2점, 결론 및 시사점 1점.',
    fileSummary: '[평가기준.pdf]\n본문 10페이지 제한, 참고문헌 별도, LearnUs 제출\n\n[사업보고서_수집목록.xlsx]\n기업 A, 기업 B 최근 3개년 재무제표 수집 예정',
    memberCount: 4,
  },
  selfProfile: {
    name: '민서',
    selectedSkills: ['넘버 크런처', '데이터 스캐너', '프레젠터'],
    strengths: '엑셀 계산과 재무비율 해석에 강하고 발표를 맡을 수 있습니다.',
    weakness: 'PPT 디자인은 시간이 오래 걸립니다.',
    preferredRole: '정량 분석 및 발표',
    availableTime: '평일 저녁, 주말 오후',
  },
  rolesPanelSeen: false,
  gemini: {
    direction: {
      one_line: '재무적 근거와 전략 분석이 일치하는 가치투자 논리로 기업 A의 투자 매력도를 검증한다.',
      strategy: '기업 A를 타겟으로 두고 기업 B를 대조군으로 사용합니다. 수익성, 안정성, 성장성 지표를 먼저 비교한 뒤 SWOT과 DCF 가정을 연결해 적정 주가 산출 논리가 따로 놀지 않게 구성합니다.',
      avoid: '기업 소개에 분량을 과도하게 쓰거나 두 기업을 단순 나열식으로 비교하지 않습니다. 주가 예측 단계에서는 성장률과 할인율 가정이 앞선 분석과 연결되는지 반드시 검수합니다.',
    },
    roles: [
      {
        member: '민서',
        role_title: '정량 분석 리드',
        reason: '재무비율 계산과 데이터 정리에 강하므로 핵심 배점인 재무제표 분석과 가치평가 모델을 맡습니다.',
        responsibilities: ['DART 재무제표 수집', '수익성·안정성·성장성 지표 계산', 'DCF 및 상대가치평가 모델 작성'],
      },
      {
        member: '지훈',
        role_title: '전략 분석 리드',
        reason: '자료 조사와 논리 설계 역량을 바탕으로 산업 분석과 투자 논리 연결을 담당합니다.',
        responsibilities: ['PESTLE 분석 요약', 'SWOT 기반 투자 논리 작성', '재무 수치와 정성 분석 연결 문장 작성'],
      },
      {
        member: '서연',
        role_title: '시각화 디렉터',
        reason: '정보 구조화와 PPT 구성에 강하므로 10페이지 제한 안에서 데이터 가독성을 책임집니다.',
        responsibilities: ['PPT 12페이지 구조 설계', '재무 그래프와 표 시각화', '본문 분량 조절'],
      },
      {
        member: '도윤',
        role_title: '검수 및 제출 매니저',
        reason: '세부 검수와 일정 관리에 강하므로 최종 품질과 제출 리스크를 줄입니다.',
        responsibilities: ['참고문헌 양식 통일', '오탈자 및 파일 형식 검수', 'LearnUs 최종 제출'],
      },
    ],
    milestones: [
      {
        phase: 'Phase 1: 기업 선정',
        deadline: '2026.05.12',
        goal: '동일 산업 내 비교 가능한 기업 2개를 선정하고 기초 데이터를 확보한다.',
        status: '완료',
        completedCheckpoints: { 0: true, 1: true, 2: true, 3: true },
        checkpoints: [
          { task: '후보 기업 3곳의 산업 분류와 경쟁 관계 확인', owner: '지훈' },
          { task: '기업 A와 기업 B의 최근 3개년 재무제표 다운로드', owner: '민서' },
          { task: '선정 논리와 PESTLE 요약 초안 작성', owner: '지훈' },
          { task: '자료 출처와 수집일 정리', owner: '도윤' },
        ],
      },
      {
        phase: 'Phase 2: 재무·전략 분석',
        deadline: '2026.05.23',
        goal: '재무비율 비교와 SWOT 분석을 통해 투자 대상 기업을 확정한다.',
        status: '진행 중',
        completedCheckpoints: { 0: true, 1: false, 2: false, 3: false },
        checkpoints: [
          { task: '수익성, 안정성, 성장성 지표 계산', owner: '민서' },
          { task: '두 기업 간 비교 우위 해석 문장 작성', owner: '민서' },
          { task: '기업 A SWOT 분석 작성', owner: '지훈' },
          { task: '재무표와 SWOT을 PPT 그래프로 변환', owner: '서연' },
        ],
      },
      {
        phase: 'Phase 3: 가치평가',
        deadline: '2026.05.31',
        goal: '2026년 12월 말 기준 적정 주가를 산출하고 가정의 근거를 정리한다.',
        status: '예정',
        completedCheckpoints: {},
        checkpoints: [
          { task: 'DCF 매출 성장률과 할인율 가정 설정', owner: '민서' },
          { task: '상대가치평가 PER, PBR 비교표 작성', owner: '민서' },
          { task: '정성 분석 결과와 수치 가정 연결 검수', owner: '지훈' },
          { task: '가치평가 결과 시각화', owner: '서연' },
        ],
      },
      {
        phase: 'Phase 4: 최종 제출',
        deadline: '2026.06.07',
        goal: 'PPT와 PDF를 최종 검수하고 LearnUs에 제출한다.',
        status: '예정',
        completedCheckpoints: {},
        checkpoints: [
          { task: '표지 1장, 본문 10장, 참고문헌 1장 구성 확인', owner: '서연' },
          { task: '오탈자와 참고문헌 양식 검수', owner: '도윤' },
          { task: '발표 스크립트와 예상 질문 준비', owner: '민서' },
          { task: 'PPT와 PDF 최종 제출 및 제출 캡처 공유', owner: '도윤' },
        ],
      },
    ],
    meeting_tasks: [
      { task: '기업 A와 B의 재무비율 계산표 완성', owner: '민서', due: '2026.05.20', reason: '재무제표 분석 배점 확보' },
      { task: 'SWOT과 재무지표 연결 문장 작성', owner: '지훈', due: '2026.05.21', reason: '정량·정성 분석 연결' },
      { task: 'PPT 본문 10페이지 초안 구성', owner: '서연', due: '2026.05.24', reason: '분량 제한 관리' },
    ],
    advice: [
      '재무비율 표만 나열하지 말고 각 지표가 투자 판단에 주는 의미를 한 문장씩 붙이세요.',
      '기업 B는 단순 비교 대상이 아니라 기업 A의 투자 매력을 강조하는 대조군으로 사용하세요.',
      'DCF 가정은 PESTLE과 SWOT에서 나온 성장 요인과 직접 연결하세요.',
    ],
    warnings: [
      '적정 주가 예측의 성장률 가정이 근거 없이 높아지지 않도록 주의하세요.',
      '본문 10페이지 제한을 넘기지 않도록 기업 소개 분량을 줄여야 합니다.',
    ],
  },
  progress: {
    tasks: [],
    minutes: [],
    memberProgress: [
      { label: '민서', progress: 25 },
      { label: '지훈', progress: 25 },
      { label: '서연', progress: 0 },
      { label: '도윤', progress: 0 },
    ],
  },
})
