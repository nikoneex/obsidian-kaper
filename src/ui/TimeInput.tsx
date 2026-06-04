import {
  ChangeEvent,
  FocusEvent,
  KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from 'react';

interface Parts {
  hours: number;
  minutes: number;
}

function parseDuration(duration: string): Parts {
  if (!duration?.trim()) return { hours: 0, minutes: 0 };
  const h = duration.match(/(\d+)h/);
  const m = duration.match(/(\d+)m/);
  return { hours: h ? +h[1] : 0, minutes: m ? +m[1] : 0 };
}

function formatDuration({ hours, minutes }: Parts): string {
  if (hours === 0 && minutes === 0) return '';
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h${minutes}m`;
}

function rollover({ hours, minutes }: Parts): Parts {
  if (minutes < 60) return { hours, minutes };
  return {
    hours: hours + Math.floor(minutes / 60),
    minutes: minutes % 60,
  };
}

function toInt(raw: string): number {
  const digits = raw.replace(/\D/g, '');
  return digits ? parseInt(digits, 10) : 0;
}

interface TimeInputProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  disabled?: boolean;
}

export function TimeInput({ value, onChange, id, disabled }: TimeInputProps) {
  // Seed from the incoming value so a saved time shows on first render; the
  // effect below keeps the fields synced on later external changes.
  const [hoursText, setHoursText] = useState(() => {
    const { hours } = rollover(parseDuration(value ?? ''));
    return hours ? String(hours) : '';
  });
  const [minutesText, setMinutesText] = useState(() => {
    const { minutes } = rollover(parseDuration(value ?? ''));
    return minutes ? String(minutes) : '';
  });
  const wrapperRef = useRef<HTMLDivElement>(null);
  // Tracks the last value we emitted so external resyncs don't snap-rollover mid-typing.
  const emittedRef = useRef<string>(value ?? '');

  useEffect(() => {
    if (value === emittedRef.current) return;
    const { hours, minutes } = rollover(parseDuration(value ?? ''));
    setHoursText(hours ? String(hours) : '');
    setMinutesText(minutes ? String(minutes) : '');
    emittedRef.current = value ?? '';
  }, [value]);

  const emit = (h: string, m: string) => {
    const parts = rollover({ hours: toInt(h), minutes: toInt(m) });
    const next = formatDuration(parts);
    emittedRef.current = next;
    onChange(next);
  };

  const onHoursInput = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 3);
    setHoursText(raw);
    emit(raw, minutesText);
  };

  const onMinutesInput = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 3);
    setMinutesText(raw);
    emit(hoursText, raw);
  };

  const onFocusOut = (e: FocusEvent<HTMLDivElement>) => {
    const next = e.relatedTarget as Node | null;
    if (next && wrapperRef.current?.contains(next)) return;
    const parts = rollover({ hours: toInt(hoursText), minutes: toInt(minutesText) });
    setHoursText(parts.hours ? String(parts.hours) : '');
    setMinutesText(parts.minutes ? String(parts.minutes) : '');
    const formatted = formatDuration(parts);
    emittedRef.current = formatted;
    onChange(formatted);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (
      e.ctrlKey ||
      e.metaKey ||
      [
        'Backspace',
        'Delete',
        'Tab',
        'Escape',
        'Enter',
        'ArrowLeft',
        'ArrowRight',
        'ArrowUp',
        'ArrowDown',
        'Home',
        'End',
      ].includes(e.key) ||
      /^\d$/.test(e.key)
    ) {
      return;
    }
    e.preventDefault();
  };

  return (
    <div ref={wrapperRef} className="kaper-time-input" onBlur={onFocusOut}>
      <input
        id={id}
        className="kaper-time-input__field"
        type="text"
        inputMode="numeric"
        placeholder="0"
        maxLength={3}
        disabled={disabled}
        value={hoursText}
        onChange={onHoursInput}
        onKeyDown={onKeyDown}
        aria-label="Hours"
      />
      <span className="kaper-time-input__unit" aria-hidden="true">hr</span>
      <input
        className="kaper-time-input__field"
        type="text"
        inputMode="numeric"
        placeholder="0"
        maxLength={3}
        disabled={disabled}
        value={minutesText}
        onChange={onMinutesInput}
        onKeyDown={onKeyDown}
        aria-label="Minutes"
      />
      <span className="kaper-time-input__unit" aria-hidden="true">min</span>
    </div>
  );
}
