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
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { IngredientDraft } from './draft';
import { IconGrip } from '../icons';

// ── Presentational row (private) ────────────────────────────────────────────

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
        onChange={(e) =>
          onUpdate(groupIndex, ingredientIndex, { ...ingredient, unit: e.target.value })
        }
      />
      <input
        className="kaper-form__input kaper-form__input--name"
        type="text"
        placeholder="Ingredient name"
        value={ingredient.name}
        onChange={(e) =>
          onUpdate(groupIndex, ingredientIndex, { ...ingredient, name: e.target.value })
        }
      />
      <input
        className="kaper-form__input kaper-form__input--note"
        type="text"
        placeholder="e.g. finely chopped"
        value={ingredient.note ?? ''}
        onChange={(e) =>
          onUpdate(groupIndex, ingredientIndex, {
            ...ingredient,
            note: e.target.value || undefined,
          })
        }
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

// ── DnD-aware row wrapper (private) ─────────────────────────────────────────

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

// ── Public: draggable list of ingredients for one group ─────────────────────

interface IngredientListProps {
  groupIndex: number;
  ingredients: IngredientDraft[];
  onUpdate: (gi: number, ii: number, ing: IngredientDraft) => void;
  onRemove: (gi: number, ii: number) => void;
  onReorder: (gi: number, oldIndex: number, newIndex: number) => void;
}

export function IngredientList({
  groupIndex,
  ingredients,
  onUpdate,
  onRemove,
  onReorder,
}: IngredientListProps) {
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

  const activeIngredient = activeId ? (ingredients.find((i) => i._id === activeId) ?? null) : null;
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
            <div className="kaper-form__drag-overlay" style={{ width: activeWidth ?? undefined }}>
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
        activeDocument.body,
      )}
    </DndContext>
  );
}
