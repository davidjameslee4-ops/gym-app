// Web only: react-native-web's Alert.alert does nothing, so on the iPhone web app
// confirm dialogs (delete exercise, clear data, ...) would silently do nothing.
// This maps Alert.alert to the browser's own alert / confirm / prompt dialogs.
// On Android/iOS native builds Platform.OS !== 'web', so nothing changes there.
import { Alert, AlertButton, Platform } from 'react-native';

export function installWebAlert() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;

  (Alert as any).alert = (title: string, message?: string, buttons?: AlertButton[]) => {
    const text = [title, message].filter(Boolean).join('\n\n');
    const btns: AlertButton[] = buttons && buttons.length ? buttons : [{ text: 'OK' }];

    if (btns.length === 1) {
      window.alert(text);
      btns[0].onPress?.();
      return;
    }

    let cancel = btns.find((b) => b.style === 'cancel');
    if (!cancel && btns.length === 2) cancel = btns[0];
    const actions = btns.filter((b) => b !== cancel);

    if (actions.length === 1) {
      const label = actions[0].text ? `\n\nOK = ${actions[0].text}` : '';
      if (window.confirm(text + label)) actions[0].onPress?.();
      else cancel?.onPress?.();
      return;
    }

    const list = actions.map((b, i) => `${i + 1}. ${b.text}`).join('\n');
    const answer = window.prompt(`${text}\n\n${list}\n\nType a number:`);
    const picked = actions[parseInt(answer ?? '', 10) - 1];
    if (picked) picked.onPress?.();
    else cancel?.onPress?.();
  };
}
