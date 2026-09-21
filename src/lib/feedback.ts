import { Alert, Platform, ToastAndroid } from 'react-native';

/** Short, non-blocking confirmation — a real toast on Android, an alert elsewhere. */
export function notify(message: string) {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
    return;
  }
  Alert.alert('CardFlow', message);
}

export function confirm(title: string, message: string, confirmLabel: string, onConfirm: () => void) {
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: confirmLabel, style: 'destructive', onPress: onConfirm },
  ]);
}
