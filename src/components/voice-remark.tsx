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
  const recognitionRef = useRef<IWindowSpeechRecognition | null>(null);
  const mediaRecorderRef = useRef<any>(null);
  const audioChunksRef = useRef<any[]>([]);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const SpeechRecognitionClass =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;

      if (SpeechRecognitionClass) {
        try {
          const rec = new SpeechRecognitionClass() as IWindowSpeechRecognition;
          rec.continuous = true;
          rec.interimResults = true;
          rec.lang = 'en-US';

          rec.onresult = (event: any) => {
            let transcriptText = '';
            for (let i = 0; i < event.results.length; i++) {
              transcriptText += event.results[i][0].transcript + ' ';
            }
            const cleanTranscript = transcriptText.trim();
            onChangeTranscript(cleanTranscript);

            // Also update remark if empty or append
            if (cleanTranscript) {
              onChangeRemark(cleanTranscript);
            }
          };

          rec.onerror = (event: any) => {
            setStatusMessage(`Speech error: ${event.error || 'Check microphone'}`);
            setIsListening(false);
          };

          rec.onend = () => {
            setIsListening(false);
          };

          recognitionRef.current = rec;
        } catch {
          // Ignore
        }
      }
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignore
        }
      }
    };
  }, [onChangeRemark, onChangeTranscript]);

  const startListening = async () => {
    setStatusMessage('');
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      // 1. Web Speech recognition
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
          setIsListening(true);
        } catch {
          try {
            recognitionRef.current.stop();
            recognitionRef.current.start();
            setIsListening(true);
          } catch {
            setStatusMessage('Microphone access needed');
          }
        }
      }

      // 2. Audio recording via MediaRecorder
      if (navigator.mediaDevices?.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const mediaRecorder = new (window as any).MediaRecorder(stream);
          audioChunksRef.current = [];

          mediaRecorder.ondataavailable = (e: any) => {
            if (e.data.size > 0) audioChunksRef.current.push(e.data);
          };

          mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            const audioUrl = URL.createObjectURL(audioBlob);
            if (onChangeAudioUri) onChangeAudioUri(audioUrl);
            stream.getTracks().forEach((track) => track.stop());
          };

          mediaRecorder.start();
          mediaRecorderRef.current = mediaRecorder;
        } catch {
          // Optional audio capture error ignored
        }
      }
    } else {
      // Mobile fallback simulation
      setIsListening(true);
      setStatusMessage('Listening to audio...');
      setTimeout(() => {
        setIsListening(false);
        const sampleText = 'Discussed bulk requirements. Customer requested callback on Monday.';
        onChangeTranscript(sampleText);
        onChangeRemark(remark ? `${remark}\n${sampleText}` : sampleText);
      }, 3000);
    }
  };

  const stopListening = () => {
    setIsListening(false);
    if (Platform.OS === 'web') {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
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
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>Remark</Text>
        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>ORIGINAL</Text>
          </View>
          <View style={[styles.badge, styles.badgeActive]}>
            <Text style={[styles.badgeText, styles.badgeActiveText]}>AUTO DETECT</Text>
          </View>
        </View>
      </View>

      <TextInput
        style={styles.textarea}
        placeholder="Enter or speak your remark..."
        placeholderTextColor={colors.outline}
        multiline
        numberOfLines={3}
        value={remark}
        onChangeText={onChangeRemark}
      />

      <View style={styles.controlsRow}>
        <Pressable
          style={[styles.btn, styles.btnSpeak, isListening && styles.btnListening]}
          onPress={isListening ? stopListening : startListening}
        >
          <Icon
            name={isListening ? 'graphic_eq' : 'mic'}
            size={18}
            color={colors.surface}
          />
          <Text style={styles.btnSpeakText}>
            {isListening ? 'Listening...' : 'Speak'}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.btn, styles.btnStop, !isListening && styles.btnDisabled]}
          onPress={stopListening}
          disabled={!isListening}
        >
          <Icon name="stop" size={18} color={isListening ? colors.favorite : colors.outline} />
          <Text style={[styles.btnStopText, !isListening && styles.btnDisabledText]}>
            Stop
          </Text>
        </Pressable>
      </View>

      {/* Transcript Preview Box matching screenshot */}
      <View style={styles.transcriptBox}>
        <View style={styles.transcriptHeader}>
          <Text style={styles.transcriptLabel}>ORIGINAL</Text>
          <View style={styles.detectBadge}>
            <Text style={styles.detectBadgeText}>AUTO DETECT</Text>
          </View>
        </View>
        <Text style={styles.transcriptText}>
          {voiceTranscript || 'Spoken text will appear here...'}
        </Text>
      </View>

      {/* Audio Playback or indicator */}
      {audioUri ? (
        <View style={styles.audioRow}>
          <Icon name="volume_up" size={18} color={colors.primary} />
          <Text style={styles.audioText}>Recorded Audio Memo Attached</Text>
          <Pressable
            style={styles.clearAudioBtn}
            onPress={() => onChangeAudioUri && onChangeAudioUri(undefined)}
          >
            <Icon name="close" size={16} color={colors.onSurfaceVariant} />
          </Pressable>
        </View>
      ) : null}

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
  },
  label: {
    ...type.bodySm,
    fontWeight: '600',
    color: colors.onSurface,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  badge: {
    backgroundColor: colors.surfaceLow,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
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
  textarea: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: type.body.fontSize,
    color: colors.onSurface,
    minHeight: 76,
    textAlignVertical: 'top',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    gap: spacing.xs,
  },
  btnSpeak: {
    backgroundColor: '#2563EB',
  },
  btnListening: {
    backgroundColor: '#DC2626',
  },
  btnSpeakText: {
    fontSize: type.body.fontSize,
    fontWeight: '700',
    color: colors.surface,
  },
  btnStop: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  btnStopText: {
    fontSize: type.body.fontSize,
    fontWeight: '700',
    color: '#D97706',
  },
  btnDisabled: {
    backgroundColor: colors.surfaceLow,
    borderColor: 'transparent',
    opacity: 0.6,
  },
  btnDisabledText: {
    color: colors.outline,
  },
  transcriptBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  transcriptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  transcriptLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.onSurfaceVariant,
  },
  detectBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  detectBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#2563EB',
  },
  transcriptText: {
    ...type.bodySm,
    color: colors.onSurfaceVariant,
    fontStyle: 'italic',
  },
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
    fontSize: 11,
    color: colors.favorite,
    marginTop: 2,
  },
});
