import { createClient } from '@/lib/supabase/server'
import { RoadmapBoard } from '@/components/roadmap/roadmap-board'
import type { RoadmapRow } from '@/types/roadmap'
import type { NowNextLater } from '@/types/database'

const LANES: NowNextLater[] = ['now', 'next', 'later']

export default async function RoadmapPage() {
  const supabase = await createClient()

  const [
    { data: objectives },
    { data: joins },
    { data: allHypotheses },
  ] = await Promise.all([
    supabase
      .from('objectives')
      .select('*')
      .eq('status', 'active')
      .order('position'),
    supabase
      .from('objective_hypotheses')
      .select(`
        id,
        objective_id,
        hypothesis_id,
        now_next_later,
        position,
        hypothesis:hypotheses (
          *,
          owner:profiles!hypotheses_owner_id_fkey (id, full_name, role)
        )
      `)
      .order('position'),
    supabase
      .from('hypotheses')
      .select('*')
      .order('created_at', { ascending: false }),
  ])

  // Assemble rows: one per objective, hypotheses bucketed into lanes
  const rows: RoadmapRow[] = (objectives ?? []).map((objective) => {
    const objectiveJoins = (joins ?? []).filter((j) => j.objective_id === objective.id)

    const lanes = LANES.reduce((acc, lane) => {
      acc[lane] = objectiveJoins
        .filter((j) => j.now_next_later === lane)
        .sort((a, b) => a.position - b.position)
        .map((j) => ({
          join_id: j.id,
          objective_id: j.objective_id,
          now_next_later: j.now_next_later as NowNextLater,
          position: j.position,
          hypothesis: j.hypothesis as RoadmapRow['lanes']['now'][number]['hypothesis'],
        }))
      return acc
    }, {} as RoadmapRow['lanes'])

    return { objective, lanes }
  })

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-[20px] font-semibold tracking-[-0.03em] text-text-primary leading-none">
            Roadmap
          </h1>
          <p className="text-[13px] text-text-3 mt-1">
            {objectives?.length ?? 0} active objective{objectives?.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Board */}
      <RoadmapBoard rows={rows} allHypotheses={allHypotheses ?? []} />
    </div>
  )
}

