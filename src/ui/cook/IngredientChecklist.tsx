import { IngredientGroup } from '../../recipe/parser/types';
import { nonEmptyIngredientGroups } from '../../recipe/model';
import { IngredientText } from '../shared/IngredientText';

interface IngredientChecklistProps {
  /** Already scaled to the chosen servings — this component only displays. */
  ingredients: IngredientGroup;
  checked: ReadonlySet<string>;
  onToggle: (key: string) => void;
}

/**
 * Stable identity for a checklist row: group plus position. Position rather
 * than name so two same-named ingredients in a group stay distinct, and so a
 * row keeps its tick when the amounts rescale around it.
 */
export function ingredientKey(groupName: string, index: number): string {
  return `${groupName}:${index}`;
}

/**
 * The grocery-list style ingredients page shown before step 1: every
 * ingredient with a checkbox to tick off as it's gathered. Follows the same
 * grouping rules as the preview's IngredientSection — empty groups dropped,
 * group headings only when there's more than one, nothing at all when the
 * recipe has no ingredients.
 */
export function IngredientChecklist({ ingredients, checked, onToggle }: IngredientChecklistProps) {
  const groups = nonEmptyIngredientGroups(ingredients);
  if (groups.length === 0) return null;
  const hasMultipleGroups = groups.length > 1;

  return (
    <div className="kaper-cook__ingredients">
      {groups.map(([groupName, items]) => (
        <div key={groupName} className="kaper-cook__ingredient-group">
          {hasMultipleGroups && <h2 className="kaper-cook__ingredient-group-name">{groupName}</h2>}
          {/* Explicit role: Safari drops list semantics once list-style is none. */}
          <ul className="kaper-cook__ingredient-list" role="list">
            {items.map((item, idx) => {
              const key = ingredientKey(groupName, idx);
              const isChecked = checked.has(key);
              return (
                <li key={key}>
                  <label
                    className={
                      'kaper-cook__ingredient' +
                      (isChecked ? ' kaper-cook__ingredient--checked' : '') +
                      (item.optional ? ' kaper-cook__ingredient--optional' : '')
                    }
                  >
                    <input type="checkbox" checked={isChecked} onChange={() => onToggle(key)} />
                    <span className="kaper-cook__ingredient-text">
                      <IngredientText block="kaper-cook" item={item} />
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
