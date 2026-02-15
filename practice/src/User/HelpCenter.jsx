import React from "react";
import { ArrowLeft } from "lucide-react";

export default function HelpCenter({ setView }) {
  return (
    <main className="ml-0 lg:ml-[250px] w-full lg:w-[calc(100%-250px)] min-h-screen flex flex-col bg-white">
      {/* HEADER */}
      <header className="text-black px-4 sm:px-6 h-[60px] flex items-center justify-between shadow-sm border-b border-gray-200">
        <h1 className="text-xl md:text-2xl font-bold tracking-wide">
          Help Center
        </h1>
      </header>

      {/* CONTENT */}
      <div className="p-4 sm:p-6 flex-1 overflow-y-auto">
        <div className="space-y-4 max-w-4xl mx-auto w-full">
          {/* Section 1 */}
          <details className="border border-red-200 shadow-sm rounded-lg p-4 bg-white  transition-colors">
            <summary className="font-semibold cursor-pointer text-gray-800 text-base sm:text-lg">
              Getting Started
            </summary>
            <div className="border-b border-gray-200 mt-3"></div>
            <div className="mt-3 text-sm text-gray-700 space-y-4 leading-relaxed">
              <div>
                <p className="font-semibold text-gray-900 mb-1">How to sign up and log in:</p>
                <p>
                  To begin using the reservation system, visit the homepage and
                  click the{" "}
                  <span className="font-medium text-blue-600">"Login"</span>{" "}
                  button. If this is your first time using the system, click on{" "}
                  <span className="font-medium text-blue-600">"Sign Up"</span>{" "}
                  found just below the login form. You will need to provide your
                  full name, ID number, email address, and password. Select your
                  role carefully either <span className="italic">Student</span>{" "}
                  or <span className="italic">Faculty</span>.
                </p>
              </div>

              <div>
                <p className="font-semibold text-gray-900 mb-1">
                  Student vs Faculty account roles:
                </p>
                <p>
                  When creating an account, select your correct role based on your
                  university affiliation. Both students and faculty share the same
                  core features such as making reservations, joining as
                  participants, and checking room availability. Choosing the
                  correct role helps the library staff verify your identity and
                  ensures that your account is approved without unnecessary delay.
                </p>
              </div>

              <div>
                <p className="font-semibold text-gray-900 mb-1">
                  Verifying your ID number:
                </p>
                <p>
                  After you have signed up, bring your official university ID or
                  RFID card to the library staff for verification. You may also
                  email a clear picture of your ID to{" "}
                  <a
                    href="mailto:circulation@usa.edu.ph"
                    className="text-blue-600 hover:underline"
                  >
                    circulation@usa.edu.ph
                  </a>
                  . Once your ID is verified, your account will be fully
                  activated. You will see a{" "}
                  <span className="font-medium text-green-600">"Verified"</span>{" "}
                  label on your account when you log in.
                </p>
              </div>

              <div>
                <p className="font-semibold text-gray-900 mb-1">
                  What to do if your account is blocked:
                </p>
                <p>
                  A blocked account may happen if you have violated the
                  reservation policies, exceeded your allowed number of
                  reservations, or are still pending verification. If you believe
                  this is a mistake, message the admin using the{" "}
                  <span className="font-medium text-blue-600">Messages</span> tab
                  on your dashboard or approach the library staff for manual
                  assistance.
                </p>
              </div>
            </div>
          </details>

          {/* Section 2 */}
          <details className="border border-red-200 shadow-sm rounded-lg p-4 bg-white  transition-colors">
            <summary className="font-semibold cursor-pointer text-gray-800 text-base sm:text-lg">
              Making a Reservation
            </summary>
            <div className="border-b border-gray-200 mt-3"></div>
            <div className="mt-3 text-sm text-gray-700 space-y-4 leading-relaxed">
              <div>
                <p className="font-semibold text-gray-900 mb-1">
                  Choosing a date, location, and room:
                </p>
                <p>
                  From your dashboard, click the{" "}
                  <span className="font-medium text-blue-600">"Reserve Room"</span>{" "}
                  button. Select the date you want to reserve using the calendar
                  view. Next, choose a location (such as Ground Floor or Second
                  Floor or Forth Floor and Fifth Floor) from the displayed image tiles. Once a floor is chosen,
                  the available rooms will appear, allowing you to pick one that
                  best suits your group size and preferences.
                </p>
              </div>

              <div>
                <p className="font-semibold text-gray-900 mb-1">Date and time selection:</p>
                <p>
                  Reservations are limited to one hour per day per group. After
                  selecting the date, pick an available time slot. The system
                  automatically blocks slots that are already reserved or overlap
                  with existing bookings, ensuring that there are no conflicts.
                </p>
              </div>

              <div>
                <p className="font-semibold text-gray-900 mb-1">Adding participants:</p>
                <p>
                  You must add at least three participants by entering their
                  verified student or faculty ID numbers. The system will
                  cross-check these IDs and notify you if they are invalid,
                  duplicated, or already reserved for that day.
                </p>
              </div>

              <div>
                <p className="font-semibold text-gray-900 mb-1">
                  Reservation limit and restrictions:
                </p>
                <p>
                  Each user is allowed to make only two reservations per week. Once you have
                  reached the two-reservation limit, any additional booking attempts within the
                  same week will be automatically rejected. You must wait until the following
                  week to make a new reservation.
                </p>
              </div>

              <div>
                <p className="font-semibold text-gray-900 mb-1">
  Why you may be blocked from reserving:
</p>
<p>
  If the system prevents you from submitting a reservation, it could be due to:
</p>
<ul className="list-disc ml-5 mt-1 space-y-1">
  <li>You have already reached the two-reservations-per-week limit</li>
  <li>You already have a reservation on the selected day</li>
  <li>You are unverified</li>
  <li>You are already listed as a participant in another reservation on that day</li>
</ul>
<p className="mt-2">
  Always check your reservation history for confirmation.
</p>

              </div>
            </div>
          </details>

          {/* Section 3 */}
          <details className="border border-red-200 shadow-sm rounded-lg p-4 bg-white  transition-colors">
            <summary className="font-semibold cursor-pointer text-gray-800 text-base sm:text-lg">
              Understanding Room Availability
            </summary>
            <div className="border-b border-gray-200 mt-3"></div>
            <div className="mt-3 text-sm text-gray-700 space-y-4 leading-relaxed">
              <div>
                <p className="font-semibold text-gray-900 mb-1">How to check if a room is occupied:</p>
                <p>
                  On your dashboard, click a date on the calendar to open the Room Availability Checker. A modal will appear showing each room grouped by floor. If a room has existing reservations during that date and time, it will be marked as <span className="font-medium text-red-600">"Occupied"</span> along with the time ranges it is taken.
                </p>
              </div>

              <div>
                <p className="font-semibold text-gray-900 mb-1">What "Occupied" means:</p>
                <p>
                  A room is marked <span className="font-medium text-red-600">"Occupied"</span> if there is any reservation already submitted for that time, regardless of whether it's still pending or already approved. You will not be allowed to reserve overlapping time slots for rooms that are occupied.
                </p>
              </div>

              <div>
                <p className="font-semibold text-gray-900 mb-1">Why a room is unavailable:</p>
                <p>
                  A room may be unavailable due to:
                </p>
                <ul className="list-disc ml-5 mt-1 space-y-1">
                  <li>An existing reservation that has been <span className="italic">approved</span></li>
                  <li>The library is closed on the selected date</li>
                  <li>The selected time is outside the operating hours</li>
                </ul>
                <p className="mt-2">Always check availability before submitting a reservation request.</p>
              </div>

              <div>
                <p className="font-semibold text-gray-900 mb-1">Only approved reservations block the room:</p>
                <p>
                  A room is considered unavailable only if it already has an <span className="font-medium">Approved</span> reservation during the selected time slot. <span className="font-medium">Pending</span>, <span className="font-medium">Rejected</span>, or <span className="font-medium">Cancelled</span> reservations do <span className="font-medium text-red-600">not</span> block the room and will not affect availability.
                </p>
              </div>
            </div>
          </details>

          {/* Section 4 */}
          <details className="border border-red-200 shadow-sm rounded-lg p-4 bg-white  transition-colors">
            <summary className="font-semibold cursor-pointer text-gray-800 text-base sm:text-lg">
              Reservation Status & Actions
            </summary>
            <div className="border-b border-gray-200 mt-3"></div>
            <div className="mt-3 text-sm text-gray-700 space-y-4 leading-relaxed">
              <div>
                <p className="font-semibold text-gray-900 mb-1">What Pending, Approved, Rejected mean:</p>
                <div className="space-y-1">
                  <p><span className="text-yellow-600 font-medium">Pending</span>: Your reservation has been submitted and is awaiting admin approval. You cannot make another reservation until this is resolved.</p>
                  <p><span className="text-green-600 font-medium">Approved</span>: Your reservation was accepted and is officially scheduled. You may proceed to use the room at the specified time.</p>
                  <p><span className="text-red-600 font-medium">Rejected</span>: Your reservation was declined. You will need to submit a new request if needed. You are now allowed to reserve again for the same day.</p>
                </div>
              </div>

              <div>
                <p className="font-semibold text-gray-900 mb-1">How to cancel your reservation:</p>
                <p>
                  Go to the <span className="font-medium text-blue-600">Dashboard</span> or <span className="font-medium text-blue-600">History</span> tab, find your active reservation, and click the <span className="font-medium">"Cancel"</span> button. A confirmation dialog will appear. Once cancelled, the slot becomes available again for others to reserve.
                </p>
              </div>

              <div>
                <p className="font-semibold text-gray-900 mb-1">Viewing past reservations:</p>
                <p>
                  All your current and previous reservations can be viewed in the <span className="font-medium text-blue-600">History</span> tab. Here you can see the reservation date, time, room, and status. This is useful for checking your past activity or following up on a pending request.
                </p>
              </div>

              <div>
                <p className="font-semibold text-gray-900 mb-1">Why your reservation was rejected:</p>
                <p>Common reasons for rejection include:</p>
                <ul className="list-disc ml-5 mt-1 space-y-1">
                  <li>Duplicate reservation for the same day</li>
                  <li>Invalid or unverified participants</li>
                  <li>Attempting to reserve a time slot already occupied</li>
                  <li>Violation of library or room guidelines</li>
                </ul>
                <p className="mt-2">
                  Check your email or notification tab for rejection details. You may contact the admin through the <span className="font-medium text-blue-600">Messages</span> tab if clarification is needed.
                </p>
              </div>
            </div>
          </details>

          {/* Section 5 */}
          <details className="border border-red-200 shadow-sm rounded-lg p-4 bg-white  transition-colors">
            <summary className="font-semibold cursor-pointer text-gray-800 text-base sm:text-lg">
              Notifications & Updates
            </summary>
            <div className="border-b border-gray-200 mt-3"></div>
            <div className="mt-3 text-sm text-gray-700 space-y-4 leading-relaxed">
              <div>
                <p className="font-semibold text-gray-900 mb-1">How you get notified:</p>
                <p>
                  Every time your reservation status changes (e.g., Approved, Rejected, or Cancelled), the system will send you two types of notifications:
                </p>
                <ul className="list-disc ml-5 mt-1 space-y-1">
                  <li>A real-time update inside the <span className="font-medium text-blue-600">Notifications</span> tab on your dashboard.</li>
                  <li>An email alert to the address you used when signing up.</li>
                </ul>
              </div>

              <div>
                <p className="font-semibold text-gray-900 mb-1">Where to view updates:</p>
                <p>
                  Go to the <span className="font-medium text-blue-600">Notifications</span> tab from the sidebar menu. Here, you'll see a list of updates sorted by most recent. Each notification includes the reservation ID, room name, time, and the status update (e.g., "Your reservation has been approved").
                </p>
              </div>

              <div>
                <p className="font-semibold text-gray-900 mb-1">Didn't receive an email? Check your spam:</p>
                <p>
                  If you haven't received an email update, check your spam or junk folder. Some university email systems may automatically filter unknown senders. Also, ensure that your registered email is correct in your <span className="font-medium text-blue-600">Profile</span> tab. If the issue persists, contact the admin via <span className="font-medium text-blue-600">Messages</span>.
                </p>
              </div>
            </div>
          </details>

          {/* Section 6 */}
          <details className="border border-red-200 shadow-sm rounded-lg p-4 bg-white  transition-colors">
            <summary className="font-semibold cursor-pointer text-gray-800 text-base sm:text-lg">
              Troubleshooting
            </summary>
            <div className="border-b border-gray-200 mt-3"></div>
            <div className="mt-3 text-sm text-gray-700 space-y-4 leading-relaxed">
              <div>
                <p className="font-semibold text-gray-900 mb-1">Reservation form not submitting:</p>
                <p>
                  Double-check that all required fields are filled out especially the date, time, and participants. Make sure:
                </p>
                <ul className="list-disc ml-5 mt-1 space-y-1">
                  <li>You selected a room</li>
                  <li>The time slot is available</li>
                  <li>You added at least 3 valid participant ID numbers</li>
                </ul>
                <p className="mt-2">
                  If the form doesn't respond or nothing happens after clicking submit, try refreshing the page and filling it out again. If the issue continues, contact the library staff for assistance.
                </p>
              </div>

             

              <div>
                <p className="font-semibold text-gray-900 mb-1">Participants not verifying:</p>
                <p>If a participant's ID doesn't verify:</p>
                <ul className="list-disc ml-5 mt-1 space-y-1">
                  <li>Make sure the ID is typed correctly</li>
                  <li>Ensure the participant has already signed up and is verified</li>
                  <li>Do not reuse the same ID twice</li>
                </ul>
                <p className="mt-2">
                  If problems persist, contact the admin through the <span className="font-medium text-blue-600">Messages</span> tab for assistance.
                </p>
              </div>

              <div>
                <p className="font-semibold text-gray-900 mb-1">Can't log in or forgot password:</p>
                <p>
                  If you're having trouble logging in, double-check your email and password. If you forgot your password, you can now reset it by clicking the <span className="font-medium text-blue-600">Forgot Password</span> link on the login page and following the instructions.
                </p>
              </div>
            </div>
          </details>

          {/* Section 7 */}
          <details className="border border-red-200 shadow-sm rounded-lg p-4 bg-white  transition-colors">
            <summary className="font-semibold cursor-pointer text-gray-800 text-base sm:text-lg">
              Frequently Asked Questions
            </summary>
            <div className="border-b border-gray-200 mt-3"></div>
            <div className="mt-3 text-sm text-gray-700 space-y-4 leading-relaxed">
              <div>
                <p className="font-semibold text-gray-900 mb-1">Why can't I reserve more than once today?</p>
                <p>
                  To maintain fairness and allow equal access to rooms, each user is limited to one reservation per day whether you are the main reserver or added as a participant. This rule applies even if the reservation was rejected or canceled.
                </p>
              </div>

              <div>
                <p className="font-semibold text-gray-900 mb-1">Can participants reserve too?</p>
                <p>
                  Yes, participants can also reserve but only if they haven't already joined another reservation that day. Once you're involved in any reservation (even as a participant), the system will block you from creating or joining another on the same day.
                </p>
              </div>

              <div>
                <p className="font-semibold text-gray-900 mb-1">Why do I need to be verified?</p>
                <p>
                  Verification ensures that only legitimate University of San Agustin students and faculty use the system. Your ID must be verified before you can create a reservation or be added as a participant. Unverified accounts will not be allowed to reserve.
                </p>
              </div>

              <div>
                <p className="font-semibold text-gray-900 mb-1">What time ranges are allowed?</p>
                <p>
                  Reservation times follow the library's open hours. You can choose hourly blocks within the allowed time range, but you cannot overlap existing reservations. The system will only accept valid time slots that do not conflict with others.
                </p>
              </div>
            </div>
          </details>

          {/* Section 8 */}
          <details className="border border-red-200 shadow-sm rounded-lg p-4 bg-white  transition-colors">
            <summary className="font-semibold cursor-pointer text-gray-800 text-base sm:text-lg">
              Contact
            </summary>
            <div className="border-b border-gray-200 mt-3"></div>
            <div className="mt-3 text-sm text-gray-700 space-y-4 leading-relaxed">
              <div>
                <p className="font-semibold text-gray-900 mb-1">Contact admin through the Messages tab:</p>
                <p>
                  If you need help with account issues, reservation concerns, or system errors, go to the <span className="font-medium text-blue-600">Messages</span> tab in your dashboard. You can send a direct message to the system administrator or library staff. Replies will also appear there.
                </p>
              </div>

              <div>
                <p className="font-semibold text-gray-900 mb-1">Email:</p>
                <p>
                  For urgent matters, email us at <p className="text-blue-600 hover:underline">support@yourdomain.com</p>. Include your full name, ID number, and a clear description of your issue for faster assistance.
                </p>
              </div>

              <div>
                <p className="font-semibold text-gray-900 mb-1">Submit a request via contact form:</p>
                <p>
                  If the website includes a contact form (check the homepage or footer), you may also submit support requests there. Make sure to include your contact information and a detailed explanation of the problem.
                </p>
              </div>
            </div>
          </details>
        </div>
      </div>
    </main>
  );
}