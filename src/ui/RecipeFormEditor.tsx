import { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { IngredientAmount, RecipeModel, RecipeStep } from '../parser/types';

interface RecipeFormEditorProps {
  recipe: RecipeModel;
  onChange: (recipe: RecipeModel) => void;
}

interface IngredientDraft extends IngredientAmount {
  _id: string;
}

interface IngredientGroupDraft {
  groupName: string;
  ingredients: IngredientDraft[];
}

interface RecipeDraft {
  title: string;
  servings: number;
  difficulty: '' | 'easy' | 'medium' | 'hard';
  tagsInput: string;
  timePrep: string;
  timeCook: string;
  source: string;
  ingredientGroups: IngredientGroupDraft[];
  steps: RecipeStep[];
}

let nextIngredientId = 0;
function newIngredientId(): string {
  return `ing-${++nextIngredientId}`;
}

function emptyIngredient(): IngredientDraft {
  return { _id: newIngredientId(), amount: 0, unit: '', name: '' };
}

function recipeToDraft(recipe: RecipeModel): RecipeDraft {
  const groupEntries = Object.entries(recipe.ingredients);
  const ingredientGroups: IngredientGroupDraft[] =
    groupEntries.length === 0
      ? [{ groupName: 'main', ingredients: [emptyIngredient()] }]
      : groupEntries.map(([groupName, ingredients]) => ({
          groupName,
          ingredients: ingredients.map((i) => ({ ...i, _id: newIngredientId() })),
        }));

  return {
    title: recipe.title,
    servings: recipe.servings,
    difficulty: recipe.difficulty ?? '',
    tagsInput: recipe.tags?.join(', ') ?? '',
    timePrep: recipe.time?.prep ?? '',
    timeCook: recipe.time?.cook ?? '',
    source: recipe.source ?? '',
    ingredientGroups,
    steps: recipe.steps.map((s) => ({ ...s })),
  };
}

function compact<T extends object>(obj: T): Partial<T> {
  const result: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === '' || v === false) continue;
    (result as Record<string, unknown>)[k] = v;
  }
  return result;
}

function draftToRecipe(draft: RecipeDraft, original: RecipeModel): RecipeModel {
  const ingredients: Record<string, IngredientAmount[]> = {};
  for (const group of draft.ingredientGroups) {
    if (!group.groupName.trim()) continue;
    ingredients[group.groupName] = group.ingredients
      .filter((i) => i.name.trim())
      .map((i) =>
        compact({
          amount: i.amount,
          unit: i.unit,
          name: i.name,
          sub: i.sub,
          optional: i.optional,
        }),
      ) as IngredientAmount[];
  }

  const tags = draft.tagsInput
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  const time = compact({ prep: draft.timePrep, cook: draft.timeCook });

  const steps = draft.steps
    .filter((s) => s.title.trim())
    .map((s) =>
      compact({
        title: s.title,
        ingredients: s.ingredients,
        duration: s.duration,
        note: s.note,
        tip: s.tip,
        warning: s.warning,
        technique: s.technique,
        image: s.image,
      }),
    ) as RecipeModel['steps'];

  return {
    ...original,
    version: 1,
    title: draft.title,
    servings: draft.servings,
    difficulty: draft.difficulty || undefined,
    tags: tags.length ? tags : undefined,
    time: Object.keys(time).length ? (time as RecipeModel['time']) : undefined,
    source: draft.source || undefined,
    ingredients,
    steps,
    capabilities: original.capabilities,
  };
}

const IconGrip = () => (
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
    <circle cx="9" cy="6" r="1" />
    <circle cx="9" cy="12" r="1" />
    <circle cx="9" cy="18" r="1" />
    <circle cx="15" cy="6" r="1" />
    <circle cx="15" cy="12" r="1" />
    <circle cx="15" cy="18" r="1" />
  </svg>
);

interface IngredientRowProps {
  ingredient: IngredientDraft;
  groupIndex: number;
  ingredientIndex: number;
  onUpdate: (gi: number, ii: number, ing: IngredientDraft) => void;
  onRemove: (gi: number, ii: number) => void;
  setNodeRef?: (node: HTMLElement | null) => void;
  setHandleRef?: (node: HTMLElement | null) => void;
  style?: React.CSSProperties;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
}

function IngredientRow({
  ingredient,
  groupIndex,
  ingredientIndex,
  onUpdate,
  onRemove,
  setNodeRef,
  setHandleRef,
  style,
  dragHandleProps,
}: IngredientRowProps) {
  return (
    <div ref={setNodeRef} style={style} className="kaper-form__ingredient-row">
      <button
        ref={setHandleRef}
        type="button"
        className="kaper-form__drag-handle"
        {...dragHandleProps}
        aria-label="Drag to reorder ingredient"
      >
        <IconGrip />
      </button>
      <input
        className="kaper-form__input kaper-form__input--amount"
        type="number"
        min={0}
        step={0.1}
        placeholder="Qty"
        value={ingredient.amount || ''}
        onChange={(e) =>
          onUpdate(groupIndex, ingredientIndex, {
            ...ingredient,
            amount: Number(e.target.value) || 0,
          })
        }
      />
      <input
        className="kaper-form__input kaper-form__input--unit"
        type="text"
        placeholder="Unit"
        value={ingredient.unit}
        onChange={(e) => onUpdate(groupIndex, ingredientIndex, { ...ingredient, unit: e.target.value })}
      />
      <input
        className="kaper-form__input kaper-form__input--name"
        type="text"
        placeholder="Ingredient name"
        value={ingredient.name}
        onChange={(e) => onUpdate(groupIndex, ingredientIndex, { ...ingredient, name: e.target.value })}
      />
      <input
        className="kaper-form__input kaper-form__input--sub"
        type="text"
        placeholder="or…"
        value={ingredient.sub ?? ''}
        onChange={(e) =>
          onUpdate(groupIndex, ingredientIndex, {
            ...ingredient,
            sub: e.target.value || undefined,
          })
        }
      />
      <button
        type="button"
        className="kaper-form__remove-btn"
        onClick={() => onRemove(groupIndex, ingredientIndex)}
        aria-label="Remove ingredient"
      >
        ×
      </button>
    </div>
  );
}

interface SortableIngredientRowProps {
  id: string;
  ingredient: IngredientDraft;
  groupIndex: number;
  ingredientIndex: number;
  onUpdate: (gi: number, ii: number, ing: IngredientDraft) => void;
  onRemove: (gi: number, ii: number) => void;
}

function SortableIngredientRow({
  id,
  ingredient,
  groupIndex,
  ingredientIndex,
  onUpdate,
  onRemove,
}: SortableIngredientRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
  };

  return (
    <IngredientRow
      ingredient={ingredient}
      groupIndex={groupIndex}
      ingredientIndex={ingredientIndex}
      onUpdate={onUpdate}
      onRemove={onRemove}
      setNodeRef={setNodeRef}
      setHandleRef={setActivatorNodeRef}
      style={style}
      dragHandleProps={{ ...attributes, ...listeners }}
    />
  );
}

interface SortableIngredientListProps {
  groupIndex: number;
  ingredients: IngredientDraft[];
  onUpdate: (gi: number, ii: number, ing: IngredientDraft) => void;
  onRemove: (gi: number, ii: number) => void;
  onReorder: (gi: number, oldIndex: number, newIndex: number) => void;
}

function SortableIngredientList({
  groupIndex,
  ingredients,
  onUpdate,
  onRemove,
  onReorder,
}: SortableIngredientListProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeWidth, setActiveWidth] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const ids = ingredients.map((i) => i._id);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));

    let width: number | null = null;
    const target = event.activatorEvent?.target;
    if (target instanceof Element) {
      const row = target.closest('.kaper-form__ingredient-row');
      if (row instanceof HTMLElement) {
        width = row.getBoundingClientRect().width;
      }
    }
    if (!width) {
      width = event.active.rect.current.initial?.width ?? null;
    }
    setActiveWidth(width);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    setActiveWidth(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex >= 0 && newIndex >= 0) {
      onReorder(groupIndex, oldIndex, newIndex);
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setActiveWidth(null);
  };

  const activeIngredient = activeId ? ingredients.find((i) => i._id === activeId) ?? null : null;
  const activeIndex = activeId ? ingredients.findIndex((i) => i._id === activeId) : -1;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {ingredients.map((ing, ii) => (
          <SortableIngredientRow
            key={ing._id}
            id={ing._id}
            ingredient={ing}
            groupIndex={groupIndex}
            ingredientIndex={ii}
            onUpdate={onUpdate}
            onRemove={onRemove}
          />
        ))}
      </SortableContext>
      {createPortal(
        <DragOverlay>
          {activeIngredient && (
            <div
              className="kaper-form__drag-overlay"
              style={{ width: activeWidth ?? undefined }}
            >
              <IngredientRow
                ingredient={activeIngredient}
                groupIndex={groupIndex}
                ingredientIndex={activeIndex}
                onUpdate={onUpdate}
                onRemove={onRemove}
                style={{ width: '100%' }}
              />
            </div>
          )}
        </DragOverlay>,
        document.body,
      )}
    </DndContext>
  );
}

export function RecipeFormEditor({ recipe, onChange }: RecipeFormEditorProps) {
  const [draft, setDraft] = useState<RecipeDraft>(() => recipeToDraft(recipe));

  const update = (next: RecipeDraft) => {
    setDraft(next);
    onChange(draftToRecipe(next, recipe));
  };

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

  const addStep = () =>
    update({ ...draft, steps: [...draft.steps, { title: '' }] });

  const updateStep = (si: number, step: RecipeStep) => {
    const steps = [...draft.steps];
    steps[si] = step;
    update({ ...draft, steps });
  };

  const removeStep = (si: number) =>
    update({ ...draft, steps: draft.steps.filter((_, i) => i !== si) });

  const moveStep = (from: number, to: number) => {
    if (to < 0 || to >= draft.steps.length) return;
    update({ ...draft, steps: arrayMove(draft.steps, from, to) });
  };

  return (
    <form className="kaper-form" onSubmit={(e) => e.preventDefault()}>
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
            <label>Prep time</label>
            <input
              className="kaper-form__input kaper-form__input--time"
              type="text"
              placeholder="e.g. 15m"
              value={draft.timePrep}
              onChange={(e) => update({ ...draft, timePrep: e.target.value })}
            />
          </div>
          <div className="kaper-form__field">
            <label>Cook time</label>
            <input
              className="kaper-form__input kaper-form__input--time"
              type="text"
              placeholder="e.g. 30m"
              value={draft.timeCook}
              onChange={(e) => update({ ...draft, timeCook: e.target.value })}
            />
          </div>
        </div>

        <div className="kaper-form__field">
          <label>Tags</label>
          <input
            className="kaper-form__input"
            type="text"
            placeholder="pasta, italian, quick…"
            value={draft.tagsInput}
            onChange={(e) => update({ ...draft, tagsInput: e.target.value })}
          />
        </div>
      </section>

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
              <SortableIngredientList
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

      <section className="kaper-form__section">
        <h3 className="kaper-form__section-label">Steps</h3>

        {draft.steps.map((step, si) => (
          <div key={si} className="kaper-form__step">
            <div className="kaper-form__step-header">
              <span className="kaper-form__step-num">{si + 1}</span>
              <input
                className="kaper-form__input kaper-form__input--step-title"
                type="text"
                placeholder="Step title"
                value={step.title}
                onChange={(e) => updateStep(si, { ...step, title: e.target.value })}
              />
              <input
                className="kaper-form__input kaper-form__input--duration"
                type="text"
                placeholder="Duration"
                value={step.duration ?? ''}
                onChange={(e) =>
                  updateStep(si, { ...step, duration: e.target.value || undefined })
                }
              />
              <div className="kaper-form__step-actions">
                <button
                  type="button"
                  className="kaper-form__icon-btn"
                  onClick={() => moveStep(si, si - 1)}
                  disabled={si === 0}
                  aria-label="Move up"
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="kaper-form__icon-btn"
                  onClick={() => moveStep(si, si + 1)}
                  disabled={si === draft.steps.length - 1}
                  aria-label="Move down"
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="kaper-form__remove-btn"
                  onClick={() => removeStep(si)}
                  aria-label="Remove step"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="kaper-form__step-body">
              <div className="kaper-form__field">
                <label>Note</label>
                <textarea
                  className="kaper-form__textarea"
                  rows={2}
                  placeholder="Instructions or note…"
                  value={step.note ?? ''}
                  onChange={(e) =>
                    updateStep(si, { ...step, note: e.target.value || undefined })
                  }
                />
              </div>

              <div className="kaper-form__callout-row">
                <div className="kaper-form__field">
                  <label>Tip</label>
                  <input
                    className="kaper-form__input"
                    type="text"
                    placeholder="Optional tip…"
                    value={step.tip ?? ''}
                    onChange={(e) =>
                      updateStep(si, { ...step, tip: e.target.value || undefined })
                    }
                  />
                </div>
                <div className="kaper-form__field">
                  <label>Warning</label>
                  <input
                    className="kaper-form__input"
                    type="text"
                    placeholder="Optional warning…"
                    value={step.warning ?? ''}
                    onChange={(e) =>
                      updateStep(si, { ...step, warning: e.target.value || undefined })
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        ))}

        <button type="button" className="kaper-form__add-step-btn" onClick={addStep}>
          + Step
        </button>
      </section>

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
    </form>
  );
}
