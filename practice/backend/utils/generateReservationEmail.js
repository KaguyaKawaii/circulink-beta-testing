export default function generateReservationEmail({
  status,
  toName,
  reservation,
  formattedDate,
  time,
  participants,
  isParticipant = false
}) {
  const getStatusColor = (status) => {
    switch (status) {
      case "Approved": return "#28a745"; // Green
      case "Rejected": return "#CC0000"; // Red
      case "Cancelled": return "#6c757d"; // Gray
      case "Ongoing": return "#007bff"; // Blue
      default: return "#333333"; // Neutral
    }
  };

  const headerColor = getStatusColor(status);
  const participantsList = participants.map(
    (p) => `<li style="margin-bottom: 4px;">${p.name}</li>`
  ).join("");

  let footerMessage = "";
  if (status === "Approved" || status === "Ongoing") {
    footerMessage = `
      <div style="margin-top: 20px; padding: 15px; background: #fff8e1; border-left: 4px solid #ffc107; border-radius: 6px;">
        <p style="margin: 0; font-size: 15px; color: #5d4037;">
          <strong>Reminder:</strong> Please arrive at least <strong>15 minutes early</strong>.
          If no one arrives within <strong>15 minutes after the start time</strong>,
          the reservation may be <strong style="color: #d32f2f;">automatically cancelled</strong>.
        </p>
      </div>
    `;
  } else if (status === "Rejected") {
    footerMessage = `
      <div style="margin-top: 20px; padding: 15px; background: #ffebee; border-left: 4px solid #d32f2f; border-radius: 6px;">
        <p style="margin: 0; font-size: 15px; color: #b71c1c;">
          Your reservation request has been <strong>rejected</strong>. Please contact the admin for details.
        </p>
      </div>
    `;
  } else if (status === "Cancelled") {
    footerMessage = `
      <div style="margin-top: 20px; padding: 15px; background: #eceff1; border-left: 4px solid #546e7a; border-radius: 6px;">
        <p style="margin: 0; font-size: 15px; color: #37474f;">
          Your reservation has been <strong>cancelled</strong>. You may submit a new request if needed.
        </p>
      </div>
    `;
  }

  const introMessage = isParticipant
    ? `You have been added as a <strong>participant</strong> for <strong>${reservation.roomName}</strong> at <strong>${reservation.location}</strong>.`
    : `Your reservation for <strong>${reservation.roomName}</strong> at <strong>${reservation.location}</strong> is <strong style="color: ${headerColor};">${status}</strong>.`;

  return `
  <div style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #f4f4f4; padding: 30px;">
    <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
      
      <!-- HEADER -->
      <div style="background: ${headerColor}; color: #ffffff; text-align: center; padding: 25px 20px;">
        <h2 style="margin: 0; font-size: 22px; letter-spacing: 0.5px;">Reservation ${status}</h2>
      </div>

      <!-- BODY -->
      <div style="padding: 30px;">
        <p style="font-size: 16px; color: #333; margin: 0 0 10px;">Hi <strong>${toName}</strong>,</p>
        <p style="font-size: 15px; color: #555; margin: 0 0 20px;">${introMessage}</p>

        <!-- DETAILS TABLE -->
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
          <tr><td style="padding: 6px 0; color: #555;"><strong>Date:</strong></td><td>${formattedDate}</td></tr>
          <tr><td style="padding: 6px 0; color: #555;"><strong>Time:</strong></td><td>${time}</td></tr>
          <tr><td style="padding: 6px 0; color: #555;"><strong>Location:</strong></td><td>${reservation.location}</td></tr>
          <tr><td style="padding: 6px 0; color: #555;"><strong>Room:</strong></td><td>${reservation.roomName}</td></tr>
          <tr><td style="padding: 6px 0; color: #555;"><strong>Purpose:</strong></td><td>${reservation.purpose}</td></tr>
        </table>

        <!-- PARTICIPANTS -->
        ${participants.length > 0 ? `
          <div style="margin-top: 20px;">
            <h4 style="margin-bottom: 8px; font-size: 16px; color: #333;">Participants:</h4>
            <ul style="margin: 0; padding-left: 20px; color: #555; font-size: 14px;">
              ${participantsList}
            </ul>
          </div>` : ""}

        <!-- FOOTER MESSAGE -->
        ${footerMessage}

        <p style="margin-top: 30px; font-size: 13px; color: #999; text-align: center;">
          This is an automated message from the <strong>Room Reservation System</strong>.<br>
          Please do not reply to this email.
        </p>
      </div>
    </div>
  </div>
  `;
}