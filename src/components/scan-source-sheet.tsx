import { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type Props = {
  visible: boolean;
  busy?: boolean;
  onClose: () => void;
  onCamera: () => void;
  onGallery: () => void;
};

type OptionProps = {
  glyph: string;
  tint: string;
  title: string;
  subtitle: string;
  disabled?: boolean;
  onPress: () => void;
};

function Option({ glyph, tint, title, subtitle, disabled, onPress }: OptionProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        pressed && styles.optionPressed,
        disabled && styles.optionDisabled,
      ]}
    >
      <View style={[styles.optionIcon, { backgroundColor: tint }]}>
        <Text style={styles.optionGlyph}>{glyph}</Text>
      </View>
      <View style={styles.optionCopy}>
        <Text style={styles.optionTitle}>{title}</Text>
        <Text style={styles.optionSub}>{subtitle}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

export function ScanSourceSheet({ visible, busy, onClose, onCamera, onGallery }: Props) {
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(slide, {
      toValue: visible ? 1 : 0,
      duration: visible ? 220 : 150,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [slide, visible]);

  const translateY = slide.interpolate({ inputRange: [0, 1], outputRange: [360, 0] });

  return (
    <Modal visible={visible} animationType="none" transparent onRequestClose={onClose}>
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, { opacity: slide }]}>
          <Pressable
            accessibilityLabel="Dismiss"
            style={StyleSheet.absoluteFill}
            onPress={busy ? undefined : onClose}
          />
        </Animated.View>

        <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
          <View style={styles.handle} />

          <Text style={styles.title}>Scan a business card</Text>
          <Text style={styles.sub}>
            Lay the card flat and fill the frame — CardFlow reads the details for you.
          </Text>

          <Option
            glyph="📷"
            tint="#DBEAFE"
            title="Take a photo"
            subtitle="Use the camera to capture a card"
            disabled={busy}
            onPress={onCamera}
          />
          <Option
            glyph="🖼️"
            tint="#DCFCE7"
            title="Choose from gallery"
            subtitle="Import a card you already photographed"
            disabled={busy}
            onPress={onGallery}
          />

          {busy ? (
            <View style={styles.busy}>
              <ActivityIndicator color="#2563EB" />
              <Text style={styles.busyText}>Opening…</Text>
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              style={({ pressed }) => [styles.cancel, pressed && styles.cancelPressed]}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15,23,42,0.5)',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 32,
    gap: 10,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    marginBottom: 12,
  },
  title: { fontSize: 20, fontWeight: '700', color: '#0F172A' },
  sub: { fontSize: 13, lineHeight: 18, color: '#64748B', marginBottom: 6 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 68,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E7EDF5',
  },
  optionPressed: { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' },
  optionDisabled: { opacity: 0.5 },
  optionIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  optionGlyph: { fontSize: 21 },
  optionCopy: { flex: 1 },
  optionTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  optionSub: { fontSize: 12, color: '#64748B', marginTop: 2 },
  chevron: { fontSize: 24, color: '#94A3B8', marginTop: -2 },
  busy: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  busyText: { color: '#475569', fontWeight: '600' },
  cancel: {
    marginTop: 4,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
  },
  cancelPressed: { backgroundColor: '#E2E8F0' },
  cancelText: { fontWeight: '700', color: '#334155', fontSize: 15 },
});
