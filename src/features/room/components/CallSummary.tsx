import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { reportService } from "../../../services/report.service";
import type { Room, InterviewStats, EventLogEntry } from "../../../types";
import { FileText, Home, CheckCircle2 } from "lucide-react";

interface CallSummaryProps {
  room: Room;
  stats: InterviewStats;
}

export const CallSummary: React.FC<CallSummaryProps> = ({ room, stats }) => {
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    try {
      await reportService.generateInterviewReport(room, stats);
    } catch (error) {
      console.error("Failed to generate report:", error);
      alert("Failed to generate report. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center bg-gray-900/50 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl max-w-2xl mx-auto my-12 animate-in fade-in zoom-in duration-500">
      <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-6">
        <CheckCircle2 className="w-10 h-10 text-green-500" />
      </div>

      <h2 className="text-3xl font-bold text-white mb-2">
        Interview Session Ended
      </h2>
      <p className="text-gray-400 mb-8">
        The session has been successfully completed and all logs have been
        saved.
      </p>

      <div className="grid grid-cols-2 gap-4 w-full mb-8">
        <div className="p-4 bg-white/5 rounded-xl border border-white/5 text-left">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
            Duration
          </p>
          <p className="text-xl font-semibold text-white">
            {room.duration || 0}s
          </p>
        </div>
        <div className="p-4 bg-white/5 rounded-xl border border-white/5 text-left">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
            Engagement
          </p>
          <p className="text-xl font-semibold text-white">
            {stats.engagementLevel}%
          </p>
        </div>
        <div className="p-4 bg-white/5 rounded-xl border border-white/5 text-left">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
            Total Events
          </p>
          <p className="text-xl font-semibold text-white">
            {stats.eventLog.length}
          </p>
        </div>
        <div className="p-4 bg-white/5 rounded-xl border border-white/5 text-left">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
            Security Alerts
          </p>
          <p className="text-xl font-semibold text-red-400">
            {
              stats.eventLog.filter(
                (e: EventLogEntry) => e.severity === "alert",
              ).length
            }
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 w-full">
        <button
          onClick={handleGenerateReport}
          disabled={isGenerating}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white rounded-xl font-medium transition-all transform hover:scale-[1.02] active:scale-[0.98]"
        >
          {isGenerating ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <FileText className="w-5 h-5" />
          )}
          {isGenerating ? "Generating..." : "Generate Report"}
        </button>

        <button
          onClick={() => navigate("/lobby")}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-white/5 hover:bg-white/10 text-white rounded-xl font-medium transition-all border border-white/10"
        >
          <Home className="w-5 h-5" />
          Back to Lobby
        </button>
      </div>
    </div>
  );
};
