import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  visible: boolean;
  onClose: () => void;
  onCamera: () => void;
  onGallery: () => void;
};

export function ScanSourceSheet({ visible, onClose, onCamera, onGallery }: Props) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>Scan business card</Text>
          <Text style={styles.sub}>Choose camera or gallery</Text>

          <Pressable style={styles.option} onPress={onCamera}>
            <Text style={styles.optionTitle}>Camera</Text>
            <Text style={styles.optionSub}>Capture a new card</Text>
          </Pressable>

          <Pressable style={styles.option} onPress={onGallery}>
            <Text style={styles.optionTitle}>Gallery</Text>
            <Text style={styles.optionSub}>Pick from photo library</Text>
          </Pressable>

          <Pressable style={styles.cancel} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 28,
    gap: 10,
  },
  title: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  sub: { fontSize: 13, color: '#64748B', marginBottom: 4 },
  option: {
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  optionTitle: { fontSize: 16, fontWeight: '700', color: '#1D4ED8' },
  optionSub: { fontSize: 12, color: '#64748B', marginTop: 2 },
  cancel: {
    marginTop: 4,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
  },
  cancelText: { fontWeight: '600', color: '#334155' },
});
