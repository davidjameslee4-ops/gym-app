// A tiny broadcast: after the stored data is replaced (an import or an undo),
// screens that keep their own copy of a setting reload it.

type Listener = () => void;
const listeners = new Set<Listener>();

export const onDataChanged = (listener: Listener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const emitDataChanged = (): void => {
  listeners.forEach(listener => {
    try {
      listener();
    } catch {}
  });
};
