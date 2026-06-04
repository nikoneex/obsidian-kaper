import { ChangeEvent, KeyboardEvent, MouseEvent, useRef, useState } from 'react';

const HASHTAG_REGEX = /^#+/;

interface TagInputProps {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
}

export function TagInput({
  value,
  onChange,
  placeholder = 'Add tag — Enter or Space to commit',
  suggestions = [],
}: TagInputProps) {
  const [text, setText] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Suggestions filtered by current input text and de-duped against existing chips.
  const token = text.trim().toLowerCase();
  const used = new Set(value.map((c) => c.toLowerCase()));
  const filtered = suggestions
    .filter((s) => {
      const lower = s.toLowerCase();
      return !used.has(lower) && (token === '' || lower.includes(token)) && lower !== token;
    })
    .slice(0, 8);

  const isOpen = isFocused && filtered.length > 0;

  const commitChip = (tag: string) => {
    const cleaned = tag.replace(HASHTAG_REGEX, '');
    if (!cleaned) return;
    const lower = cleaned.toLowerCase();
    if (value.some((c) => c.toLowerCase() === lower)) {
      setText('');
      return;
    }
    onChange([...value, cleaned]);
    setText('');
    setActiveIndex(-1);
  };

  const commitText = () => {
    const trimmed = text.trim().replace(HASHTAG_REGEX, '');
    if (!trimmed) return;
    commitChip(trimmed);
  };

  const removeChip = (tag: string) => {
    onChange(value.filter((t) => t !== tag));
    inputRef.current?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'Enter':
      case ',':
        e.preventDefault();
        if (activeIndex >= 0 && filtered[activeIndex]) {
          commitChip(filtered[activeIndex]);
        } else {
          commitText();
        }
        break;
      case ' ':
        if (text.trim().length > 0) {
          e.preventDefault();
          commitText();
        }
        break;
      case 'Backspace':
        if (text.length === 0 && value.length > 0) {
          e.preventDefault();
          removeChip(value[value.length - 1]);
        }
        break;
      case 'ArrowDown':
        if (filtered.length === 0) return;
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
        break;
      case 'ArrowUp':
        if (filtered.length === 0) return;
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, -1));
        break;
      case 'Escape':
        setText('');
        setActiveIndex(-1);
        break;
    }
  };

  const onChangeInput = (e: ChangeEvent<HTMLInputElement>) => {
    const stripped = e.target.value.replace(HASHTAG_REGEX, '');
    setText(stripped);
    setActiveIndex(-1);
  };

  const onBlur = () => {
    // Delay so a dropdown option's mousedown can fire before we tear it down.
    setTimeout(() => {
      setIsFocused(false);
      commitText();
    }, 150);
  };

  const onSuggestionMouseDown = (e: MouseEvent<HTMLLIElement>, s: string) => {
    e.preventDefault(); // keep focus on the input
    commitChip(s);
    inputRef.current?.focus();
  };

  const focusInput = () => inputRef.current?.focus();

  const wrapperClass = ['kaper-tag-input', isFocused && 'is-focused', isOpen && 'is-open']
    .filter(Boolean)
    .join(' ');

  return (
    <div className={wrapperClass} onClick={focusInput}>
      <div className="kaper-tag-input__chips">
        {value.map((chip) => (
          <span key={chip} className="kaper-tag-input__chip">
            <span className="kaper-tag-input__chip-label">#&nbsp;{chip}</span>
            <button
              type="button"
              className="kaper-tag-input__chip-remove"
              onClick={(e) => {
                e.stopPropagation();
                removeChip(chip);
              }}
              aria-label={`Remove tag ${chip}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          className="kaper-tag-input__field"
          type="text"
          autoComplete="off"
          spellCheck={false}
          placeholder={value.length ? '' : placeholder}
          value={text}
          aria-expanded={isOpen}
          aria-autocomplete="list"
          role="combobox"
          onChange={onChangeInput}
          onFocus={() => setIsFocused(true)}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
        />
      </div>
      {isOpen && (
        <ul className="kaper-tag-input__dropdown" role="listbox" aria-label="Tag suggestions">
          {filtered.map((s, i) => (
            <li
              key={s}
              className={`kaper-tag-input__option ${activeIndex === i ? 'is-active' : ''}`}
              role="option"
              aria-selected={activeIndex === i}
              onMouseDown={(e) => onSuggestionMouseDown(e, s)}
            >
              #{s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
