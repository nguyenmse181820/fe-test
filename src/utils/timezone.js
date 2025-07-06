/**
 * Timezone utility functions for handling flight times across different timezones
 */

/**
 * Convert a date from one timezone to another
 * @param {Date|string} date - The date to convert
 * @param {string} fromTimezone - Source timezone (e.g., 'Asia/Ho_Chi_Minh')
 * @param {string} toTimezone - Target timezone (e.g., 'UTC')
 * @returns {Date} - Converted date
 */
export const convertTimezone = (date, fromTimezone, toTimezone) => {
  const inputDate = new Date(date);
  
  // Create a date string that represents the local time in the source timezone
  const localTimeString = inputDate.toLocaleString('sv-SE', { timeZone: fromTimezone });
  const localDate = new Date(localTimeString);
  
  // Get the timezone offset difference
  const sourceOffset = getTimezoneOffset(fromTimezone, localDate);
  const targetOffset = getTimezoneOffset(toTimezone, localDate);
  
  // Calculate the difference and apply it
  const offsetDiff = sourceOffset - targetOffset;
  return new Date(localDate.getTime() + offsetDiff * 60000);
};

/**
 * Get timezone offset in minutes for a given timezone and date
 * @param {string} timezone - Timezone string (e.g., 'Asia/Ho_Chi_Minh')
 * @param {Date} date - Date to check offset for
 * @returns {number} - Offset in minutes
 */
const getTimezoneOffset = (timezone, date) => {
  const utcDate = new Date(date.toLocaleString('sv-SE', { timeZone: 'UTC' }));
  const tzDate = new Date(date.toLocaleString('sv-SE', { timeZone: timezone }));
  return (tzDate - utcDate) / 60000;
};

/**
 * Convert local admin time to UTC for flight creation
 * @param {Date|string} localTime - Local time from admin
 * @returns {string} - UTC ISO string for backend
 */
export const convertLocalToUTC = (localTime) => {
  const date = new Date(localTime);
  return date.toISOString();
};

/**
 * Convert UTC time to specific timezone
 * @param {Date|string} utcTime - UTC time from backend
 * @param {string} timezone - Target timezone
 * @returns {Date} - Local time in target timezone
 */
export const convertUTCToTimezone = (utcTime, timezone) => {
  // Convert backend datetime string to proper UTC Date if needed
  const utcDate = typeof utcTime === 'string' ? parseBackendDateTime(utcTime) : new Date(utcTime);
  
  if (!utcDate || isNaN(utcDate.getTime())) {
    return new Date('Invalid Date');
  }
  
  // Get the local time in the target timezone
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  
  const localTimeString = formatter.format(utcDate);
  return new Date(localTimeString);
};

/**
 * Convert backend UTC datetime string to proper UTC Date object
 * Backend sends datetime that should always be treated as UTC
 * @param {string} dateTimeString - DateTime string from backend (represents UTC time)
 * @returns {Date} - Proper UTC Date object
 */
export const parseBackendDateTime = (dateTimeString) => {
  if (!dateTimeString) return null;
  
  // If it already has timezone info, use it as is
  if (dateTimeString.includes('Z') || dateTimeString.includes('+')) {
    return new Date(dateTimeString);
  }
  
  // Force treat as UTC by adding 'Z'
  let isoString = dateTimeString.replace(' ', 'T');
  
  // Remove microseconds if present
  if (isoString.includes('.')) {
    isoString = isoString.split('.')[0];
  }
  
  // Add Z to force UTC interpretation
  isoString += 'Z';
  
  return new Date(isoString);
};

/**
 * Parse backend datetime string assuming it represents the intended display time
 * This means if backend sends "09:00:00", we want to display "09:00" in local time
 * @param {string} dateTimeString - DateTime string from backend
 * @returns {Date} - Date object representing the time as intended for display
 */
export const parseBackendDateTimeAsDisplayTime = (dateTimeString) => {
  if (!dateTimeString) return null;
  
  // If it's already an ISO string with Z or timezone info, use it as is
  if (dateTimeString.includes('Z') || dateTimeString.includes('+')) {
    return new Date(dateTimeString);
  }
  
  // Backend sends "YYYY-MM-DDTHH:mm:ss" or "YYYY-MM-DD HH:mm:ss.ssssss" format
  // We want to display this time as-is in the user's timezone
  let isoString = dateTimeString.replace(' ', 'T');
  
  // Remove microseconds if present
  if (isoString.includes('.')) {
    isoString = isoString.split('.')[0];
  }
  
  // Parse as local time (this is what we want for display)
  return new Date(isoString);
};

/**
 * Format time for display with timezone info
 * @param {Date|string} dateTime - DateTime to format (backend UTC string or Date object)
 * @param {string} timezone - Timezone to display in
 * @param {boolean} showTimezone - Whether to show timezone name
 * @returns {string} - Formatted time string
 */
export const formatTimeWithTimezone = (dateTime, timezone, showTimezone = true) => {
  // Convert backend datetime string to proper UTC Date if needed
  const date = typeof dateTime === 'string' ? parseBackendDateTime(dateTime) : new Date(dateTime);
  
  if (!date || isNaN(date.getTime())) {
    return 'Invalid Date';
  }
  
  const timeOptions = {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  };
  
  const time = date.toLocaleTimeString('en-US', timeOptions);
  
  if (!showTimezone) {
    return time;
  }
  
  // Get timezone abbreviation
  const tzName = getTimezoneAbbreviation(timezone);
  return `${time} (${tzName})`;
};

/**
 * Format date for display with timezone info
 * @param {Date|string} dateTime - DateTime to format (backend UTC string or Date object)
 * @param {string} timezone - Timezone to display in
 * @returns {string} - Formatted date string
 */
export const formatDateWithTimezone = (dateTime, timezone) => {
  // Convert backend datetime string to proper UTC Date if needed
  const date = typeof dateTime === 'string' ? parseBackendDateTime(dateTime) : new Date(dateTime);
  
  if (!date || isNaN(date.getTime())) {
    return 'Invalid Date';
  }
  
  return date.toLocaleDateString('en-US', {
    timeZone: timezone,
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
};

/**
 * Get timezone abbreviation from timezone string
 * @param {string} timezone - Full timezone string
 * @returns {string} - Timezone abbreviation
 */
export const getTimezoneAbbreviation = (timezone) => {
  const abbreviations = {
    'Asia/Ho_Chi_Minh': 'ICT',
    'Asia/Saigon': 'ICT', // Alternative name for Ho Chi Minh City
    'Asia/Bangkok': 'ICT',
    'Asia/Singapore': 'SGT',
    'Asia/Kuala_Lumpur': 'MYT',
    'UTC': 'UTC'
  };
  
  // If we have a predefined abbreviation, use it
  if (abbreviations[timezone]) {
    return abbreviations[timezone];
  }
  
  // Otherwise, try to extract from the timezone string
  const parts = timezone.split('/');
  if (parts.length >= 2) {
    return parts[1].replace(/_/g, ' ');
  }
  
  return timezone;
};

/**
 * Get user's local timezone
 * @returns {string} - User's timezone
 */
export const getUserTimezone = () => {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
};

/**
 * Check if two timezones are the same
 * @param {string} tz1 - First timezone
 * @param {string} tz2 - Second timezone
 * @returns {boolean} - Whether timezones are the same
 */
export const isSameTimezone = (tz1, tz2) => {
  return tz1 === tz2;
};

/**
 * Convert departure time to UTC for backend (admin creates flights in UTC)
 * @param {string} localDateTime - Local datetime string (YYYY-MM-DDTHH:mm:ss)
 * @returns {string} - UTC ISO string
 */
export const convertAdminTimeToUTC = (localDateTime) => {
  // For admin, we treat their input as UTC time directly
  // This ensures the backend receives exactly what admin intended
  return localDateTime + 'Z'; // Add Z to indicate UTC
};

/**
 * Display times for different locations
 * @param {string} utcDateTime - UTC datetime from backend
 * @param {string} originTimezone - Origin airport timezone
 * @param {string} destinationTimezone - Destination airport timezone
 * @returns {Object} - Object with different timezone displays
 */
export const getMultiTimezoneDisplay = (utcDateTime, originTimezone, destinationTimezone) => {
  // Convert backend datetime string to proper UTC Date
  const utcDate = parseBackendDateTime(utcDateTime);
  const userTimezone = getUserTimezone();
  
  if (!utcDate || isNaN(utcDate.getTime())) {
    const invalidDisplay = { time: 'Invalid Date', date: 'Invalid Date', label: 'Error' };
    return {
      utc: invalidDisplay,
      origin: invalidDisplay,
      destination: invalidDisplay,
      user: invalidDisplay
    };
  }
  
  return {
    utc: {
      time: formatTimeWithTimezone(utcDate, 'UTC', true),
      date: formatDateWithTimezone(utcDate, 'UTC'),
      label: 'UTC'
    },
    origin: {
      time: formatTimeWithTimezone(utcDate, originTimezone, true),
      date: formatDateWithTimezone(utcDate, originTimezone),
      label: `Local (${getTimezoneAbbreviation(originTimezone)})`
    },
    destination: {
      time: formatTimeWithTimezone(utcDate, destinationTimezone, true),
      date: formatDateWithTimezone(utcDate, destinationTimezone),
      label: `Destination (${getTimezoneAbbreviation(destinationTimezone)})`
    },
    user: {
      time: formatTimeWithTimezone(utcDate, userTimezone, true),
      date: formatDateWithTimezone(utcDate, userTimezone),
      label: `Your time (${getTimezoneAbbreviation(userTimezone)})`
    }
  };
};

/**
 * Format flight time for display - shows the time as intended by the backend
 * @param {Date|string} dateTime - DateTime to format (backend string or Date object)
 * @param {string} timezone - Timezone to display in
 * @param {boolean} showTimezone - Whether to show timezone name
 * @returns {string} - Formatted time string
 */
export const formatFlightTime = (dateTime, timezone, showTimezone = true) => {
  // Parse the backend time as display time (not UTC)
  const date = typeof dateTime === 'string' ? parseBackendDateTimeAsDisplayTime(dateTime) : new Date(dateTime);
  
  if (!date || isNaN(date.getTime())) {
    return 'Invalid Date';
  }
  
  // For display purposes, we want to show the time in the specified timezone
  // But we need to calculate what the time would be if the original time was in that timezone
  
  const userTimezone = getUserTimezone();
  
  if (timezone === userTimezone) {
    // If showing in user's timezone, show the time as parsed (this is the intended display time)
    const timeOptions = {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    };
    
    const time = date.toLocaleTimeString('en-US', timeOptions);
    
    if (!showTimezone) {
      return time;
    }
    
    const tzName = getTimezoneAbbreviation(timezone);
    return `${time} (${tzName})`;
  } else {
    // If showing in a different timezone, convert accordingly
    return formatTimeWithTimezone(dateTime, timezone, showTimezone);
  }
};

/**
 * Force parse backend datetime as UTC, regardless of format
 * Use this if backend intends the time to be UTC but doesn't send 'Z' suffix
 * @param {string} dateTimeString - DateTime string from backend
 * @returns {Date} - Date object with time forced to UTC
 */
export const parseBackendDateTimeAsForceUTC = (dateTimeString) => {
  if (!dateTimeString) return null;
  
  // If it already has timezone info, use it as is
  if (dateTimeString.includes('Z') || dateTimeString.includes('+')) {
    return new Date(dateTimeString);
  }
  
  // Force treat as UTC by adding 'Z'
  let isoString = dateTimeString.replace(' ', 'T');
  
  // Remove microseconds if present
  if (isoString.includes('.')) {
    isoString = isoString.split('.')[0];
  }
  
  // Add Z to force UTC interpretation
  isoString += 'Z';
  
  return new Date(isoString);
};

/**
 * Format time forcing UTC interpretation of backend data
 * @param {Date|string} dateTime - DateTime to format (backend UTC string or Date object)
 * @param {string} timezone - Timezone to display in
 * @param {boolean} showTimezone - Whether to show timezone name
 * @returns {string} - Formatted time string
 */
export const formatTimeForceUTC = (dateTime, timezone, showTimezone = true) => {
  // Force parse backend datetime string as UTC
  const date = typeof dateTime === 'string' ? parseBackendDateTimeAsForceUTC(dateTime) : new Date(dateTime);
  
  if (!date || isNaN(date.getTime())) {
    return 'Invalid Date';
  }
  
  const timeOptions = {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  };
  
  const time = date.toLocaleTimeString('en-US', timeOptions);
  
  if (!showTimezone) {
    return time;
  }
  
  // Get timezone abbreviation
  const tzName = getTimezoneAbbreviation(timezone);
  return `${time} (${tzName})`;
};

/**
 * Debug function to help understand timezone conversion issues
 * @param {string} backendDateTime - DateTime string from backend
 * @param {string} label - Label for debugging
 */
export const debugTimezone = (backendDateTime, label = 'Debug') => {
  console.log(`\n=== ${label} ===`);
  console.log(`Backend string: "${backendDateTime}"`);
  
  // Show what happens with old approach
  const oldDate = new Date(backendDateTime);
  console.log(`OLD new Date(): ${oldDate.toISOString()} (${oldDate.toString()})`);
  
  // Show what happens with force UTC approach
  const forceUTCDate = parseBackendDateTimeAsForceUTC(backendDateTime);
  console.log(`FORCE UTC parseBackendDateTimeAsForceUTC(): ${forceUTCDate.toISOString()} (${forceUTCDate.toString()})`);
  
  // Show different timezone displays
  const userTz = getUserTimezone();
  console.log(`User timezone: ${userTz}`);
  console.log(`=== COMPARISON ===`);
  console.log(`OLD - Local: ${formatTimeWithTimezone(oldDate, userTz, true)}, UTC: ${formatTimeWithTimezone(oldDate, 'UTC', true)}`);
  console.log(`NEW - Local: ${formatTimeForceUTC(backendDateTime, userTz, true)}, UTC: ${formatTimeForceUTC(backendDateTime, 'UTC', true)}`);
  console.log(`=== EXPLANATION ===`);
  console.log(`If backend "${backendDateTime}" means 09:00 LOCAL time:`);
  console.log(`  -> Display: 09:00 (ICT), UTC: 02:00 (UTC) <- OLD approach`);
  console.log(`If backend "${backendDateTime}" means 09:00 UTC time:`);
  console.log(`  -> Display: 16:00 (ICT), UTC: 09:00 (UTC) <- NEW approach`);
  
  return forceUTCDate;
};
