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
  ])

  const systemPrompt = `You are an AI assistant for a product discovery OS used by product trios.
Your job is to interpret a natural language prompt from the user and return a single structured action as JSON.

You can only perform these three actions:
1. create_hypothesis — create a new hypothesis
2. move_stage — move a hypothesis to a different stage
3. log_activity — log a testing activity against a hypothesis

Hypothesis stages are exactly: captured, assumption_testing, solution_exploration, validated, invalidated, parked
Confidence levels are exactly: low, medium, high
Activity types are exactly: interview, survey, observation, data_analysis, prototype_test, feasibility_check, other
Activity statuses are exactly: planned, in_progress, done

Here are the current hypotheses in the system (use these to resolve references):
${JSON.stringify(hypotheses ?? [], null, 2)}

Here are the current active objectives (use these to resolve references):
${JSON.stringify(objectives ?? [], null, 2)}

Return ONLY a valid JSON object with this exact shape — no markdown, no explanation, just JSON:
{
  "action": {
    "type": "create_hypothesis" | "move_stage" | "log_activity" | "unknown",
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

For unknown payload:
{ "reason": string }

If you cannot confidently map the prompt to one of the three actions, or cannot find the hypothesis being referenced, return type "unknown" with a clear reason.`

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
