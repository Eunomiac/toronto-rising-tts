import type { ReactElement, ReactNode } from "react";

export const linesFromText = (text: string): string[] =>
  text.split(/\r?\n/).map((line) => line.trimEnd()).filter((line) => line.trim() !== "");

export const textFromLines = (lines: readonly string[]): string => lines.join("\n");

type FieldProps = {
  readonly label: string;
  readonly hint?: string;
  readonly wide?: boolean;
  readonly children: ReactNode;
};

export const Field = ({ label, hint, wide = false, children }: FieldProps): ReactElement => (
  <label className={`sheet-field${wide ? " wide" : ""}`}>
    <span className="sheet-field-label">{label}</span>
    {children}
    {hint ? <span className="sheet-field-hint">{hint}</span> : null}
  </label>
);

type TextProps = {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly placeholder?: string;
  readonly disabled?: boolean;
  readonly type?: "text" | "date";
};

export const TextInput = ({ value, onChange, placeholder, disabled, type = "text" }: TextProps): ReactElement => (
  <input
    className="sheet-input"
    type={type}
    value={value}
    placeholder={placeholder}
    disabled={disabled}
    onChange={(event) => onChange(event.target.value)}
  />
);

type AreaProps = {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly rows?: number;
  readonly placeholder?: string;
};

/** One sheet line per textarea line. */
export const LinesInput = ({ value, onChange, rows = 4, placeholder }: AreaProps): ReactElement => (
  <textarea
    className="sheet-input sheet-lines"
    rows={rows}
    value={value}
    placeholder={placeholder}
    onChange={(event) => onChange(event.target.value)}
  />
);

type NumberProps = {
  readonly value: number;
  readonly onChange: (value: number) => void;
  readonly min?: number;
  readonly max?: number;
  readonly disabled?: boolean;
};

const clampInt = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, Math.floor(Number.isFinite(value) ? value : min)));

export const NumberInput = ({ value, onChange, min = 0, max = 99, disabled }: NumberProps): ReactElement => (
  <span className="sheet-number">
    <button type="button" tabIndex={-1} disabled={disabled || value <= min} onClick={() => onChange(clampInt(value - 1, min, max))}>−</button>
    <input
      className="sheet-input"
      type="number"
      value={value}
      min={min}
      max={max}
      disabled={disabled}
      onChange={(event) => onChange(clampInt(Number(event.target.value), min, max))}
    />
    <button type="button" tabIndex={-1} disabled={disabled || value >= max} onClick={() => onChange(clampInt(value + 1, min, max))}>+</button>
  </span>
);

export type SelectOption = { readonly value: string; readonly label: string; readonly disabled?: boolean };

type SelectProps = {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly options: readonly SelectOption[];
  readonly disabled?: boolean;
};

export const SelectInput = ({ value, onChange, options, disabled }: SelectProps): ReactElement => (
  <select className="sheet-input" value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
    {options.map((option) => (
      <option key={option.value} value={option.value} disabled={option.disabled}>{option.label}</option>
    ))}
  </select>
);

type CheckProps = {
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
  readonly label: string;
};

export const CheckInput = ({ checked, onChange, label }: CheckProps): ReactElement => (
  <label className="sheet-check">
    <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    <span>{label}</span>
  </label>
);
