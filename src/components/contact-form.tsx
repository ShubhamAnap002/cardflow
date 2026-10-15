import React, { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';

import { Chip } from '@/components/chip';
import { Icon, type IconName } from '@/components/icon';
import { OcrTextPicker } from '@/components/ocr-text-picker';
import { VoiceRemark } from '@/components/voice-remark';
import { colors, radii, shadows, spacing, type } from '@/constants/theme';
import { addProduct, listProducts, type Group, type Product } from '@/lib/storage';
import { normalizePhoneNumber, splitPhoneNumbers } from '@/lib/crm';
import {
  type Draft,
  type DraftErrors,
  EMPTY_DRAFT,
  draftFrom,
  splitEmails,
  toContact,
  validate,
} from '@/lib/contact-draft';

export type { Draft, DraftErrors };
export { EMPTY_DRAFT, draftFrom, splitEmails, toContact, validate };

type Props = {
  draft: Draft;
  errors: DraftErrors;
  groups: Group[];
  onChange: (key: keyof Draft, value: any) => void;
  detectedLines?: string[];
};

export function ContactForm({
  draft,
  errors,
  groups,
  onChange,
  detectedLines = [],
}: Props) {
  // State for OCR picker modal
  const [pickerConfig, setPickerConfig] = useState<{
    visible: boolean;
    fieldKey: keyof Draft;
    label: string;
  } | null>(null);

  // Available lines for OCR picker: use provided detectedLines or fallback to draft lines
  const allDetectedLines = React.useMemo(() => {
    const lines = new Set<string>(detectedLines);
    if (draft.rawOcrLines && draft.rawOcrLines.length > 0) {
      draft.rawOcrLines.forEach((l) => lines.add(l));
    }
    // Also include whatever draft fields currently exist as candidates
    [
      draft.company,
      draft.name,
      draft.title,
      draft.address,
      draft.phone,
      draft.phone2,
      draft.email,
      draft.email2,
      draft.website,
    ].forEach((f) => {
      if (f && f.trim().length > 1) lines.add(f.trim());
    });
    return Array.from(lines).filter(Boolean);
  }, [detectedLines, draft]);

  const openPicker = (fieldKey: keyof Draft, label: string) => {
    setPickerConfig({
      visible: true,
      fieldKey,
      label,
    });
  };

  const handleSelectOcrLine = (line: string) => {
    if (!pickerConfig) return;
    const { fieldKey } = pickerConfig;

    // Clean phone numbers if selecting for phone fields: exactly one clean number, proper country code, NO '+'
    if (fieldKey === 'phone' || fieldKey === 'phone2') {
      const parts = splitPhoneNumbers(line);
      if (parts.length > 0) {
        onChange(fieldKey, parts[0]);
        // If field was primary phone and there's a second number on the line, auto-populate phone2 if empty
        if (fieldKey === 'phone' && parts.length > 1 && !draft.phone2) {
          onChange('phone2', parts[1]);
        }
      } else {
        onChange(fieldKey, normalizePhoneNumber(line));
      }
    } else {
      onChange(fieldKey, line.trim());
    }
  };

  // Dynamic catalog products loaded from storage
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);

  useEffect(() => {
    let active = true;
    void listProducts().then((prods) => {
      if (active) setCatalogProducts(prods);
    });
    return () => {
      active = false;
    };
  }, []);

  // Merge products from catalog and whatever is already selected in the draft
  const availableProductNames = React.useMemo(() => {
    const names = new Set<string>();
    catalogProducts.forEach((p) => {
      if (p.name && p.name.trim()) names.add(p.name.trim());
    });
    (draft.products || []).forEach((p) => {
      if (p && p.trim()) names.add(p.trim());
    });
    return Array.from(names);
  }, [catalogProducts, draft.products]);

  const handleAddNewTag = async () => {
    const clean = newTagInput.trim();
    if (!clean) return;
    setIsAddingTag(true);
    try {
      const added = await addProduct(clean, 'General');
      setCatalogProducts((prev) => [added, ...prev.filter((p) => p.name !== clean)]);
      const current = draft.products || [];
      if (!current.includes(clean)) {
        onChange('products', [...current, clean]);
      }
      setNewTagInput('');
    } catch {
      const current = draft.products || [];
      if (!current.includes(clean)) {
        onChange('products', [...current, clean]);
      }
      setNewTagInput('');
    } finally {
      setIsAddingTag(false);
    }
  };

  const toggleProduct = (prod: string) => {
    const current = draft.products || [];
    if (current.includes(prod)) {
      onChange(
        'products',
        current.filter((p) => p !== prod)
      );
    } else {
      onChange('products', [...current, prod]);
    }
  };

  return (
    <View style={styles.form}>
      {/* 1. Lead Type: International vs Domestic */}
      <View style={styles.field}>
        <Text style={styles.label}>Type</Text>
        <View style={styles.radioRow}>
          <Pressable
            style={styles.radioOption}
            onPress={() => onChange('leadType', 'International')}
          >
            <View
              style={[
                styles.radioCircle,
                draft.leadType === 'International' && styles.radioCircleActive,
              ]}
            >
              {draft.leadType === 'International' ? (
                <View style={styles.radioDot} />
              ) : null}
            </View>
            <Text style={styles.radioText}>International</Text>
          </Pressable>

          <Pressable
            style={styles.radioOption}
            onPress={() => onChange('leadType', 'Domestic')}
          >
            <View
              style={[
                styles.radioCircle,
                draft.leadType === 'Domestic' && styles.radioCircleActive,
              ]}
            >
              {draft.leadType === 'Domestic' ? (
                <View style={styles.radioDot} />
              ) : null}
            </View>
            <Text style={styles.radioText}>Domestic</Text>
          </Pressable>
        </View>
      </View>

      {/* 2. Level: Platinum / Gold / Silver / Bronze */}
      <View style={styles.field}>
        <Text style={styles.label}>Level</Text>
        <View style={styles.levelRow}>
          {(['Platinum', 'Gold', 'Silver', 'Bronze'] as const).map((level) => {
            const isSelected = draft.leadLevel === level;
            return (
              <Pressable
                key={level}
                style={[
                  styles.levelPill,
                  isSelected && styles.levelPillActive,
                ]}
                onPress={() => onChange('leadLevel', level)}
              >
                <Text
                  style={[
                    styles.levelText,
                    isSelected && styles.levelTextActive,
                  ]}
                >
                  {level}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* 3. Customer Company */}
      <View style={styles.field}>
        <Text style={styles.label}>Customer Company</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={[
              styles.inputWithIcon,
              errors.company ? styles.inputError : null,
            ]}
            placeholder="Company name"
            placeholderTextColor={colors.outline}
            value={draft.company}
            onChangeText={(val) => onChange('company', val)}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Pick scanned text for Customer Company"
            style={styles.fieldIconButton}
            onPress={() => openPicker('company', 'Customer Company')}
          >
            <Icon name="bookmark_border" size={22} color={colors.onSurface} />
          </Pressable>
        </View>
      </View>

      {/* 4. Person Name */}
      <View style={styles.field}>
        <Text style={styles.label}>Person Name *</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={[
              styles.inputWithIcon,
              errors.name ? styles.inputError : null,
            ]}
            placeholder="Person Name"
            placeholderTextColor={colors.outline}
            value={draft.name}
            onChangeText={(val) => onChange('name', val)}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Pick scanned text for Person Name"
            style={styles.fieldIconButton}
            onPress={() => openPicker('name', 'Person Name')}
          >
            <Icon name="person" size={22} color={colors.onSurface} />
          </Pressable>
        </View>
        {errors.name ? <Text style={styles.error}>{errors.name}</Text> : null}
      </View>

      {/* 5. Job Title */}
      <View style={styles.field}>
        <Text style={styles.label}>Job Title / Designation</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.inputWithIcon}
            placeholder="e.g. Sales Manager, Director"
            placeholderTextColor={colors.outline}
            value={draft.title}
            onChangeText={(val) => onChange('title', val)}
          />
          <Pressable
            style={styles.fieldIconButton}
            onPress={() => openPicker('title', 'Job Title')}
          >
            <Icon name="badge" size={20} color={colors.onSurfaceVariant} />
          </Pressable>
        </View>
      </View>

      {/* 6. Address */}
      <View style={styles.field}>
        <Text style={styles.label}>Address</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.inputWithIcon, styles.inputMultiline]}
            placeholder="Address"
            placeholderTextColor={colors.outline}
            multiline
            numberOfLines={2}
            value={draft.address}
            onChangeText={(val) => onChange('address', val)}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Pick scanned text for Address"
            style={[styles.fieldIconButton, styles.fieldIconButtonTop]}
            onPress={() => openPicker('address', 'Address')}
          >
            <Icon name="place" size={22} color={colors.onSurface} />
          </Pressable>
        </View>
      </View>

      {/* 7. Mobile */}
      <View style={styles.field}>
        <Text style={styles.label}>Mobile *</Text>
        <View style={styles.inputContainer}>
          <View style={styles.flagBadge}>
            <Text style={styles.flagText}>🇮🇳 +91</Text>
          </View>
          <TextInput
            style={[
              styles.inputWithIcon,
              styles.inputWithFlag,
              errors.phone ? styles.inputError : null,
            ]}
            placeholder="Mobile number"
            placeholderTextColor={colors.outline}
            keyboardType="phone-pad"
            value={draft.phone}
            onChangeText={(val) => onChange('phone', val)}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Pick scanned text for Mobile"
            style={styles.fieldIconButton}
            onPress={() => openPicker('phone', 'Mobile')}
          >
            <Icon name="call" size={22} color={colors.onSurface} />
          </Pressable>
        </View>
        {errors.phone ? <Text style={styles.error}>{errors.phone}</Text> : null}
      </View>

      {/* 8. Mobile 2 */}
      <View style={styles.field}>
        <Text style={styles.label}>Mobile 2</Text>
        <View style={styles.inputContainer}>
          <View style={styles.flagBadge}>
            <Text style={styles.flagText}>🇮🇳 +91</Text>
          </View>
          <TextInput
            style={[styles.inputWithIcon, styles.inputWithFlag]}
            placeholder="Secondary mobile"
            placeholderTextColor={colors.outline}
            keyboardType="phone-pad"
            value={draft.phone2}
            onChangeText={(val) => onChange('phone2', val)}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Pick scanned text for Mobile 2"
            style={styles.fieldIconButton}
            onPress={() => openPicker('phone2', 'Mobile 2')}
          >
            <Icon name="call" size={22} color={colors.onSurface} />
          </Pressable>
        </View>
      </View>

      {/* 9. Email */}
      <View style={styles.field}>
        <Text style={styles.label}>Email</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={[
              styles.inputWithIcon,
              errors.email ? styles.inputError : null,
            ]}
            placeholder="Primary email"
            placeholderTextColor={colors.outline}
            keyboardType="email-address"
            autoCapitalize="none"
            value={draft.email}
            onChangeText={(val) => onChange('email', val)}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Pick scanned text for Email"
            style={styles.fieldIconButton}
            onPress={() => openPicker('email', 'Email')}
          >
            <Icon name="mail" size={22} color={colors.onSurface} />
          </Pressable>
        </View>
        {errors.email ? <Text style={styles.error}>{errors.email}</Text> : null}
      </View>

      {/* 10. Email 2 */}
      <View style={styles.field}>
        <Text style={styles.label}>Email 2</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.inputWithIcon}
            placeholder="Secondary email"
            placeholderTextColor={colors.outline}
            keyboardType="email-address"
            autoCapitalize="none"
            value={draft.email2}
            onChangeText={(val) => onChange('email2', val)}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Pick scanned text for Email 2"
            style={styles.fieldIconButton}
            onPress={() => openPicker('email2', 'Email 2')}
          >
            <Icon name="mail" size={22} color={colors.onSurface} />
          </Pressable>
        </View>
      </View>

      {/* 11. Website */}
      <View style={styles.field}>
        <Text style={styles.label}>Website</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.inputWithIcon}
            placeholder="https://example.com"
            placeholderTextColor={colors.outline}
            keyboardType="url"
            autoCapitalize="none"
            value={draft.website}
            onChangeText={(val) => onChange('website', val)}
          />
          <Pressable
            style={styles.fieldIconButton}
            onPress={() => openPicker('website', 'Website')}
          >
            <Icon name="language" size={20} color={colors.onSurfaceVariant} />
          </Pressable>
        </View>
      </View>

      {/* 12. Qty (Scope): Bulk vs Small */}
      <View style={styles.field}>
        <Text style={styles.label}>Qty(Scope)</Text>
        <View style={styles.radioRow}>
          <Pressable
            style={styles.radioOption}
            onPress={() => onChange('scope', 'Bulk')}
          >
            <View
              style={[
                styles.radioCircle,
                draft.scope === 'Bulk' && styles.radioCircleActive,
              ]}
            >
              {draft.scope === 'Bulk' ? (
                <View style={styles.radioDot} />
              ) : null}
            </View>
            <Text style={styles.radioText}>Bulk</Text>
          </Pressable>

          <Pressable
            style={styles.radioOption}
            onPress={() => onChange('scope', 'Small')}
          >
            <View
              style={[
                styles.radioCircle,
                draft.scope === 'Small' && styles.radioCircleActive,
              ]}
            >
              {draft.scope === 'Small' ? (
                <View style={styles.radioDot} />
              ) : null}
            </View>
            <Text style={styles.radioText}>Small</Text>
          </Pressable>
        </View>
      </View>

      {/* 13. Products of Interest */}
      <View style={styles.field}>
        <View style={styles.productHeaderRow}>
          <Text style={styles.label}>Products Interested (Catalog Tagging)</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open Admin to manage product catalog"
            onPress={() => router.push('/admin/products')}
            style={styles.adminLinkButton}
          >
            <Icon name="shopping_bag" size={13} color={colors.primary} />
            <Text style={styles.adminLinkText}>Manage Catalog</Text>
          </Pressable>
        </View>

        {/* Quick inline add tag for sales reps */}
        <View style={styles.inlineAddRow}>
          <TextInput
            style={styles.inlineAddInput}
            placeholder="Type product name to tag..."
            placeholderTextColor={colors.outline}
            value={newTagInput}
            onChangeText={setNewTagInput}
            onSubmitEditing={handleAddNewTag}
            returnKeyType="done"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add product tag"
            style={[
              styles.inlineAddBtn,
              !newTagInput.trim() && styles.inlineAddBtnDisabled,
            ]}
            disabled={!newTagInput.trim() || isAddingTag}
            onPress={handleAddNewTag}
          >
            <Icon
              name="add"
              size={16}
              color={newTagInput.trim() ? colors.surface : colors.outline}
            />
            <Text
              style={[
                styles.inlineAddBtnText,
                !newTagInput.trim() && styles.inlineAddBtnTextDisabled,
              ]}
            >
              Add
            </Text>
          </Pressable>
        </View>

        {availableProductNames.length > 0 ? (
          <View style={styles.productChipsRow}>
            {availableProductNames.map((prod) => {
              const isTagged = (draft.products || []).includes(prod);
              return (
                <Pressable
                  key={prod}
                  style={[
                    styles.productChip,
                    isTagged && styles.productChipTagged,
                  ]}
                  onPress={() => toggleProduct(prod)}
                >
                  <Icon
                    name={isTagged ? 'check' : 'add'}
                    size={14}
                    color={isTagged ? colors.surface : colors.onSurfaceVariant}
                  />
                  <Text
                    style={[
                      styles.productChipText,
                      isTagged && styles.productChipTextTagged,
                    ]}
                  >
                    {prod}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <View style={styles.productEmptyBox}>
            <Text style={styles.productEmptyText}>
              No products in catalog yet. Type a product name above to tag and save to catalog, or tap "Manage Catalog" to configure your products.
            </Text>
          </View>
        )}
      </View>

      {/* 14. Voice Remarks & Audio Note System */}
      <VoiceRemark
        remark={draft.remark}
        voiceTranscript={draft.voiceTranscript}
        audioUri={draft.audioUri}
        onChangeRemark={(val) => onChange('remark', val)}
        onChangeTranscript={(val) => onChange('voiceTranscript', val)}
        onChangeAudioUri={(val) => onChange('audioUri', val)}
      />

      {/* 15. Group selection */}
      {groups.length > 0 ? (
        <View style={styles.field}>
          <Text style={styles.label}>Group</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
          >
            <Chip
              label="None"
              selected={!draft.group}
              onPress={() => onChange('group', '')}
            />
            {groups.map((group) => (
              <Chip
                key={group.id}
                label={group.name}
                selected={draft.group === group.name}
                onPress={() => onChange('group', group.name)}
              />
            ))}
          </ScrollView>
        </View>
      ) : null}

      {/* Interactive OCR Text Picker Modal */}
      {pickerConfig ? (
        <OcrTextPicker
          visible={pickerConfig.visible}
          fieldLabel={pickerConfig.label}
          currentValue={String(draft[pickerConfig.fieldKey] || '')}
          detectedLines={allDetectedLines}
          onSelect={handleSelectOcrLine}
          onClose={() => setPickerConfig(null)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.md,
  },
  field: {
    gap: spacing.xxs + 2,
  },
  label: {
    ...type.label,
    color: colors.onSurfaceVariant,
    fontWeight: '600',
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
    paddingVertical: spacing.xxs,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: radii.pill,
    borderWidth: 2,
    borderColor: colors.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    borderColor: '#2563EB',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: radii.pill,
    backgroundColor: '#2563EB',
  },
  radioText: {
    fontSize: type.body.fontSize,
    color: colors.onSurface,
  },
  levelRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  levelPill: {
    flex: 1,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelPillActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  levelText: {
    fontSize: type.bodySm.fontSize,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
  levelTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  inputContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputWithIcon: {
    flex: 1,
    minHeight: 48,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surface,
    paddingLeft: spacing.md,
    paddingRight: 44,
    paddingVertical: spacing.xs,
    ...type.body,
    fontSize: 15,
    color: colors.onSurface,
  },
  inputWithFlag: {
    paddingLeft: 72,
  },
  inputMultiline: {
    minHeight: 68,
    textAlignVertical: 'top',
    paddingTop: spacing.sm,
  },
  inputError: {
    borderColor: colors.error,
    backgroundColor: colors.errorSoft,
  },
  fieldIconButton: {
    position: 'absolute',
    right: 8,
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldIconButtonTop: {
    top: 10,
  },
  flagBadge: {
    position: 'absolute',
    left: 8,
    zIndex: 1,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceLow,
  },
  flagText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.onSurface,
  },
  error: {
    ...type.label,
    color: colors.onErrorSoft,
    fontWeight: '500',
  },
  productHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  adminLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: radii.sm,
    backgroundColor: colors.primarySoft,
  },
  adminLinkText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  inlineAddRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  inlineAddInput: {
    flex: 1,
    height: 38,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    fontSize: 13,
    color: colors.onSurface,
  },
  inlineAddBtn: {
    height: 38,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radii.md,
    backgroundColor: colors.primary,
  },
  inlineAddBtnDisabled: {
    backgroundColor: colors.surfaceLow,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  inlineAddBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.surface,
  },
  inlineAddBtnTextDisabled: {
    color: colors.outline,
  },
  productEmptyBox: {
    padding: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceLow,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  productEmptyText: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    lineHeight: 18,
  },
  productChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  productChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surface,
  },
  productChipTagged: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  productChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.onSurface,
  },
  productChipTextTagged: {
    color: colors.surface,
    fontWeight: '700',
  },
  chips: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingVertical: 2,
  },
});
