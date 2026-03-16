import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { AgentInterpretRequest, AgentInterpretResponse, AgentAction } from '@/types/agent'

export async function POST(request: NextRequest) {
  // Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const body: AgentInterpretRequest = await request.json()
  const { prompt } = body

  if (!prompt?.trim()) {
    return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
  }

  // Fetch context Claude needs to resolve references
  const [
    { data: hypotheses },
    { data: objectives },
    { data: rawSolutions },
  ] = await Promise.all([
    supabase
      .from('hypotheses')
      .select('id, title, stage, confidence')
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('objectives')
      .select('id, title')
      .eq('status', 'active'),
    supabase
      .from('hypothesis_solutions')
      .select('hypothesis_id, solutions(id, title, stage)')
      .limit(100),
  ])

  // Flatten solutions with their parent hypothesis_id
  const solutions = (rawSolutions ?? []).map((row: {
    hypothesis_id: string
    solutions: { id: string; title: string; stage: string } | null
  }) => ({
    solution_id: row.solutions?.id,
    solution_title: row.solutions?.title,
    solution_stage: row.solutions?.stage,
    hypothesis_id: row.hypothesis_id,
  })).filter((s) => s.solution_id)

  const systemPrompt = `You are an AI assistant for a product discovery OS used by product trios.
Your job is to interpret a natural language prompt from the user and return a single structured action as JSON.

You can perform these five actions:
1. create_hypothesis — create a new opportunity/hypothesis
2. move_stage — move a hypothesis to a different stage
3. log_activity — log a testing activity directly against a hypothesis (old-style, no solution)
4. create_solution — add a solution under an existing opportunity/hypothesis
5. create_test — add an assumption test under an existing solution

Hypothesis stages are exactly: captured, assumption_testing, solution_exploration, validated, invalidated, parked
Confidence levels are exactly: low, medium, high
Activity types are exactly: interview, survey, observation, data_analysis, prototype_test, feasibility_check, other
Activity statuses are exactly: planned, in_progress, done

Here are the current hypotheses/opportunities in the system:
${JSON.stringify(hypotheses ?? [], null, 2)}

Here are the current solutions (each includes the hypothesis_id it belongs to):
${JSON.stringify(solutions, null, 2)}

Here are the current active objectives:
${JSON.stringify(objectives ?? [], null, 2)}

Return ONLY a valid JSON object with this exact shape — no markdown, no explanation, just JSON:
{
  "action": {
    "type": "create_hypothesis" | "move_stage" | "log_activity" | "create_solution" | "create_test" | "unknown",
    "payload": { ... }
  },
  "explanation": "One sentence describing what you understood"
}

For create_hypothesis payload:
{ "title": string, "statement"?: string, "stage": Stage, "confidence": Confidence, "objective_id"?: string, "objective_title"?: string }

For move_stage payload:
{ "hypothesis_id": string, "hypothesis_title": string, "from_stage": Stage, "to_stage": Stage, "evidence_note"?: string }

For log_activity payload:
{ "hypothesis_id": string, "hypothesis_title": string, "activity_type": ActivityType, "description"?: string, "learning"?: string, "status": ActivityStatus }

For create_solution payload:
{ "title": string, "hypothesis_id": string, "hypothesis_title": string }

For create_test payload:
{ "description": string, "solution_id": string, "solution_title": string, "hypothesis_id": string, "hypothesis_title": string, "activity_type"?: ActivityType }

For unknown payload:
{ "reason": string }

When the user says "add a solution to [opportunity]" or similar, use create_solution.
When the user says "add a test to [solution]" or "add an assumption test under [solution]", use create_test.
If you cannot confidently map the prompt to one of the five actions, return type "unknown" with a clear reason.`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('Anthropic API error:', err)
      return NextResponse.json({ error: 'Claude API error' }, { status: 502 })
    }

    const data = await response.json()
    const raw = data.content?.[0]?.text ?? ''

    // Strip any accidental markdown fences
    const cleaned = raw.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(cleaned) as AgentInterpretResponse

    // Validate shape
    if (!parsed.action?.type || !parsed.explanation) {
      throw new Error('Invalid response shape from Claude')
    }

    return NextResponse.json(parsed)
  } catch (err) {
    console.error('Agent interpret error:', err)
    const fallback: AgentInterpretResponse = {
      action: { type: 'unknown', payload: { reason: 'Failed to interpret prompt' } },
      explanation: 'Something went wrong parsing your request.',
    }
    return NextResponse.json(fallback)
  }
}
