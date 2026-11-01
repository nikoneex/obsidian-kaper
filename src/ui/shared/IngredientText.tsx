import { IngredientAmount } from '../../recipe/parser/types';

/**
 * One ingredient as the cook reads it: amount and unit, name with its prep
 * note, an "(optional)" marker, and a substitution. Shared by the recipe
 * preview and the Cook mode checklist; `block` is the host surface's BEM block
 * (e.g. `kaper-preview` or `kaper-cook`) so each sizes and spaces the parts via
 * its own CSS while the markup, ordering, and the ", …" / "or …" joiners stay
 * defined once.
 */
export function IngredientText({ block, item }: { block: string; item: IngredientAmount }) {
  return (
    <>
      <span className={`${block}__ingredient-amount`}>
        {item.amount} {item.unit}
      </span>
      <span className={`${block}__ingredient-name`}>
        {item.name}
        {/* Nested rather than a sibling so the comma sits tight against the
            name — the host row is a flex row with a gap between children. */}
        {item.note && <span className={`${block}__ingredient-note`}>, {item.note}</span>}
      </span>
      {item.optional && <i>(optional)</i>}
      {item.sub && <span className={`${block}__ingredient-sub`}>or {item.sub}</span>}
    </>
  );
}
