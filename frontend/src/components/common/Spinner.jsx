import { Loader2 } from "lucide-react";

export default function Spinner({ label = "Loading" }) {
  return <Loader2 size={14} className="animate-spin" role="status" aria-label={label} />;
}
