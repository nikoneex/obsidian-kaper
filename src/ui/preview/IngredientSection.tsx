import { IngredientGroup } from '../../recipe/parser/types';
import { nonEmptyIngredientGroups } from '../../recipe/model';
import { IngredientText } from '../shared/IngredientText';

/**
 * The "Ingredients" section of the recipe preview. Filters out empty groups,
 * shows group headings only when there's more than one non-empty group, and
 * renders nothing when the recipe has no ingredients at all.
 */
export function IngredientSection({ ingredients }: { ingredients: IngredientGroup }) {
  const groupEntries = nonEmptyIngredientGroups(ingredients);
  if (groupEntries.length === 0) return null;
  const hasMultipleGroups = groupEntries.length > 1;

  return (
    <section className="kaper-preview__section">
      <h2 className="kaper-preview__section-title">Ingredients</h2>
      {groupEntries.map(([groupName, items]) => (
        <div key={groupName} className="kaper-preview__ingredient-group">
          {hasMultipleGroups && <h3 className="kaper-preview__group-name">{groupName}</h3>}
          <ul className="kaper-preview__ingredient-list">
            {items.map((item, idx) => (
              <li
                key={`${groupName}-${idx}-${item.name}`}
                className={
                  'kaper-preview__ingredient' +
                  (item.optional ? ' kaper-preview__ingredient--optional' : '')
                }
              >
                <IngredientText block="kaper-preview" item={item} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
