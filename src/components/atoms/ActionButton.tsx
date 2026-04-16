import type { JSX } from 'solid-js'
import { Focusable } from '../../navigation'
import styles from './ActionButton.module.css'

export type ActionButtonVariant = 'primary' | 'destructive'

interface ActionButtonProps {
  focusKey: string
  onPress: () => void
  variant?: ActionButtonVariant
  children: JSX.Element
}

/**
 * Focusable button atom — indivisible actionable element.
 * Wraps spatial-navigation Focusable + a native button with focus-ring styling.
 * Presentational: action via onPress callback, label via children.
 */
export default function ActionButton(props: ActionButtonProps) {
  return (
    <Focusable focusKey={props.focusKey} onEnterPress={() => props.onPress()} as="div">
      {({ focused }: { focused: () => boolean }) => (
        <button
          class={`${styles.button} ${styles[props.variant ?? 'primary']} ${focused() ? 'focused' : ''}`}
          onClick={() => props.onPress()}
        >
          {props.children}
        </button>
      )}
    </Focusable>
  )
}
