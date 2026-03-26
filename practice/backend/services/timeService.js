// services/timeService.js
import moment from 'moment-timezone';

const TIMEZONE = 'Asia/Manila';

export const timeService = {
  getCurrentTime() {
    return moment().tz(TIMEZONE);
  },
  
  getCurrentDate() {
    return moment().tz(TIMEZONE).format('YYYY-MM-DD');
  },
  
  timeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  },
  
  formatTime(timeStr) {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const date = moment().tz(TIMEZONE);
    date.hours(parseInt(hours));
    date.minutes(parseInt(minutes));
    return date.format('hh:mm A');
  },
  
  formatDate(dateStr) {
    if (!dateStr) return '';
    return moment(dateStr).tz(TIMEZONE).format('MMMM DD, YYYY');
  },
  
  // FIXED VERSION
  parseClosureDateTime(date, time) {
    if (!date || !time) {
      console.error("Invalid date or time for parseClosureDateTime:", { date, time });
      return moment().tz(TIMEZONE);
    }
    
    const dateTimeStr = `${date} ${time}`;
    const parsed = moment.tz(dateTimeStr, 'YYYY-MM-DD HH:mm', TIMEZONE);
    
    if (!parsed.isValid()) {
      console.error("Failed to parse date/time:", dateTimeStr);
      return moment().tz(TIMEZONE);
    }
    
    return parsed;
  },
  
  shouldBeActive(closure) {
    const now = this.getCurrentTime();
    const closureStart = this.parseClosureDateTime(closure.date, closure.startTime);
    const closureEnd = this.parseClosureDateTime(closure.date, closure.endTime);
    
    return now.isSameOrAfter(closureStart) && now.isBefore(closureEnd);
  },
  
  isExpired(closure) {
    const now = this.getCurrentTime();
    const closureEnd = this.parseClosureDateTime(closure.date, closure.endTime);
    
    return now.isAfter(closureEnd);
  },
  
  isScheduled(closure) {
    const now = this.getCurrentTime();
    const closureStart = this.parseClosureDateTime(closure.date, closure.startTime);
    
    return now.isBefore(closureStart);
  },
  
  doTimesOverlap(start1, end1, start2, end2) {
    const start1Min = this.timeToMinutes(start1);
    const end1Min = this.timeToMinutes(end1);
    const start2Min = this.timeToMinutes(start2);
    const end2Min = this.timeToMinutes(end2);
    
    return start1Min < end2Min && end1Min > start2Min;
  },
  
  isValidTimeRange(startTime, endTime) {
    const startMin = this.timeToMinutes(startTime);
    const endMin = this.timeToMinutes(endTime);
    return endMin > startMin;
  },
  
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