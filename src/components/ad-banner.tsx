import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { isPro } from '@/lib/entitlements';

type BannerComp = React.ComponentType<{
  unitId: string;
  size: string;
  requestOptions?: { requestNonPersonalizedAdsOnly?: boolean };
}>;

/**
 * Safe AdMob banner — hidden for Pro, web, or when the native module is missing.
 * Re-checks Pro on every screen focus so upgrades hide the banner without remount.
 */
export function AdBanner() {
  const [Banner, setBanner] = useState<BannerComp | null>(null);
  const [unitId, setUnitId] = useState<string | null>(null);
  const [size, setSize] = useState<string | null>(null);
  const [show, setShow] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        if (Platform.OS === 'web') {
          if (alive) setShow(false);
          return;
        }
        try {
          if (await isPro()) {
            if (alive) {
              setShow(false);
              setBanner(null);
              setUnitId(null);
              setSize(null);
            }
            return;
          }
          const ads = await import('@/lib/ads');
          await ads.initAds();
          const exp = await ads.getBannerExports();
          if (!alive) return;
          setBanner(() => exp.BannerAd as unknown as BannerComp);
          setUnitId(ads.getBannerUnitId(exp.TestIds));
          setSize(exp.BannerAdSize.ANCHORED_ADAPTIVE_BANNER);
          setShow(true);
        } catch {
          if (alive) setShow(false);
        }
      })();
      return () => {
        alive = false;
      };
    }, [])
  );

  if (!show || !Banner || !unitId || !size) return null;

  return (
    <View style={styles.wrap}>
      <Banner
        unitId={unitId}
        size={size}
        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', marginVertical: 8 },
});
