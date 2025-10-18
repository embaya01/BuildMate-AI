import type { CostItem, CostCategoryKey, EquipmentMode } from '../types';
import { CategorySection } from './CategorySection';

interface EquipmentSectionProps {
  mode: EquipmentMode;
  singleTotal: number;
  items: CostItem[];
  onModeChange: (mode: EquipmentMode) => void;
  onSingleTotalChange: (value: number) => void;
  onAddItem: (category: CostCategoryKey, item: CostItem) => void;
  onUpdateItem: (category: CostCategoryKey, itemId: string, updates: Partial<CostItem>) => void;
  onRemoveItem: (category: CostCategoryKey, itemId: string) => void;
}

const EQUIPMENT_CATEGORY_KEY: CostCategoryKey = 'equipment';

const modeOptions: Array<{ value: EquipmentMode; label: string }> = [
  { value: 'single', label: 'Single Total' },
  { value: 'itemized', label: 'Itemized' },
];

export const EquipmentSection = ({
  mode,
  singleTotal,
  items,
  onModeChange,
  onSingleTotalChange,
  onAddItem,
  onUpdateItem,
  onRemoveItem,
}: EquipmentSectionProps) => {
  return (
    <section className="equipment-section">
      <header className="equipment-section__header">
        <div>
          <h3>Equipment</h3>
          <p>Choose between a single lump-sum cost or itemize each piece of equipment.</p>
        </div>
        <div className="equipment-toggle" role="radiogroup" aria-label="Equipment input mode">
          {modeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={mode === option.value}
              className={
                mode === option.value ? 'equipment-toggle__button is-active' : 'equipment-toggle__button'
              }
              onClick={() => onModeChange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </header>

      {mode === 'single' ? (
        <div className="equipment-single">
          <label className="field field--horizontal">
            <span>Total Equipment Cost</span>
            <input
              className="input input--compact align-right"
              type="number"
              min={0}
              step={50}
              value={singleTotal}
              onChange={(event) => onSingleTotalChange(Number(event.target.value) || 0)}
            />
          </label>
        </div>
      ) : (
        <CategorySection
          categoryKey={EQUIPMENT_CATEGORY_KEY}
          label="Equipment"
          items={items}
          onAdd={onAddItem}
          onUpdate={onUpdateItem}
          onRemove={onRemoveItem}
        />
      )}
    </section>
  );
};
