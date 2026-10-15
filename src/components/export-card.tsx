import type { ReactNode, RefObject } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { colors, fonts } from '@/constants/theme';
import type { ExportCardFields } from '@/lib/export-card-fields';
import type { ExportCardViewRef } from '@/lib/card-export';

type Row = { label: string; value: string };

type Props = {
  fields: ExportCardFields;
  qrValue: string;
};

/**
 * Hardcoded share-card layout (see docs/card-templates-preview.html).
 * Same design for every contact/profile — only values + QR change.
 */
export function ExportCard({ fields, qrValue }: Props) {
  const company = fields.company.trim();
  const name = fields.name.trim() || displayNameFallback(fields);
  const title = fields.title.trim();
  const rows: Row[] = [];
  const phone = fields.phone.trim();
  const email = fields.email.trim();
  const address = fields.address.trim();
  const website = fields.website.trim();
  if (phone) rows.push({ label: 'Mobile', value: phone });
  if (email) rows.push({ label: 'Email', value: email });
  if (address) rows.push({ label: 'Address', value: address });
  if (website) rows.push({ label: 'Web', value: website });

  return (
    <View style={styles.card} collapsable={false}>
      <View style={styles.left}>
        {company ? <Text style={styles.company}>{company.toUpperCase()}</Text> : null}
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        {title ? (
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        ) : null}
        {rows.length > 0 ? <View style={styles.divider} /> : null}
        <View style={styles.rows}>
          {rows.map((row) => (
            <View key={row.label} style={styles.row}>
              <Text style={styles.k}>{row.label.toUpperCase()}</Text>
              <Text style={styles.v} numberOfLines={1}>
                {row.value}
              </Text>
            </View>
          ))}
        </View>
      </View>
      <View style={styles.right}>
        <View style={styles.qrBox}>
          <QRCode
            value={qrValue}
            size={QR_INNER}
            color={colors.onSurface}
            backgroundColor={colors.surface}
            ecl="M"
          />
        </View>
        <Text style={styles.scan}>SCAN</Text>
      </View>
    </View>
  );
}

/** Off-screen host for view-shot. Keep opacity 1 — opacity 0 often yields blank PNGs. */
export function ExportCardCaptureHost({
  cardRef,
  children,
}: {
  cardRef: RefObject<ExportCardViewRef | null>;
  children: ReactNode;
}) {
  return (
    <View
      style={styles.offscreen}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View ref={cardRef} collapsable={false}>
        {children}
      </View>
    </View>
  );
}

function displayNameFallback(fields: ExportCardFields): string {
  const email = fields.email.trim();
  if (email) {
    const local = email.split('@')[0]?.trim();
    if (local) return local;
  }
  const phone = fields.phone.trim();
  if (phone) return phone;
  const web = fields.website.trim();
  if (web) return web.replace(/^https?:\/\//i, '').replace(/^www\./i, '');
  return 'Contact';
}

const CARD_H = 152;
const LEFT_W = 248;
const QR_BOX = 92;
const QR_INNER = 84;

const styles = StyleSheet.create({
  card: {
    height: CARD_H,
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: 10,
    overflow: 'hidden',
  },
  left: {
    width: LEFT_W,
    paddingTop: 10,
    paddingRight: 8,
    paddingBottom: 8,
    paddingLeft: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  company: {
    fontFamily: fonts.bold,
    fontSize: 9,
    letterSpacing: 0.7,
    color: colors.primary,
    lineHeight: 11,
    marginBottom: 2,
  },
  name: {
    fontFamily: fonts.bold,
    fontSize: 16,
    letterSpacing: -0.4,
    color: colors.onSurface,
    lineHeight: 18,
  },
  title: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    lineHeight: 13,
    marginTop: 1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.outlineVariant,
    marginTop: 5,
    marginBottom: 4,
  },
  rows: {
    gap: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    minWidth: 0,
  },
  k: {
    width: 44,
    fontFamily: fonts.bold,
    fontSize: 8,
    letterSpacing: 0.3,
    color: colors.primary,
    lineHeight: 12,
  },
  v: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 10,
    color: colors.onSurface,
    lineHeight: 12,
    minWidth: 0,
  },
  right: {
    paddingTop: 8,
    paddingRight: 8,
    paddingBottom: 8,
    paddingLeft: 4,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: colors.outlineVariant,
  },
  qrBox: {
    width: QR_BOX,
    height: QR_BOX,
    padding: 4,
    borderWidth: 1.5,
    borderColor: colors.secondary,
    borderRadius: 6,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scan: {
    fontFamily: fonts.bold,
    fontSize: 7,
    letterSpacing: 0.6,
    color: colors.onSurfaceVariant,
    lineHeight: 8,
  },
  offscreen: {
    position: 'absolute',
    left: 0,
    top: 0,
    // Fully opaque but translated away — view-shot needs a painted view.
    transform: [{ translateX: -4000 }],
  },
});
