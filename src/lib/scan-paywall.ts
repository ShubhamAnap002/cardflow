import { Alert } from 'react-native';

import { showRewardedForScans } from '@/lib/ads';
import {
  canClaimRewardedScans,
  purchasePro,
  REWARD_SCANS_PER_AD,
  type ProPeriod,
} from '@/lib/entitlements';
import { notify } from '@/lib/feedback';

/**
 * Free quota exhausted — offer rewarded scans or Pro subscription.
 * Returns true if the user can continue scanning.
 */
export async function offerQuotaOptions(): Promise<boolean> {
  const canReward = await canClaimRewardedScans();

  return new Promise((resolve) => {
    const buy = (period: ProPeriod) => {
      void (async () => {
        try {
          await purchasePro(period);
          notify('Pro started — unlimited scans.');
          resolve(true);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Could not start Pro.';
          if (!/cancelled/i.test(message)) notify(message);
          resolve(false);
        }
      })();
    };

    const buttons: {
      text: string;
      style?: 'cancel' | 'destructive' | 'default';
      onPress?: () => void;
    }[] = [
      {
        text: 'Not now',
        style: 'cancel',
        onPress: () => resolve(false),
      },
      { text: 'Pro monthly', onPress: () => buy('monthly') },
      { text: 'Pro yearly', onPress: () => buy('yearly') },
    ];

    if (canReward) {
      buttons.splice(1, 0, {
        text: `Watch ad (+${REWARD_SCANS_PER_AD} scans)`,
        onPress: () => {
          void (async () => {
            const result = await showRewardedForScans();
            if (result.ok) {
              notify(`+${result.scansAdded} scans added this month.`);
              resolve(true);
            } else if (result.reason === 'cancelled') {
              notify('Ad closed before the reward.');
              resolve(false);
            } else if (result.reason === 'cap') {
              notify('No more rewarded scans this month. Upgrade to Pro.');
              resolve(false);
            } else {
              notify('Could not load a rewarded ad. Try again later.');
              resolve(false);
            }
          })();
        },
      });
    }

    Alert.alert(
      'Free scan limit reached',
      canReward
        ? `Watch a short ad for +${REWARD_SCANS_PER_AD} scans this month, or subscribe to Pro for unlimited scans (no ads).`
        : 'You have used all free and rewarded scans this month. Subscribe to Pro for unlimited scans (no ads).',
      buttons
    );
  });
}
