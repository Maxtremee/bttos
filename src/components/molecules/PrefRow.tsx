import { Focusable } from "../../navigation";
import styles from "./PrefRow.module.css";

interface PrefRowProps {
  focusKey: string;
  label: string;
  value: string;
  /** When true, value renders in accent color; when false, disabled color. */
  active: boolean;
  onToggle: () => void;
}

/**
 * Preference toggle row molecule — composes a focusable container
 * with a label atom and a value atom. Presentational: data in via
 * props, toggle out via callback.
 */
export default function PrefRow(props: PrefRowProps) {
  return (
    <Focusable focusKey={props.focusKey} onEnterPress={() => props.onToggle()} as="div">
      {({ focused }) => (
        <div class={`${styles.row} ${focused() ? "focused" : ""}`}>
          <span class={styles.label}>{props.label}</span>
          <span class={`${styles.value} ${props.active ? styles.active : styles.inactive}`}>
            {props.value}
          </span>
        </div>
      )}
    </Focusable>
  );
}
