import Studio from "./studio";
import { liveReady } from "../lib/config";
export const dynamic = "force-dynamic";
export default function Page() {
  return <Studio live={liveReady()} />;
}
