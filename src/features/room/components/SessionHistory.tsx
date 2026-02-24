import React from "react";
import {
  useDashboard,
  type DashboardSession,
} from "../../../hooks/useDashboard";
import { reportService } from "../../../services/report.service";
import {
  Calendar,
  Clock,
  Activity,
  AlertTriangle,
  Download,
  User,
  ExternalLink,
  ChevronRight,
  LayoutDashboard,
} from "lucide-react";

export const SessionHistory: React.FC = () => {
  const { sessions, isLoading, error } = useDashboard();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-24 w-full bg-white/5 animate-pulse rounded-2xl"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
        {error}
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/5">
        <p className="text-white/40 italic">No interview history found.</p>
      </div>
    );
  }

  const handleDownloadReport = async (session: DashboardSession) => {
    if (session.stats) {
      await reportService.generateInterviewReport(session.room, session.stats);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <LayoutDashboard className="w-5 h-5 text-blue-400" />
        Interview History
      </h2>
      <div className="grid gap-4">
        {sessions.map((session) => (
          <div
            key={session.room.roomId}
            className="group relative bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-5 transition-all duration-300"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Left Side: Basic Info */}
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-600/20 p-2 rounded-lg">
                    <User className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-medium">
                      {session.stats?.candidateName || "Unknown Candidate"}
                    </h3>
                    <p className="text-xs text-white/40 font-mono">
                      {session.room.roomId.substring(0, 8)}...
                    </p>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                      session.room.status === "ended"
                        ? "bg-green-500/20 text-green-400"
                        : "bg-blue-500/20 text-blue-400"
                    }`}
                  >
                    {session.room.status}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-sm text-white/50">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {session.room.endedAt
                      ? new Date(session.room.endedAt).toLocaleDateString()
                      : "Active"}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {session.room.duration || 0}s
                  </div>
                </div>
              </div>

              {/* Right Side: Stats & Actions */}
              <div className="flex items-center gap-4">
                {session.stats && (
                  <div className="flex items-center gap-6 pr-6 border-r border-white/10">
                    <div className="text-center">
                      <p className="text-[10px] text-white/30 uppercase font-bold mb-0.5">
                        Engagement
                      </p>
                      <div className="flex items-center gap-1 justify-center">
                        <Activity
                          className={`w-3 h-3 ${session.stats.engagementLevel > 70 ? "text-green-400" : "text-yellow-400"}`}
                        />
                        <span className="text-white font-semibold">
                          {session.stats.engagementLevel}%
                        </span>
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-white/30 uppercase font-bold mb-0.5">
                        Alerts
                      </p>
                      <div className="flex items-center gap-1 justify-center">
                        <AlertTriangle
                          className={`w-3 h-3 ${session.stats.eventLog.filter((e) => e.severity === "alert").length > 0 ? "text-red-400" : "text-white/20"}`}
                        />
                        <span className="text-white font-semibold">
                          {
                            session.stats.eventLog.filter(
                              (e) => e.severity === "alert",
                            ).length
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  {session.stats && (
                    <button
                      onClick={() => handleDownloadReport(session)}
                      className="p-3 bg-white/5 hover:bg-blue-600/20 text-white/70 hover:text-blue-400 rounded-xl border border-white/5 hover:border-blue-500/30 transition-all"
                      title="Download PDF Report"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                  )}
                  {session.room.recordingUrl && (
                    <a
                      href={session.room.recordingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 bg-white/5 hover:bg-green-600/20 text-white/70 hover:text-green-400 rounded-xl border border-white/5 hover:border-green-500/30 transition-all"
                      title="View Recording"
                    >
                      <ExternalLink className="w-5 h-5" />
                    </a>
                  )}
                  <button className="p-3 bg-white/5 text-white/20 group-hover:text-white/60 rounded-xl border border-white/5 transition-all">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
