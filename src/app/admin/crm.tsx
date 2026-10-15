import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppHeader } from '@/components/app-header';
import { Chip } from '@/components/chip';
import { Icon } from '@/components/icon';
import { PrimaryButton } from '@/components/primary-button';
import { Screen, ScreenBody } from '@/components/screen';
import { colors, radii, shadows, spacing, type } from '@/constants/theme';
import { notify } from '@/lib/feedback';
import {
  ENERTECH_API_KEY,
  ENERTECH_CRM_BASE_URL,
  ENERTECH_SOURCE,
  getPendingCrmSyncList,
  removePendingCrmSync,
  syncLeadToEnerTechCrm,
} from '@/lib/crm';
import { getContact, listContacts, updateContact } from '@/lib/storage';

export default function AdminCrmScreen() {
  const [testing, setTesting] = useState(false);
  const [flushing, setFlushing] = useState(false);
  const [pendingIds, setPendingIds] = useState<string[]>([]);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  const loadPending = async () => {
    const list = await getPendingCrmSyncList();
    setPendingIds(list);
  };

  useEffect(() => {
    void loadPending();
  }, []);

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      // Send a test ping lead
      const sampleContact = {
        id: 'ping_test',
        name: 'EnerTech Connection Test',
        title: 'System Diagnostic',
        company: 'CardFlow Test Suite',
        phone: '919999999999',
        email: 'test@cardflow.app',
        remark: 'System diagnostic ping from CardFlow Admin',
        leadLevel: 'Platinum' as const,
        leadType: 'Domestic' as const,
        scope: 'Bulk' as const,
        createdAt: Date.now(),
      };

      const res = await syncLeadToEnerTechCrm(sampleContact);
      if (res.ok) {
        setTestResult({
          ok: true,
          message: `Success! Lead accepted by EnerTech CRM (Lead ID: ${res.leadId || 'Generated'}).`,
        });
        notify('EnerTech CRM is connected and active!');
      } else {
        setTestResult({
          ok: false,
          message: `CRM Error: ${res.error || 'Request rejected.'}`,
        });
        notify('CRM connection failed.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error.';
      setTestResult({ ok: false, message: msg });
    } finally {
      setTesting(false);
    }
  };

  const handleFlushPendingQueue = async () => {
    if (pendingIds.length === 0) {
      notify('No pending leads in queue.');
      return;
    }

    setFlushing(true);
    let syncedCount = 0;
    try {
      for (const id of pendingIds) {
        const contact = await getContact(id);
        if (contact) {
          const res = await syncLeadToEnerTechCrm(contact);
          if (res.ok && res.leadId) {
            await updateContact(id, {
              crmLeadId: res.leadId,
              crmSyncStatus: 'synced',
            });
            await removePendingCrmSync(id);
            syncedCount++;
          }
        } else {
          await removePendingCrmSync(id);
        }
      }
      notify(`Flushed queue: ${syncedCount} leads pushed to EnerTech CRM.`);
      await loadPending();
    } catch {
      notify('Failed to flush some queued leads.');
    } finally {
      setFlushing(false);
    }
  };

  return (
    <Screen>
      <AppHeader
        title="EnerTech CRM Status"
        eyebrow="ADMIN SECTION"
        onBack={() => router.back()}
      />

      <ScreenBody contentStyle={styles.container}>
        {/* Status Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconCircle}>
              <Icon name="cloud_done" size={24} color={colors.primary} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.cardTitle}>EnerTech Engage CRM</Text>
              <Text style={styles.cardSub}>Version 1.0.0 · Active Integration</Text>
            </View>
            <Chip label="LIVE" icon="bolt" tone="success" />
          </View>

          <View style={styles.infoTable}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Endpoint Base URL</Text>
              <Text style={styles.infoValue}>{ENERTECH_CRM_BASE_URL}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Lead Source Filter</Text>
              <View style={styles.badgeSource}>
                <Text style={styles.badgeSourceText}>{ENERTECH_SOURCE}</Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Required Scope</Text>
              <Text style={styles.infoValue}>leads:write</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Bearer Token</Text>
              <Text style={styles.infoValue}>
                {ENERTECH_API_KEY.slice(0, 10)}••••••••••••••••{ENERTECH_API_KEY.slice(-6)}
              </Text>
            </View>
          </View>

          <View style={styles.actionRow}>
            <PrimaryButton
              label={testing ? 'Testing...' : 'Test Connection'}
              icon="sync"
              loading={testing}
              compact
              onPress={handleTestConnection}
            />
          </View>

          {testResult ? (
            <View
              style={[
                styles.resultBox,
                testResult.ok ? styles.resultBoxSuccess : styles.resultBoxError,
              ]}
            >
              <Icon
                name={testResult.ok ? 'check_circle' : 'error'}
                size={18}
                color={testResult.ok ? colors.primary : colors.error}
              />
              <Text
                style={[
                  styles.resultText,
                  testResult.ok ? styles.resultTextSuccess : styles.resultTextError,
                ]}
              >
                {testResult.message}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Offline Queue Management */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconCircle, { backgroundColor: colors.surfaceLow }]}>
              <Icon name="hourglass_empty" size={24} color={colors.onSurfaceVariant} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.cardTitle}>Offline Sync Queue</Text>
              <Text style={styles.cardSub}>
                {pendingIds.length === 0
                  ? 'Queue is empty · All leads synced'
                  : `${pendingIds.length} lead(s) waiting to sync`}
              </Text>
            </View>
          </View>

          <Text style={styles.queueHelpText}>
            When sales reps scan business cards in exhibition centers with poor network,
            leads are safely saved locally on the device and queued.
          </Text>

          {pendingIds.length > 0 ? (
            <PrimaryButton
              label={flushing ? 'Pushing Leads...' : 'Sync Pending Leads Now'}
              icon="cloud_upload"
              loading={flushing}
              compact
              onPress={handleFlushPendingQueue}
            />
          ) : null}
        </View>

        {/* CRM Automation Explanation */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Automated Outreach</Text>
          <Text style={styles.explainText}>
            Every time a card is scanned and saved in CardFlow:
          </Text>
          <View style={styles.stepList}>
            <View style={styles.stepItem}>
              <Text style={styles.stepNum}>1.</Text>
              <Text style={styles.stepBody}>
                CardFlow formats all contact info, lead tier (Platinum/Gold), scope,
                voice notes, and tagged products with source <Text style={{ fontWeight: '700' }}>EXPO</Text>.
              </Text>
            </View>
            <View style={styles.stepItem}>
              <Text style={styles.stepNum}>2.</Text>
              <Text style={styles.stepBody}>
                Pushed to EnerTech CRM via <Text style={{ fontFamily: 'monospace' }}>POST /api/v1/leads</Text>.
              </Text>
            </View>
            <View style={styles.stepItem}>
              <Text style={styles.stepNum}>3.</Text>
              <Text style={styles.stepBody}>
                Your CRM triggers your pre-configured WhatsApp introduction message and welcome email automatically.
              </Text>
            </View>
          </View>
        </View>
      </ScreenBody>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadows.card,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  cardTitle: {
    ...type.title,
    color: colors.onSurface,
  },
  cardSub: {
    ...type.bodySm,
    color: colors.onSurfaceVariant,
  },
  infoTable: {
    backgroundColor: colors.surfaceLow,
    borderRadius: radii.md,
    padding: spacing.sm,
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  infoLabel: {
    ...type.bodySm,
    color: colors.onSurfaceVariant,
    fontWeight: '500',
  },
  infoValue: {
    ...type.bodySm,
    color: colors.onSurface,
    fontWeight: '600',
  },
  badgeSource: {
    backgroundColor: '#2563EB',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  badgeSourceText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.surface,
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: spacing.xs,
  },
  resultBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  resultBoxSuccess: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  resultBoxError: {
    backgroundColor: colors.errorSoft,
    borderColor: colors.error,
  },
  resultText: {
    flex: 1,
    ...type.bodySm,
    fontWeight: '600',
  },
  resultTextSuccess: {
    color: colors.primary,
  },
  resultTextError: {
    color: colors.onErrorSoft,
  },
  queueHelpText: {
    ...type.bodySm,
    color: colors.onSurfaceVariant,
    lineHeight: 18,
  },
  explainText: {
    ...type.body,
    color: colors.onSurface,
  },
  stepList: {
    gap: spacing.xs,
    marginTop: spacing.xxs,
  },
  stepItem: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  stepNum: {
    ...type.body,
    fontWeight: '700',
    color: colors.primary,
  },
  stepBody: {
    flex: 1,
    ...type.body,
    color: colors.onSurfaceVariant,
    lineHeight: 20,
  },
});
