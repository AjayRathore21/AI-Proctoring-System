import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { Room, InterviewStats, EventLogEntry } from "../types";

// Extend jsPDF with autotable types
interface jsPDFWithAutoTable extends jsPDF {
  lastAutoTable: { finalY: number };
}

export const reportService = {
  async generateInterviewReport(
    room: Room,
    stats: InterviewStats,
  ): Promise<void> {
    const doc = new jsPDF() as jsPDFWithAutoTable;
    const pageWidth = doc.internal.pageSize.width;

    // --- Header ---
    doc.setFontSize(22);
    doc.setTextColor(40, 44, 52);
    doc.text("Interview Session Report", pageWidth / 2, 20, {
      align: "center",
    });

    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Room ID: ${room.roomId}`, pageWidth / 2, 28, { align: "center" });
    doc.line(20, 35, pageWidth - 20, 35);

    // --- Participant & Session Info ---
    doc.setFontSize(16);
    doc.setTextColor(40, 44, 52);
    doc.text("Session Information", 20, 45);

    doc.setFontSize(10);
    doc.setTextColor(0);
    const sessionInfo = [
      ["Candidate Name:", stats.candidateName],
      ["Status:", room.status.toUpperCase()],
      ["Duration:", `${room.duration || 0} seconds`],
      [
        "Start Time:",
        room.startedAt ? new Date(room.startedAt).toLocaleString() : "N/A",
      ],
      [
        "End Time:",
        room.endedAt ? new Date(room.endedAt).toLocaleString() : "N/A",
      ],
      ["Recording:", room.recordingUrl ? "Available" : "Not Available"],
    ];

    autoTable(doc, {
      startY: 50,
      head: [],
      body: sessionInfo,
      theme: "plain",
      styles: { cellPadding: 2, fontSize: 10 },
      columnStyles: { 0: { fontStyle: "bold", cellWidth: 40 } },
    });

    let currentY = (doc as jsPDFWithAutoTable).lastAutoTable.finalY + 15;

    // --- Analytics Summary ---
    doc.setFontSize(16);
    doc.setTextColor(40, 44, 52);
    doc.text("Analytics Summary", 20, currentY);
    currentY += 8;

    const analytics = [
      ["Engagement Level:", `${stats.engagementLevel}%`],
      ["Mobile Phone Detections:", stats.itemDetection.mobilePhone.toString()],
      ["Notes/Books Detections:", stats.itemDetection.notesBooks.toString()],
      ["Extra Electronics:", stats.itemDetection.extraElectronics.toString()],
      ["Smartwatch Detections:", stats.itemDetection.smartwatch.toString()],
    ];

    autoTable(doc, {
      startY: currentY,
      head: [["Metric", "Value"]],
      body: analytics,
      theme: "striped",
      headStyles: { fillColor: [63, 81, 181] },
    });

    currentY = (doc as jsPDFWithAutoTable).lastAutoTable.finalY + 15;

    // --- Network Statistics ---
    if (stats.networkStats) {
      doc.setFontSize(16);
      doc.setTextColor(40, 44, 52);
      doc.text("Network Statistics", 20, currentY);
      currentY += 8;

      const networkData = [
        ["Packet Loss:", stats.networkStats.packetsLost.toString()],
        ["Jitter:", `${stats.networkStats.jitter}s`],
        ["Round Trip Time:", `${stats.networkStats.roundTripTime}s`],
        ["Estimated Bitrate:", `${stats.networkStats.bitrateKbps} Kbps`],
      ];

      autoTable(doc, {
        startY: currentY,
        head: [["Metric", "Value"]],
        body: networkData,
        theme: "striped",
        headStyles: { fillColor: [76, 175, 80] },
      });

      currentY = (doc as jsPDFWithAutoTable).lastAutoTable.finalY + 15;
    }

    // --- Event Log Timeline ---
    doc.setFontSize(16);
    doc.setTextColor(40, 44, 52);
    doc.text("Event Log Timeline", 20, currentY);
    currentY += 8;

    const eventRows = stats.eventLog.map((event: EventLogEntry) => [
      event.timestamp,
      event.eventType.replace(/_/g, " ").toUpperCase(),
      event.severity.toUpperCase(),
      event.description,
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [["Time", "Type", "Severity", "Description"]],
      body: eventRows,
      theme: "grid",
      headStyles: { fillColor: [244, 67, 54] },
      columnStyles: {
        2: { fontStyle: "bold" },
        3: { cellWidth: "auto" },
      },
      didParseCell: (data: any) => {
        if (data.section === "body" && data.column.index === 2) {
          const val = data.cell.raw as string;
          if (val === "ALERT") data.cell.styles.textColor = [255, 0, 0];
          if (val === "WARNING") data.cell.styles.textColor = [255, 152, 0];
        }
      },
    });

    // --- Screenshots Section ---
    const eventsWithScreenshots = stats.eventLog.filter((e) => e.screenshotUrl);

    if (eventsWithScreenshots.length > 0) {
      doc.addPage();
      doc.setFontSize(16);
      doc.text("Captured Screenshots", 20, 20);

      let imgY = 30;
      for (const event of eventsWithScreenshots) {
        if (imgY > 230) {
          doc.addPage();
          imgY = 20;
        }

        doc.setFontSize(10);
        doc.text(`${event.timestamp} - ${event.description}`, 20, imgY);
        imgY += 5;

        try {
          // Note: jspdf's addImage requires the image to be loaded.
          // In a real browser environment, we'd need to ensure the image is loaded.
          // For now, we'll use the URL directly, but jspdf usually expects base64 or HTMLImageElement.
          // A safer way is to fetch the image and convert to base64.

          const imgBase64 = await this.getBase64Image(event.screenshotUrl!);
          doc.addImage(imgBase64, "JPEG", 20, imgY, 120, 90);
          imgY += 100;
        } catch {
          doc.setTextColor(200, 0, 0);
          doc.text("[Could not load screenshot]", 30, imgY + 10);
          doc.setTextColor(0);
          imgY += 20;
        }
      }
    }

    // --- Footer ---
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `Generated by AI Proctoring System - Page ${i} of ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.height - 10,
        { align: "center" },
      );
    }

    doc.save(
      `Interview_Report_${stats.candidateName}_${room.roomId.substring(0, 8)}.pdf`,
    );
  },

  async getBase64Image(url: string): Promise<string> {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  },
};
