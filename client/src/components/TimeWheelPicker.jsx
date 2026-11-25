import React, { useEffect, useMemo, useRef, useState } from 'react';
import './TimeWheelPicker.css';

const pad = (value) => String(value).padStart(2, '0');
const ROW_HEIGHT = 32;
const PAD_ROWS = 2;

export function to24HourTime(hour12, minute, period) {
  const hour = Number(hour12) % 12 + (period === 'PM' ? 12 : 0);
  return `${pad(hour)}:${pad(minute)}`;
}

function from24HourTime(value) {
  const match = /^(\d{1,2}):(\d{2})/.exec(value || '');
  const hour = match ? Number(match[1]) : 8;
  const minute = match ? Number(match[2]) : 0;
  return {
    hour12: hour % 12 || 12,
    minute: Math.min(59, minute),
    period: hour >= 12 ? 'PM' : 'AM',
  };
}

export default function TimeWheelPicker({ value, onChange, disabled = false, id, ...props }) {
  const initial = from24HourTime(value);
  const [parts, setParts] = useState(initial);
  const partsRef = useRef(initial);
  const refs = useRef({});
  const scrollTimers = useRef({});
  const snapTimers = useRef({});
  const programmaticScroll = useRef({ hour: false, minute: false, period: false });
  const mountedRef = useRef(false);
  const values = useMemo(() => ({ hour: Array.from({ length: 12 }, (_, i) => i + 1), minute: Array.from({ length: 60 }, (_, i) => i), period: ['AM', 'PM'] }), []);

  useEffect(() => {
    const next = from24HourTime(value);
    partsRef.current = next;
    setParts(next);
    const selectedValues = { hour: next.hour12, minute: next.minute, period: next.period };
    Object.entries(selectedValues).forEach(([column, selected]) => {
      const index = values[column].indexOf(selected);
      const el = refs.current[column];
      if (index >= 0 && el) {
        const targetTop = index * ROW_HEIGHT;
        if (Math.abs(el.scrollTop - targetTop) > 1) {
          programmaticScroll.current[column] = true;
          clearTimeout(scrollTimers.current[column]);
          clearTimeout(snapTimers.current[column]);
          if (!mountedRef.current) {
            el.scrollTop = targetTop;
            setTimeout(() => { programmaticScroll.current[column] = false; }, 50);
          } else {
            el.scrollTo({ top: targetTop, behavior: 'smooth' });
            setTimeout(() => { programmaticScroll.current[column] = false; }, 350);
          }
        }
      }
    });
    mountedRef.current = true;
  }, [value, values]);

  useEffect(() => () => {
    Object.values(scrollTimers.current).forEach(clearTimeout);
    Object.values(snapTimers.current).forEach(clearTimeout);
  }, []);

  const update = (stateKey, next) => {
    const nextParts = { ...partsRef.current, [stateKey]: next };
    partsRef.current = nextParts;
    setParts(nextParts);
    onChange?.(to24HourTime(nextParts.hour12, nextParts.minute, nextParts.period));
  };

  const displayHour = parts.hour12;
  const displayMinute = pad(parts.minute);
  const wheel = (column, label, stateKey) => {
    const selected = parts[stateKey];
    const selectedIndex = values[column].indexOf(selected);
    const step = (delta) => update(stateKey, values[column][(selectedIndex + delta + values[column].length) % values[column].length]);
    return <div key={column} ref={(element) => { refs.current[column] = element; }} className={`time-wheel-column time-wheel-${column}`} role="listbox" aria-label={label} aria-activedescendant={`${id || 'time'}-${column}-${selected}`} tabIndex={disabled ? -1 : 0} onKeyDown={(event) => {
      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') { event.preventDefault(); step(event.key === 'ArrowUp' ? -1 : 1); }
    }} onScroll={(event) => {
      if (programmaticScroll.current[column]) return;
      const element = event.currentTarget;
      clearTimeout(scrollTimers.current[column]);
      clearTimeout(snapTimers.current[column]);
      scrollTimers.current[column] = setTimeout(() => {
        if (programmaticScroll.current[column]) return;
        const index = Math.max(0, Math.min(values[column].length - 1, Math.round(element.scrollTop / ROW_HEIGHT)));
        const targetTop = index * ROW_HEIGHT;
        if (Math.abs(element.scrollTop - targetTop) > 1) {
          element.scrollTo({ top: targetTop, behavior: 'smooth' });
        }
        snapTimers.current[column] = setTimeout(() => {
          if (programmaticScroll.current[column]) return;
          const next = values[column][index];
          const latestSelected = partsRef.current[stateKey];
          if (next !== latestSelected) update(stateKey, next);
        }, 150);
      }, 120);
    }}>
      {Array.from({ length: PAD_ROWS }, (_, i) => <div aria-hidden="true" key={`top-${i}`} className="time-wheel-pad" />)}
      {values[column].map((option) => <button type="button" role="option" aria-selected={option === selected} id={`${id || 'time'}-${column}-${option}`} key={option} disabled={disabled} className={`time-wheel-option${option === selected ? ' is-active' : ''}`} onClick={() => update(stateKey, option)}>{column === 'period' ? option.toLowerCase() : pad(option)}</button>)}
      {Array.from({ length: PAD_ROWS }, (_, i) => <div aria-hidden="true" key={`bottom-${i}`} className="time-wheel-pad" />)}
    </div>;
  };
  return <div className="time-wheel-picker" id={id} aria-label={`Selected time ${displayHour}:${displayMinute} ${parts.period}`} {...props}>
    <div className="time-wheel-selection-band" aria-hidden="true" />
    {wheel('hour', 'Hour', 'hour12')}{wheel('minute', 'Minute', 'minute')}{wheel('period', 'AM or PM', 'period')}
  </div>;
}
