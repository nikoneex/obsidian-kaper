import { SectionProps } from './draft';

export function DetailsSection({ draft, update }: SectionProps) {
  return (
    <section className="kaper-form__section">
      <h3 className="kaper-form__section-label">Details</h3>
      <div className="kaper-form__field">
        <label>Source URL</label>
        <input
          className="kaper-form__input"
          type="url"
          placeholder="https://…"
          value={draft.source}
          onChange={(e) => update({ ...draft, source: e.target.value })}
        />
      </div>
    </section>
  );
}
