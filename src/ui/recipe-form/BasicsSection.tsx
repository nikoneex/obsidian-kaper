import { useRef } from 'react';
import { AssetIO } from '../../assets';
import { TagInput } from '../TagInput';
import { TimeInput } from '../TimeInput';
import { RecipeDraft, SectionProps } from './draft';
import { pickAndSaveImage } from './image-upload';

interface BasicsSectionProps extends SectionProps {
  assets: AssetIO;
  filePath: string;
}

export function BasicsSection({ draft, update, assets, filePath }: BasicsSectionProps) {
  // The vault write awaits, so the captured `draft` can go stale if the user
  // edits during the upload. Merge into the latest draft from this ref.
  const draftRef = useRef(draft);
  draftRef.current = draft;

  const pickCover = async (input: HTMLInputElement) => {
    const coverImage = await pickAndSaveImage(assets, filePath, input, 'cover');
    if (!coverImage) return;
    update({ ...draftRef.current, coverImage });
  };

  return (
    <section className="kaper-form__section">
      <h3 className="kaper-form__section-label">Basics</h3>

      <div className="kaper-form__row">
        <div className="kaper-form__field">
          <label>Servings</label>
          <input
            className="kaper-form__input kaper-form__input--narrow"
            type="number"
            min={1}
            value={draft.servings}
            onChange={(e) => update({ ...draft, servings: Number(e.target.value) || 1 })}
          />
        </div>
        <div className="kaper-form__field">
          <label>Difficulty</label>
          <select
            className="kaper-form__select"
            value={draft.difficulty}
            onChange={(e) =>
              update({ ...draft, difficulty: e.target.value as RecipeDraft['difficulty'] })
            }
          >
            <option value="">—</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
      </div>

      <div className="kaper-form__row">
        <div className="kaper-form__field">
          <label htmlFor="recipe-prep">Prep time</label>
          <TimeInput
            id="recipe-prep"
            value={draft.timePrep}
            onChange={(v) => update({ ...draft, timePrep: v })}
          />
        </div>
        <div className="kaper-form__field">
          <label htmlFor="recipe-cook">Cook time</label>
          <TimeInput
            id="recipe-cook"
            value={draft.timeCook}
            onChange={(v) => update({ ...draft, timeCook: v })}
          />
        </div>
      </div>

      <div className="kaper-form__field">
        <label>Tags</label>
        <TagInput value={draft.tags} onChange={(next) => update({ ...draft, tags: next })} />
      </div>

      <div className="kaper-form__field">
        <label>Cover image</label>
        {draft.coverImage ? (
          <div className="kaper-form__image-row">
            <img
              className="kaper-form__image-thumb"
              src={assets.resolveImage(draft.coverImage, filePath)}
              alt=""
            />
            <button
              type="button"
              className="kaper-form__remove-btn"
              onClick={() => update({ ...draft, coverImage: '' })}
              aria-label="Remove cover image"
            >
              ×
            </button>
          </div>
        ) : (
          <label className="kaper-form__image-add">
            + Cover image
            <input
              type="file"
              accept="image/*"
              className="kaper-form__image-input"
              onChange={(e) => void pickCover(e.currentTarget)}
            />
          </label>
        )}
      </div>
    </section>
  );
}
