/**
 * InterviewSidebar — displays real-time interview monitoring statistics.
 * Visible only to interviewers during active calls.
 */

import React from "react";
import type {
  InterviewStats,
  EventLogEntry,
  EventSeverity,
} from "../../../types";

interface InterviewSidebarProps {
  stats: InterviewStats;
}

const InterviewSidebar: React.FC<InterviewSidebarProps> = ({ stats }) => {
  const getSeverityIcon = (severity: EventSeverity) => {
    switch (severity) {
      case "alert":
        return (
          <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
            <svg
              className="w-3 h-3 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        );
      case "warning":
        return (
          <div className="w-5 h-5 rounded-full bg-yellow-500 flex items-center justify-center">
            <svg
              className="w-3 h-3 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        );
      case "normal":
      default:
        return (
          <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
            <svg
              className="w-3 h-3 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        );
    }
  };

  const getEventIcon = (eventType: string) => {
    if (eventType.includes("phone") || eventType.includes("mobile")) {
      return (
        <svg
          className="w-4 h-4 text-red-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
          />
        </svg>
      );
    }
    if (eventType.includes("face") || eventType.includes("looking")) {
      return (
        <svg
          className="w-4 h-4 text-yellow-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
    }
    if (
      eventType.includes("paper") ||
      eventType.includes("note") ||
      eventType.includes("book")
    ) {
      return (
        <svg
          className="w-4 h-4 text-orange-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      );
    }
    if (eventType.includes("electronic")) {
      return (
        <svg
          className="w-4 h-4 text-blue-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      );
    }
    return null;
  };

  return (
    <div className="w-80 bg-gray-900/95 backdrop-blur-xl border-l border-blue-500/30 shadow-2xl flex flex-col h-full overflow-hidden">
      {/* Candidate Information Section */}
      <div className="p-4 border-b border-blue-500/20 bg-gradient-to-r from-blue-900/20 to-transparent">
        <div className="flex items-center gap-3 mb-3">
          {/* Profile Picture Placeholder */}
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-lg flex-shrink-0">
            {stats.candidateName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-white/60 uppercase tracking-wider font-medium">
              Candidate
            </p>
            <p className="text-white font-semibold truncate">
              {stats.candidateName.toUpperCase()}
            </p>
          </div>
        </div>

        <div className="mt-3">
          <p className="text-xs text-white/60 uppercase tracking-wider font-medium mb-2">
            Engagement Level
          </p>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-300"
                style={{ width: `${stats.engagementLevel}%` }}
              />
            </div>
            <span className="text-white font-semibold text-sm whitespace-nowrap">
              {stats.engagementLevel}%
            </span>
          </div>
        </div>
      </div>

      {/* Real-Time Event Log Section */}
      <div className="flex-1 flex flex-col min-h-0 border-b border-blue-500/20">
        <div className="p-4 border-b border-blue-500/20 bg-gradient-to-r from-blue-900/20 to-transparent">
          <h3 className="text-xs text-white/90 uppercase tracking-wider font-semibold text-center">
            Real-Time Event Log
          </h3>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {stats.eventLog.length === 0 ? (
            <div className="text-center text-white/40 text-sm py-8">
              No events detected yet
            </div>
          ) : (
            stats.eventLog.map((event: EventLogEntry) => (
              <div
                key={event.id}
                className="flex items-start gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              >
                <div className="flex-shrink-0 mt-0.5">
                  {getSeverityIcon(event.severity)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-white/70 font-mono">
                      {event.timestamp}
                    </span>
                    {event.severity === "alert" && (
                      <span className="text-xs text-red-400 font-semibold uppercase">
                        Alert
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-white/90">{event.description}</p>
                  {event.screenshotUrl && (
                    <div className="mt-2 rounded-md overflow-hidden border border-white/10 group-hover:border-white/20 transition-colors">
                      <img
                        src={event.screenshotUrl}
                        alt="Event evidence"
                        className="w-full h-auto object-cover max-h-32"
                        loading="lazy"
                      />
                    </div>
                  )}
                </div>
                <div className="flex-shrink-0">
                  {getEventIcon(event.eventType)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Item Detection Section */}
      <div className="p-4 bg-gradient-to-r from-blue-900/20 to-transparent">
        <h3 className="text-xs text-white/90 uppercase tracking-wider font-semibold text-center mb-4">
          Item Detection
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {/* Mobile Phone */}
          <div className="flex flex-col items-center p-3 rounded-lg bg-white/5 border border-white/10">
            <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center mb-2">
              <svg
                className="w-5 h-5 text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
            </div>
            <p className="text-xs text-white/70 text-center mb-1">
              Mobile Phone
            </p>
            <p className="text-sm text-white font-semibold">
              ({stats.itemDetection.mobilePhone})
            </p>
          </div>

          {/* Notes/Books */}
          <div className="flex flex-col items-center p-3 rounded-lg bg-white/5 border border-white/10">
            <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center mb-2">
              <svg
                className="w-5 h-5 text-yellow-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>
            <p className="text-xs text-white/70 text-center mb-1">
              Notes/Books
            </p>
            <p className="text-sm text-white font-semibold">
              ({stats.itemDetection.notesBooks})
            </p>
          </div>

          {/* Extra Electronics */}
          <div className="flex flex-col items-center p-3 rounded-lg bg-white/5 border border-white/10">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center mb-2">
              <svg
                className="w-5 h-5 text-green-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <p className="text-xs text-white/70 text-center mb-1">
              Extra Electronics
            </p>
            <p className="text-sm text-white font-semibold">
              ({stats.itemDetection.extraElectronics})
            </p>
          </div>

          {/* Smartwatch */}
          <div className="flex flex-col items-center p-3 rounded-lg bg-white/5 border border-white/10">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center mb-2">
              <svg
                className="w-5 h-5 text-green-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <p className="text-xs text-white/70 text-center mb-1">Smartwatch</p>
            <p className="text-sm text-white font-semibold">
              ({stats.itemDetection.smartwatch})
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewSidebar;
