import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

export const DATE_FORMAT = 'DD/MM/YYYY';
export const TIME_FORMAT = 'HH:mm';
export const DATE_TIME_FORMAT = 'DD/MM/YYYY HH:mm';

export function formatDate(date, format = DATE_FORMAT) {
  if (!date) return '-';
  const d = dayjs(date);
  const fmt = typeof format === 'string' ? format : DATE_FORMAT;
  return d.isValid() ? d.format(fmt) : '-';
}

export function formatTime(date, format = TIME_FORMAT) {
  if (!date) return '-';
  const d = dayjs(date);
  const fmt = typeof format === 'string' ? format : TIME_FORMAT;
  return d.isValid() ? d.format(fmt) : '-';
}

export function formatDateTime(date, format = DATE_TIME_FORMAT) {
  if (!date) return '-';
  const d = dayjs(date);
  const fmt = typeof format === 'string' ? format : DATE_TIME_FORMAT;
  return d.isValid() ? d.format(fmt) : '-';
}

export function fromNow(date) {
  if (!date) return '-';
  const d = dayjs(date);
  return d.isValid() ? d.fromNow() : '-';
}

export { dayjs };
export default dayjs;
