-- Create a new enum type with the desired values
CREATE TYPE "ConversationStatus_new" AS ENUM ('OPEN', 'MISSING_FIELDS', 'QUOTED', 'PENDING_HUMAN', 'CLOSED');

-- Drop the default constraint first
ALTER TABLE "Conversation" ALTER COLUMN status DROP DEFAULT;

-- Migrate existing data: OPEN stays as OPEN, everything else becomes PENDING_HUMAN
ALTER TABLE "Conversation" ALTER COLUMN status TYPE "ConversationStatus_new" USING (
  CASE 
    WHEN status::text = 'OPEN' THEN 'OPEN'::text
    ELSE 'PENDING_HUMAN'::text
  END::"ConversationStatus_new"
);

-- Set the default back
ALTER TABLE "Conversation" ALTER COLUMN status SET DEFAULT 'OPEN'::"ConversationStatus_new";

-- Drop the old enum type
DROP TYPE "ConversationStatus";

-- Rename the new enum type to the original name
ALTER TYPE "ConversationStatus_new" RENAME TO "ConversationStatus";
