import { Bell, Settings } from "lucide-react";

export default function Topbar() {
  return (
    <div className="flex justify-between items-center mb-8">
      <span className="text-green-400 font-semibold">● Live</span>

      <div className="flex items-center gap-4">
        <Bell />
        <Settings />

        <div className="bg-purple-700 w-9 h-9 rounded-full flex items-center justify-center">
          S
        </div>
      </div>
    </div>
  );
}