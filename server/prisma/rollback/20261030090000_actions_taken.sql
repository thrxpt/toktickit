-- Recovery only: export Actions Taken first; this removes their work log data.
-- Restore the matching application revision before serving traffic.
DROP TABLE "ActionTaken";
