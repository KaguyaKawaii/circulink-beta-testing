// services/timeService.js
import moment from 'moment-timezone';

const TIMEZONE = 'Asia/Manila';

export const timeService = {
  // Get current time in Philippines timezone
  getCurrentTime() {
    return moment().tz(TIMEZONE);
  },
  
  // Get current date in YYYY-MM-DD format
  getCurrentDate() {
    return moment().tz(TIMEZONE).format('YYYY-MM-DD');
  },
  
  // Convert time string to minutes since midnight
  timeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  },
  
  // Format time for display (e.g., "02:30 PM")
  formatTime(timeStr) {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const date = moment().tz(TIMEZONE);
    date.hours(parseInt(hours));
    date.minutes(parseInt(minutes));
    return date.format('hh:mm A');
  },
  
  // Format date for display
  formatDate(dateStr) {
    if (!dateStr) return '';
    return moment(dateStr).tz(TIMEZONE).format('MMMM DD, YYYY');
  },
  
  // Parse closure datetime with timezone
  parseClosureDateTime(date, time) {
    const [year, month, day] = date.split('-');
    const [hours, minutes] = time.split(':').map(Number);
    
    return moment.tz(
      { year: parseInt(year), month: parseInt(month) - 1, day: parseInt(day), hour: hours, minute: minutes },
      TIMEZONE
    );
  },
  
  // Check if closure should be active
  shouldBeActive(closure) {
    const now = this.getCurrentTime();
    const closureStart = this.parseClosureDateTime(closure.date, closure.startTime);
    const closureEnd = this.parseClosureDateTime(closure.date, closure.endTime);
    
    return now.isSameOrAfter(closureStart) && now.isBefore(closureEnd);
  },
  
  // Check if closure has expired
  isExpired(closure) {
    const now = this.getCurrentTime();
    const closureEnd = this.parseClosureDateTime(closure.date, closure.endTime);
    
    return now.isAfter(closureEnd);
  },
  
  // Check if closure is scheduled (future)
  isScheduled(closure) {
    const now = this.getCurrentTime();
    const closureStart = this.parseClosureDateTime(closure.date, closure.startTime);
    
    return now.isBefore(closureStart);
  },
  
  // Check if two time ranges overlap
  doTimesOverlap(start1, end1, start2, end2) {
    const start1Min = this.timeToMinutes(start1);
    const end1Min = this.timeToMinutes(end1);
    const start2Min = this.timeToMinutes(start2);
    const end2Min = this.timeToMinutes(end2);
    
    return start1Min < end2Min && end1Min > start2Min;
  },
  
  // Validate that end time is after start time
  isValidTimeRange(startTime, endTime) {
    const startMin = this.timeToMinutes(startTime);
    const endMin = this.timeToMinutes(endTime);
    return endMin > startMin;
  },
  
  // Get the status for a closure based on current time
  getClosureStatus(closure) {
    if (closure.status === 'Deactivated') return 'Deactivated';
    if (closure.status === 'Expired') return 'Expired';
    
    if (this.isExpired(closure)) return 'Expired';
    if (this.shouldBeActive(closure)) return 'Active';
    if (this.isScheduled(closure)) return 'Scheduled';
    
    return closure.status || 'Scheduled';
  }
};

export default timeService;