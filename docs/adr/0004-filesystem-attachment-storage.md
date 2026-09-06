# Attachment bytes live on the filesystem under generated keys

Attachments are stored as files under `server/uploads/`, named by a generated
UUID, with all metadata — original filename, MIME type, size, uploader,
timestamps, removal fields — in Postgres. The alternatives were a `bytea`
column, which turns every backup and query plan into a blob problem and streams
badly, and object storage, which would mean adding MinIO or S3 to a
`compose.yaml` that deliberately runs Postgres alone.

The generated key is the load-bearing part, not an implementation detail. The
uploader's filename is data, never a path: it is stored in a column, echoed back
in `Content-Disposition`, and never touches the filesystem — which ends
path traversal (`../../etc/passwd`) and collision handling in one move.

Uploads are additionally validated by magic bytes, not by the client's declared
`Content-Type` or the extension, both of which the client controls. A file
claiming `image/png` must actually begin `89 50 4E 47`.

## Consequences

The uploads directory is git-ignored and not part of any backup the repo
defines, so a cloned checkout has metadata rows pointing at files that do not
exist — the download route must treat a missing file as a 404, not a crash.
A real deployment across more than one server node needs this revisited; nothing
before Lab 5 does.
