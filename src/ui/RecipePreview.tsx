import { RecipeModel } from '../parser/types';

interface RecipePreviewProps {
  recipe: RecipeModel;
}

const IconUsers = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M18 21a8 8 0 0 0-16 0" />
    <circle cx="10" cy="8" r="5" />
    <path d="M22 20c0-3.37-2-6.5-4-8a5 5 0 0 0-.45-8.3" />
  </svg>
);

const IconTimer = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <line x1="10" x2="14" y1="2" y2="2" />
    <line x1="12" x2="15" y1="14" y2="11" />
    <circle cx="12" cy="14" r="8" />
  </svg>
);

export function RecipePreview({ recipe }: RecipePreviewProps) {
  const groupEntries = Object.entries(recipe.ingredients);
  const hasMultipleGroups = groupEntries.length > 1;
  const showServings = recipe.servings > 0;
  const showCookTime = !!recipe.time?.cook;
  const showDifficulty = !!recipe.difficulty;

  return (
    <article className="kaper-preview">
      <header className="kaper-preview__header">
        <h1 className="kaper-preview__title">{recipe.title}</h1>

        <div className="kaper-preview__meta">
          {showServings && (
            <span className="kaper-preview__meta-item">
              <IconUsers />
              {recipe.servings} servings
            </span>
          )}
          {showCookTime && (
            <>
              {showServings && <span className="kaper-preview__meta-divider" aria-hidden="true" />}
              <span className="kaper-preview__meta-item">
                <IconTimer />
                {recipe.time?.cook}
              </span>
            </>
          )}
          {showDifficulty && (
            <>
              {(showServings || showCookTime) && (
                <span className="kaper-preview__meta-divider" aria-hidden="true" />
              )}
              <span
                className={`kaper-preview__meta-item kaper-preview__difficulty kaper-preview__difficulty--${recipe.difficulty}`}
              >
                <span className="kaper-preview__difficulty-label">{recipe.difficulty}</span>
                <span className="kaper-preview__difficulty-bars" aria-hidden="true">
                  <span className="kaper-preview__difficulty-bar" />
                  <span className="kaper-preview__difficulty-bar" />
                  <span className="kaper-preview__difficulty-bar" />
                </span>
              </span>
            </>
          )}
        </div>

        {recipe.tags && recipe.tags.length > 0 && (
          <div className="kaper-preview__tags">
            {recipe.tags.map((tag) => (
              <span key={tag} className="kaper-preview__tag">
                {tag}
              </span>
            ))}
          </div>
        )}
      </header>

      <div className="kaper-preview__body">
        <section className="kaper-preview__section">
          <h2 className="kaper-preview__section-title">Ingredients</h2>
          {groupEntries.map(([groupName, items]) => (
            <div key={groupName} className="kaper-preview__ingredient-group">
              {hasMultipleGroups && (
                <h3 className="kaper-preview__group-name">{groupName}</h3>
              )}
              <ul className="kaper-preview__ingredient-list">
                {items.map((item, idx) => (
                  <li
                    key={idx}
                    className={
                      'kaper-preview__ingredient' +
                      (item.optional ? ' kaper-preview__ingredient--optional' : '')
                    }
                  >
                    <span className="kaper-preview__ingredient-amount">
                      {item.amount} {item.unit}
                    </span>
                    <span className="kaper-preview__ingredient-name">{item.name}</span>
                    {item.optional && <i>(optional)</i>}
                    {item.sub && (
                      <span className="kaper-preview__ingredient-sub">or {item.sub}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        <section className="kaper-preview__section">
          <h2 className="kaper-preview__section-title">Instructions</h2>
          <ol className="kaper-preview__steps">
            {recipe.steps.map((step, idx) => (
              <li key={idx} className="kaper-preview__step">
                <div className="kaper-preview__step-header">
                  <span className="kaper-preview__step-num" aria-hidden="true">
                    {idx + 1}
                  </span>
                  <h3 className="kaper-preview__step-title">{step.title}</h3>
                  {step.duration && (
                    <span className="kaper-preview__step-duration">{step.duration}</span>
                  )}
                </div>
                {step.note && <p className="kaper-preview__step-note">{step.note}</p>}
                {step.technique && (
                  <p className="kaper-preview__step-technique">{step.technique}</p>
                )}
                {step.tip && (
                  <div className="kaper-preview__callout kaper-preview__callout--tip">
                    <strong>Tip</strong> {step.tip}
                  </div>
                )}
                {step.warning && (
                  <div className="kaper-preview__callout kaper-preview__callout--warning">
                    <strong>Note</strong> {step.warning}
                  </div>
                )}
              </li>
            ))}
          </ol>
        </section>
      </div>
    </article>
  );
}
