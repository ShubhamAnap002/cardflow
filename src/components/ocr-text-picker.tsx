import React, { useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Icon } from '@/components/icon';
import { colors, radii, shadows, spacing, type } from '@/constants/theme';

type Props = {
  visible: boolean;
  fieldLabel: string;
  currentValue?: string;
  detectedLines: string[];
  onSelect: (value: string) => void;
  onClose: () => void;
};

export function OcrTextPicker({
  visible,
  fieldLabel,
  currentValue,
  detectedLines,
  onSelect,
  onClose,
}: Props) {
  const [filter, setFilter] = useState('');

  // Deduplicate and filter non-empty lines
  const uniqueLines = Array.from(
    new Set(
      detectedLines
        .map((l) => l.trim())
        .filter(Boolean)
    )
  );

  const displayedLines = filter.trim()
    ? uniqueLines.filter((line) =>
        line.toLowerCase().includes(filter.toLowerCase())
      )
    : uniqueLines;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.headerIconContainer}>
                <Icon name="document_scanner" size={20} color={colors.primary} />
              </View>
              <View style={styles.headerTextCol}>
                <Text style={styles.title}>Tap to Fill: {fieldLabel}</Text>
                <Text style={styles.subtitle}>
                  Select detected text from card to populate this field
                </Text>
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={onClose}
              style={styles.closeBtn}
            >
              <Icon name="close" size={20} color={colors.onSurfaceVariant} />
            </Pressable>
          </View>

          {uniqueLines.length > 4 ? (
            <View style={styles.searchContainer}>
              <Icon name="search" size={18} color={colors.outline} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search card text..."
                placeholderTextColor={colors.outline}
                value={filter}
                onChangeText={setFilter}
                autoCorrect={false}
              />
              {filter ? (
                <Pressable onPress={() => setFilter('')}>
                  <Icon name="close" size={16} color={colors.outline} />
                </Pressable>
              ) : null}
            </View>
          ) : null}

          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
          >
            {displayedLines.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Icon name="crop_free" size={32} color={colors.outline} />
                <Text style={styles.emptyText}>
                  {filter
                    ? 'No matching text lines.'
                    : 'No text extracted from card yet.'}
                </Text>
              </View>
            ) : (
              displayedLines.map((line, idx) => {
                const isSelected = currentValue?.trim() === line;
                return (
                  <Pressable
                    key={`${idx}-${line}`}
                    style={({ pressed }) => [
                      styles.lineItem,
                      isSelected && styles.lineItemSelected,
                      pressed && styles.lineItemPressed,
                    ]}
                    onPress={() => {
                      onSelect(line);
                      onClose();
                    }}
                  >
                    <View style={styles.lineIconCol}>
                      <Icon
                        name={isSelected ? 'check_circle' : 'text_snippet'}
                        size={18}
                        color={isSelected ? colors.primary : colors.onSurfaceVariant}
                      />
                    </View>
                    <Text
                      style={[
                        styles.lineText,
                        isSelected && styles.lineTextSelected,
                      ]}
                      numberOfLines={3}
                    >
                      {line}
                    </Text>
                    <View style={styles.tapBadge}>
                      <Text style={styles.tapBadgeText}>Tap to Use</Text>
                    </View>
                  </Pressable>
                );
              })
            )}
          </ScrollView>

          <View style={styles.footer}>
            {currentValue ? (
              <Pressable
                style={styles.clearBtn}
                onPress={() => {
                  onSelect('');
                  onClose();
                }}
              >
                <Icon name="backspace" size={16} color={colors.error} />
                <Text style={styles.clearBtnText}>Clear Field</Text>
              </Pressable>
            ) : null}
            <Pressable style={styles.doneBtn} onPress={onClose}>
              <Text style={styles.doneBtnText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheet: {
    width: '100%',
    maxWidth: 580,
    maxHeight: '82%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.lg,
    ...shadows.raised,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  headerIconContainer: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextCol: {
    flex: 1,
  },
  title: {
    ...type.title,
    color: colors.onSurface,
  },
  subtitle: {
    ...type.bodySm,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceLow,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    ...type.body,
    color: colors.onSurface,
    paddingVertical: spacing.xs,
  },
  list: {
    maxHeight: 380,
  },
  listContent: {
    gap: spacing.xs,
    paddingBottom: spacing.md,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  emptyText: {
    ...type.body,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  lineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceLow,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'transparent',
    gap: spacing.sm,
  },
  lineItemSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  lineItemPressed: {
    opacity: 0.8,
  },
  lineIconCol: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  lineText: {
    flex: 1,
    ...type.body,
    color: colors.onSurface,
    lineHeight: 20,
  },
  lineTextSelected: {
    fontFamily: type.title.fontFamily,
    color: colors.primary,
  },
  tapBadge: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  tapBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  clearBtnText: {
    ...type.bodySm,
    fontWeight: '600',
    color: colors.error,
  },
  doneBtn: {
    marginLeft: 'auto',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceLow,
  },
  doneBtnText: {
    ...type.body,
    fontWeight: '600',
    color: colors.onSurface,
  },
});
