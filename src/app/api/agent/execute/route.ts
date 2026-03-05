import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createHypothesis, moveHypothesisStage, logTestingActivity } from '@/actions/hypotheses'
import type { AgentExecuteRequest, AgentExecuteResponse } from '@/types/agent'

export async function POST(request: NextRequest) {
  // Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const body: AgentExecuteRequest = await request.json()
  const { action } = body

  if (!action?.type) {
    return NextResponse.json({ error: 'Action is required' }, { status: 400 })
  }

  try {
    let message = ''

    switch (action.type) {
      case 'create_hypothesis': {
        const { title, statement, stage, confidence, objective_id } = action.payload
        await createHypothesis({
          title,
          statement,
          stage,
          confidence,
          objective_id,
          created_by_agent: true,
        })
        message = `Created hypothesis: "${title}"`
        break
      }

      case 'move_stage': {
        const { hypothesis_id, to_stage, evidence_note, hypothesis_title } = action.payload
        await moveHypothesisStage({
          hypothesis_id,
          to_stage,
          evidence_note,
          changed_by_agent: true,
        })
        message = `Moved "${hypothesis_title}" to ${to_stage.replace('_', ' ')}`
        break
      }

      case 'log_activity': {
        const {
          hypothesis_id,
          activity_type,
          description,
          learning,
          status,
          hypothesis_title,
        } = action.payload
        await logTestingActivity({
          hypothesis_id,
          activity_type,
          description,
          learning,
          status,
          created_by_agent: true,
        })
        message = `Logged ${activity_type.replace('_', ' ')} activity on "${hypothesis_title}"`
        break
      }

      case 'unknown': {
        return NextResponse.json<AgentExecuteResponse>({
          success: false,
          message: action.payload.reason,
        })
      }

      default: {
        return NextResponse.json({ error: 'Unknown action type' }, { status: 400 })
      }
    }

    const response: AgentExecuteResponse = { success: true, message }
    return NextResponse.json(response)
  } catch (err) {
    console.error('Agent execute error:', err)
    return NextResponse.json<AgentExecuteResponse>({
      success: false,
      message: err instanceof Error ? err.message : 'Action failed',
    }, { status: 500 })
  }
}
