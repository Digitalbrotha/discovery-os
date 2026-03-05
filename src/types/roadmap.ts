import type { NowNextLater, Hypothesis, Objective } from './database'

// A hypothesis card as it appears on the roadmap —
// includes the join metadata (lane, position) alongside the hypothesis data
export interface RoadmapHypothesisCard {
  join_id: string
  objective_id: string
  now_next_later: NowNextLater
  position: number
  hypothesis: Hypothesis & {
    owner: { id: string; full_name: string | null; role: string | null } | null
  }
}

// One objective row with its hypotheses bucketed into lanes
export interface RoadmapRow {
  objective: Objective
  lanes: Record<NowNextLater, RoadmapHypothesisCard[]>
}
