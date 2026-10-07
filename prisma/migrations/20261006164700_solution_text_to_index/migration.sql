-- Convert the stored answer text to its zero-based position in options.
ALTER TABLE "Question" ADD COLUMN "solution_index" INTEGER;

UPDATE "Question" AS question
SET "solution_index" = (
    SELECT (option.ordinality - 1)::INTEGER
    FROM jsonb_array_elements_text(question."options")
         WITH ORDINALITY AS option(value, ordinality)
    WHERE option.value = question."solution"
    LIMIT 1
);

DO $migration$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "Question"
        WHERE "solution_index" IS NULL
    ) THEN
        RAISE EXCEPTION 'Cannot convert Question.solution: its text does not match an option';
    END IF;
END;
$migration$;

ALTER TABLE "Question" ALTER COLUMN "solution_index" SET NOT NULL;
ALTER TABLE "Question" DROP COLUMN "solution";
ALTER TABLE "Question" RENAME COLUMN "solution_index" TO "solution";
