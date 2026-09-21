import { StyleSheet, View } from 'react-native';

import { StitchHost } from '@/components/stitch-host';

export default function App() {
  return (
    <View style={styles.root}>
      <StitchHost />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#faf8ff' },
});
