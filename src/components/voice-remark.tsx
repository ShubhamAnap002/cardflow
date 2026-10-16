import React, { useEffect, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Icon } from '@/components/icon';
import { colors, radii, spacing, type } from '@/constants/theme';

type Props = {
  remark: string;
  voiceTranscript: string;
  audioUri?: string;
  onChangeRemark: (val: string) => void;
  onChangeTranscript: (val: string) => void;
  onChangeAudioUri?: (val?: string) => void;
};

// Web SpeechRecognition interface types
interface IWindowSpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: (event: any) => void;
  onerror: (event: any) => void;
  onend: () => void;
}

export function VoiceRemark({
  remark,
  voiceTranscript,
  audioUri,
  onChangeRemark,
  onChangeTranscript,
  onChangeAudioUri,
}: Props) {
  const [isListening, setIsListening] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [interimText, setInterimText] = useState('');

  // Stable callback refs prevent effect teardown and recognition aborts on state updates
  const onChangeRemarkRef = useRef(onChangeRemark);
  onChangeRemarkRef.current = onChangeRemark;
  const onChangeTranscriptRef = useRef(onChangeTranscript);
  onChangeTranscriptRef.current = onChangeTranscript;
  const onChangeAudioUriRef = useRef(onChangeAudioUri);
  onChangeAudioUriRef.current = onChangeAudioUri;

  const recognitionRef = useRef<IWindowSpeechRecognition | null>(null);
  const mediaRecorderRef = useRef<any>(null);
  const audioChunksRef = useRef<any[]>([]);
  const isListeningRef = useRef(false);
  const baseTextRef = useRef('');

  // Keep baseTextRef aligned with current text when not actively recording
  useEffect(() => {
    if (!isListeningRef.current) {
      baseTextRef.current = remark || voiceTranscript || '';
    }
  }, [remark, voiceTranscript]);

  // Teardown speech recognition and recorder cleanly on unmount
  useEffect(() => {
    return () => {
      isListeningRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignore
        }
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch {
          // Ignore
        }
      }
    };
  }, []);

  const createAndStartRecognition = () => {
    if (typeof window === 'undefined') return null;

    const SpeechRecognitionClass =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      setStatusMessage('Speech recognition is not supported in this browser.');
      return null;
    }

    try {
      const rec = new SpeechRecognitionClass() as IWindowSpeechRecognition;
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      rec.lang = typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'en-US';

      rec.onresult = (event: any) => {
        let finalChunk = '';
        let interimChunk = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          const transcript = res[0]?.transcript || '';
          if (res.isFinal) {
            finalChunk += transcript + ' ';
          } else {
            interimChunk += transcript;
          }
        }

        if (finalChunk) {
          const nextBase = (baseTextRef.current ? baseTextRef.current + ' ' : '') + finalChunk.trim();
          baseTextRef.current = nextBase;
          setInterimText('');
          onChangeTranscriptRef.current(nextBase);
          onChangeRemarkRef.current(nextBase);
        } else if (interimChunk) {
          setInterimText(interimChunk);
          const previewText = (baseTextRef.current ? baseTextRef.current + ' ' : '') + interimChunk.trim();
          onChangeTranscriptRef.current(previewText);
          onChangeRemarkRef.current(previewText);
        }
      };

      rec.onerror = (event: any) => {
        const errorType = event.error || '';
        // 'no-speech' is triggered during momentary pauses; do not abort
        if (errorType === 'no-speech') {
          return;
        }
        if (errorType === 'not-allowed' || errorType === 'permission-denied') {
          setStatusMessage('Microphone access denied. Please allow microphone in browser settings.');
          stopListening();
          return;
        }
        setStatusMessage(`Mic: ${errorType}`);
      };

      rec.onend = () => {
        // Automatically restart if user hasn't explicitly clicked stop (e.g., silence timeout on mobile Chrome)
        if (isListeningRef.current) {
          try {
            rec.start();
          } catch {
            const nextRec = createAndStartRecognition();
            if (nextRec) recognitionRef.current = nextRec;
          }
        } else {
          setIsListening(false);
          setInterimText('');
        }
      };

      rec.start();
      return rec;
    } catch {
      setStatusMessage('Could not start speech recognition. Tap Speak to retry.');
      return null;
    }
  };

  const startListening = async () => {
    setStatusMessage('');
    isListeningRef.current = true;
    setIsListening(true);
    baseTextRef.current = remark || voiceTranscript || '';

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      // 1. Start live speech-to-text recognition
      const rec = createAndStartRecognition();
      recognitionRef.current = rec;

      // 2. Optional concurrent MediaRecorder for audio playback memo
      if (navigator.mediaDevices?.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const mediaRecorder = new (window as any).MediaRecorder(stream);
          audioChunksRef.current = [];

          mediaRecorder.ondataavailable = (e: any) => {
            if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
          };

          mediaRecorder.onstop = () => {
            if (audioChunksRef.current.length > 0) {
              const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
              const audioUrl = URL.createObjectURL(audioBlob);
              if (onChangeAudioUriRef.current) onChangeAudioUriRef.current(audioUrl);
            }
            stream.getTracks().forEach((track) => track.stop());
          };

          mediaRecorder.start(250);
          mediaRecorderRef.current = mediaRecorder;
        } catch {
          // If media recording is blocked or unsupported, speech recognition continues unimpeded
        }
      }
    } else {
      // Mobile native simulation fallback
      setStatusMessage('Listening to voice note...');
      setTimeout(() => {
        if (!isListeningRef.current) return;
        const sampleText = 'Discussed bulk requirements. Customer requested catalog and follow-up.';
        const next = baseTextRef.current ? `${baseTextRef.current}\n${sampleText}` : sampleText;
        baseTextRef.current = next;
        onChangeTranscriptRef.current(next);
        onChangeRemarkRef.current(next);
        stopListening();
      }, 3000);
    }
  };

  const stopListening = () => {
    isListeningRef.current = false;
    setIsListening(false);
    setInterimText('');

    if (Platform.OS === 'web') {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // Ignore
        }
        recognitionRef.current = null;
      }

      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch {
          // Ignore
        }
        mediaRecorderRef.current = null;
      }
    }
  };

  const handleClear = () => {
    stopListening();
    baseTextRef.current = '';
    setInterimText('');
    onChangeTranscriptRef.current('');
    onChangeRemarkRef.current('');
    if (onChangeAudioUriRef.current) onChangeAudioUriRef.current(undefined);
  };

  const displayedText = remark || voiceTranscript || '';

  return (
    <View style={styles.container}>
      {/* 1. Header with Label & Badges */}
      <View style={styles.headerRow}>
        <View style={styles.labelCol}>
          <Text style={styles.label}>Voice Remark & Notes</Text>
          <Text style={styles.sublabel}>Speak to transcribe directly into the card</Text>
        </View>
        <View style={styles.badgeRow}>
          {isListening ? (
            <View style={[styles.badge, styles.badgeListening]}>
              <View style={styles.pulseDot} />
              <Text style={styles.badgeListeningText}>LIVE REC</Text>
            </View>
          ) : (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>ORIGINAL</Text>
            </View>
          )}
          <View style={[styles.badge, styles.badgeActive]}>
            <Text style={[styles.badgeText, styles.badgeActiveText]}>AUTO DETECT</Text>
          </View>
        </View>
      </View>

      {/* 2. THE BLACK BOX (Above the mic controls) */}
      <View style={[styles.blackBox, isListening && styles.blackBoxActive]}>
        <View style={styles.blackBoxHeader}>
          <View style={styles.blackBoxBadges}>
            <Text style={styles.blackBoxTitle}>LIVE TRANSCRIPT</Text>
            {isListening ? <Text style={styles.blackBoxStatus}>• LISTENING</Text> : null}
          </View>
          {displayedText ? (
            <Pressable onPress={handleClear} hitSlop={8} style={styles.miniClearBtn}>
              <Icon name="delete" size={15} color="#94A3B8" />
              <Text style={styles.miniClearText}>Clear</Text>
            </Pressable>
          ) : null}
        </View>

        <TextInput
          style={styles.blackBoxInput}
          placeholder="Tap 'Speak / Record' below and talk into your microphone — your spoken words will appear here in real time..."
          placeholderTextColor="#64748B"
          multiline
          numberOfLines={4}
          value={displayedText}
          onChangeText={(val) => {
            baseTextRef.current = val;
            onChangeRemark(val);
            onChangeTranscript(val);
          }}
        />

        {isListening ? (
          <View style={styles.listeningBar}>
            <View style={styles.soundWaveRow}>
              <View style={[styles.soundBar, styles.soundBar1]} />
              <View style={[styles.soundBar, styles.soundBar2]} />
              <View style={[styles.soundBar, styles.soundBar3]} />
              <View style={[styles.soundBar, styles.soundBar2]} />
              <View style={[styles.soundBar, styles.soundBar1]} />
            </View>
            <Text style={styles.listeningBarText}>
              {interimText ? `"${interimText}"` : 'Listening to microphone… speak now'}
            </Text>
          </View>
        ) : null}
      </View>

      {/* 3. Controls Row (Directly BELOW the Black Box) */}
      <View style={styles.controlsRow}>
        <Pressable
          style={[styles.btn, styles.btnSpeak, isListening && styles.btnSpeaking]}
          onPress={isListening ? stopListening : startListening}
          accessibilityRole="button"
          accessibilityLabel={isListening ? 'Stop recording' : 'Speak into microphone'}
        >
          <Icon
            name={isListening ? 'graphic_eq' : 'mic'}
            size={20}
            color="#FFFFFF"
          />
          <Text style={styles.btnSpeakText}>
            {isListening ? 'Stop Speaking' : 'Speak / Record'}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.btn, styles.btnStop, !isListening && styles.btnDisabled]}
          onPress={stopListening}
          disabled={!isListening}
          accessibilityRole="button"
          accessibilityLabel="Stop recording"
        >
          <Icon name="stop" size={20} color={isListening ? '#D97706' : colors.outline} />
          <Text style={[styles.btnStopText, !isListening && styles.btnDisabledText]}>
            Stop
          </Text>
        </Pressable>
      </View>

      {/* 4. Audio Playback attachment if recorded */}
      {audioUri ? (
        <View style={styles.audioRow}>
          <Icon name="volume_up" size={18} color={colors.primary} />
          <Text style={styles.audioText}>Voice memo recorded & attached</Text>
          <Pressable
            style={styles.clearAudioBtn}
            onPress={() => onChangeAudioUri && onChangeAudioUri(undefined)}
          >
            <Icon name="close" size={16} color={colors.onSurfaceVariant} />
          </Pressable>
        </View>
      ) : null}

      {/* 5. Status / Error Message */}
      {statusMessage ? (
        <Text style={styles.statusText}>{statusMessage}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  labelCol: {
    flex: 1,
  },
  label: {
    ...type.bodySm,
    fontWeight: '700',
    color: colors.onSurface,
  },
  sublabel: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginTop: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  badge: {
    backgroundColor: colors.surfaceLow,
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
    borderRadius: radii.sm,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.onSurfaceVariant,
  },
  badgeActive: {
    backgroundColor: colors.primarySoft,
  },
  badgeActiveText: {
    color: colors.primary,
  },
  badgeListening: {
    backgroundColor: '#FEE2E2',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badgeListeningText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#DC2626',
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#DC2626',
  },
  // THE BLACK BOX STYLES
  blackBox: {
    backgroundColor: '#0B0F19',
    borderWidth: 1.5,
    borderColor: '#1E293B',
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  blackBoxActive: {
    borderColor: '#3B82F6',
    shadowColor: '#2563EB',
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  blackBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1E293B',
  },
  blackBoxBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  blackBoxTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#94A3B8',
  },
  blackBoxStatus: {
    fontSize: 10,
    fontWeight: '700',
    color: '#60A5FA',
    letterSpacing: 0.5,
  },
  miniClearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  miniClearText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  blackBoxInput: {
    fontSize: 14,
    lineHeight: 21,
    color: '#F8FAFC',
    minHeight: 84,
    textAlignVertical: 'top',
    paddingVertical: 4,
  },
  listeningBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#1E293B',
  },
  soundWaveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 14,
  },
  soundBar: {
    width: 2.5,
    backgroundColor: '#38BDF8',
    borderRadius: 2,
  },
  soundBar1: { height: 6 },
  soundBar2: { height: 12 },
  soundBar3: { height: 16 },
  listeningBarText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    color: '#38BDF8',
    fontStyle: 'italic',
  },
  // CONTROLS ROW
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 4,
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
    borderRadius: radii.md,
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  btnSpeak: {
    backgroundColor: '#2563EB',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  btnSpeaking: {
    backgroundColor: '#DC2626',
    shadowColor: '#DC2626',
  },
  btnSpeakText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  btnStop: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  btnStopText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#D97706',
  },
  btnDisabled: {
    backgroundColor: colors.surfaceLow,
    borderColor: 'transparent',
    opacity: 0.5,
  },
  btnDisabledText: {
    color: colors.outline,
  },
  // AUDIO ATTACHMENT ROW
  audioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.md,
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  audioText: {
    flex: 1,
    ...type.bodySm,
    fontWeight: '600',
    color: colors.primary,
  },
  clearAudioBtn: {
    padding: 2,
  },
  statusText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '500',
    marginTop: 2,
  },
});
