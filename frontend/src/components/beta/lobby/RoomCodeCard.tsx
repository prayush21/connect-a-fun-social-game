import { QRCodeSVG } from "qrcode.react";
import { Copy } from "lucide-react";
import { BaseCard } from "@/components/beta/cards/BaseCard";

interface RoomCodeCardProps {
  roomCode: string;
  joinUrl: string;
  onCopy: () => void;
  copied: boolean;
}

export function RoomCodeCard({
  roomCode,
  joinUrl,
  onCopy,
  copied,
}: RoomCodeCardProps) {
  return (
    <BaseCard className="flex flex-col items-center gap-6 !py-8 text-center">
      <div className="space-y-2">
        <h2 className="font-mono text-5xl font-bold tracking-widest">
          {roomCode}
        </h2>
      </div>

      <button
        onClick={onCopy}
        className="flex items-center gap-2 rounded-full border-2 border-black bg-white px-6 py-3 font-medium shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-none"
      >
        <Copy className="h-4 w-4" />
        <span>{copied ? "Copied!" : "Copy Invite Link"}</span>
      </button>

      <div className="mt-2">
        <QRCodeSVG value={joinUrl} size={200} />
      </div>
    </BaseCard>
  );
}
