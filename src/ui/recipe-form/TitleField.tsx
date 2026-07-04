import { SectionProps } from './draft';

/** The recipe-title input row, shared by the desktop form and the mobile modal. */
export function TitleField({ draft, update }: SectionProps) {
  return (
    <div className="kaper-form__title-row">
      <input
        className="kaper-form__title-input"
        type="text"
        placeholder="Recipe title…"
        value={draft.title}
        autoComplete="off"
        onChange={(e) => update({ ...draft, title: e.target.value })}
      />
    </div>
  );
}
