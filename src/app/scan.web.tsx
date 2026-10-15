import { router } from 'expo-router';
import { useRef, useState } from 'react';

import { ScanSourceSheet } from '@/components/scan-source-sheet';
import { getEntitlementState } from '@/lib/entitlements';
import { notify } from '@/lib/feedback';
import { persistCardImage } from '@/lib/media';
import { dismissToHome } from '@/lib/navigation';
import { offerQuotaOptions } from '@/lib/scan-paywall';

export default function ScanScreenWeb() {
  const [busy, setBusy] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  async function checkQuota(): Promise<boolean> {
    try {
      const entitlement = await getEntitlementState();
      if (!entitlement.isPro && entitlement.remaining <= 0) {
        const unlocked = await offerQuotaOptions();
        return Boolean(unlocked);
      }
      return true;
    } catch {
      return true;
    }
  }

  async function handleFileSelected(file: File) {
    if (busy) return;
    setBusy(true);

    try {
      const allowed = await checkQuota();
      if (!allowed) {
        setBusy(false);
        return;
      }

      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const rawUri = String(reader.result || '');
          const uri = await persistCardImage(rawUri);
          router.replace({ pathname: '/review', params: { uri } });
        } catch {
          notify('Could not process that image. Please try another.');
          setBusy(false);
        }
      };
      reader.onerror = () => {
        notify('Could not read image file.');
        setBusy(false);
      };
      reader.readAsDataURL(file);
    } catch {
      notify('An error occurred while uploading.');
      setBusy(false);
    }
  }

  function triggerCamera() {
    if (cameraInputRef.current) {
      cameraInputRef.current.value = '';
      cameraInputRef.current.click();
    }
  }

  function triggerGallery() {
    if (galleryInputRef.current) {
      galleryInputRef.current.value = '';
      galleryInputRef.current.click();
    }
  }

  return (
    <>
      {/* Hidden web file inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFileSelected(file);
        }}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFileSelected(file);
        }}
      />

      <ScanSourceSheet
        busy={busy}
        onClose={dismissToHome}
        onCamera={triggerCamera}
        onGallery={triggerGallery}
        onQr={() => {
          if (busy) return;
          router.replace('/scan-qr');
        }}
      />
    </>
  );
}
