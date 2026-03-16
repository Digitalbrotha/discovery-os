-- Add solution_id to testing_activities to support Opportunity Solution Tree view
-- Tests can now be linked directly to a solution (in addition to their parent hypothesis)
ALTER TABLE testing_activities
  ADD COLUMN IF NOT EXISTS solution_id uuid REFERENCES solutions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS testing_activities_solution_id_idx ON testing_activities(solution_id);
