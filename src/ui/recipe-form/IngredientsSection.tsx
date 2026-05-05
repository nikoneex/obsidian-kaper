import { arrayMove } from '@dnd-kit/sortable';
import {
  IngredientDraft,
  IngredientGroupDraft,
  SectionProps,
  emptyIngredient,
} from './draft';
import { IngredientList } from './IngredientList';

export function IngredientsSection({ draft, update }: SectionProps) {
  const updateGroup = (gi: number, group: IngredientGroupDraft) => {
    const groups = [...draft.ingredientGroups];
    groups[gi] = group;
    update({ ...draft, ingredientGroups: groups });
  };

  const addGroup = () =>
    update({
      ...draft,
      ingredientGroups: [
        ...draft.ingredientGroups,
        { groupName: '', ingredients: [emptyIngredient()] },
      ],
    });

  const removeGroup = (gi: number) =>
    update({
      ...draft,
      ingredientGroups: draft.ingredientGroups.filter((_, i) => i !== gi),
    });

  const addIngredient = (gi: number) => {
    const group = draft.ingredientGroups[gi];
    updateGroup(gi, { ...group, ingredients: [...group.ingredients, emptyIngredient()] });
  };

  const updateIngredient = (gi: number, ii: number, ing: IngredientDraft) => {
    const group = draft.ingredientGroups[gi];
    const ingredients = [...group.ingredients];
    ingredients[ii] = ing;
    updateGroup(gi, { ...group, ingredients });
  };

  const removeIngredient = (gi: number, ii: number) => {
    const group = draft.ingredientGroups[gi];
    updateGroup(gi, {
      ...group,
      ingredients: group.ingredients.filter((_, i) => i !== ii),
    });
  };

  const reorderIngredient = (gi: number, oldIndex: number, newIndex: number) => {
    if (oldIndex === newIndex) return;
    const group = draft.ingredientGroups[gi];
    updateGroup(gi, { ...group, ingredients: arrayMove(group.ingredients, oldIndex, newIndex) });
  };

  return (
    <section className="kaper-form__section">
      <div className="kaper-form__section-header">
        <h3 className="kaper-form__section-label">Ingredients</h3>
        <button type="button" className="kaper-form__add-btn" onClick={addGroup}>
          + Group
        </button>
      </div>

      {draft.ingredientGroups.map((group, gi) => (
        <div key={gi} className="kaper-form__ingredient-group">
          <div className="kaper-form__group-header">
            <input
              className="kaper-form__group-name"
              type="text"
              placeholder="Group name (e.g. sauce)"
              value={group.groupName}
              onChange={(e) => updateGroup(gi, { ...group, groupName: e.target.value })}
            />
            {draft.ingredientGroups.length > 1 && (
              <button
                type="button"
                className="kaper-form__remove-btn"
                onClick={() => removeGroup(gi)}
                aria-label="Remove group"
              >
                ×
              </button>
            )}
          </div>

          <div className="kaper-form__ingredient-list">
            <IngredientList
              groupIndex={gi}
              ingredients={group.ingredients}
              onUpdate={updateIngredient}
              onRemove={removeIngredient}
              onReorder={reorderIngredient}
            />
            <button
              type="button"
              className="kaper-form__add-ingredient-btn"
              onClick={() => addIngredient(gi)}
            >
              + Ingredient
            </button>
          </div>
        </div>
      ))}
    </section>
  );
}
