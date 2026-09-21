import { requireUser, db, cloud, apiError } from "../../../lib/server";
import { validateFile, MAX_BYTES } from "../../../lib/media";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request) {
  let uploaded;
  try {
    const userId = await requireUser();
    if (Number(request.headers.get("content-length")) > MAX_BYTES + 100_000)
      return Response.json(
        { error: "Choose a file smaller than 4 MB." },
        { status: 413 },
      );
    const form = await request.formData();
    const file = form.get("file");
    const kind = form.get("kind");
    const problem = validateFile(file, kind);
    if (problem) return Response.json({ error: problem }, { status: 400 });
    const count =
      await db()`SELECT count(*)::int AS count FROM media WHERE user_id=${userId} AND created_at > NOW() - INTERVAL '1 day'`;
    if (count[0].count >= 25)
      return Response.json(
        {
          error:
            "Daily starter limit reached (25 uploads). Try again tomorrow.",
        },
        { status: 429 },
      );
    const buffer = Buffer.from(await file.arrayBuffer());
    uploaded = await new Promise((resolve, reject) => {
      cloud()
        .uploader.upload_stream(
          {
            resource_type: kind,
            folder: "morfynx",
            ...(kind === "video"
              ? { transformation: [{ quality: "auto", fetch_format: "mp4" }] }
              : {}),
          },
          (error, result) => (error ? reject(error) : resolve(result)),
        )
        .end(buffer);
    });
    const id = crypto.randomUUID();
    const title = file.name.slice(0, 150);
    const rows =
      await db()`INSERT INTO media (id,user_id,title,kind,public_id,url,original_bytes,output_bytes) VALUES (${id},${userId},${title},${kind},${uploaded.public_id},${uploaded.secure_url},${file.size},${uploaded.bytes}) RETURNING id,title,kind,public_id,url,original_bytes,output_bytes,created_at`;
    return Response.json(rows[0]);
  } catch (error) {
    if (uploaded) {
      try {
        await cloud().uploader.destroy(uploaded.public_id, {
          resource_type: uploaded.resource_type,
        });
      } catch {
        console.error("Upload cleanup failed");
      }
    }
    return apiError(error);
  }
}
