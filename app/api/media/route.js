import { requireUser, db, apiError } from "../../../lib/server";
export async function GET() {
  try {
    const userId = await requireUser();
    const rows =
      await db()`SELECT id,title,kind,public_id,url,original_bytes,output_bytes,created_at FROM media WHERE user_id=${userId} ORDER BY created_at DESC LIMIT 50`;
    return Response.json(rows);
  } catch (error) {
    return apiError(error);
  }
}
