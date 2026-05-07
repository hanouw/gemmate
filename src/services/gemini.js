import { limitText } from '../utils/project.js'

const GEMINI_API_KEY = import.meta.env.GAK
const GEMINI_MODEL = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash-lite'

export const hasGeminiApiKey = Boolean(GEMINI_API_KEY)

export async function callGemini(project, profile) {
  const prompt = buildDistributionPrompt(project, profile)

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
