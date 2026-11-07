import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View, Clipboard } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/contexts/ThemeContext';
import { BuiltExport, buildExport, ExportSummary } from '@/src/utils/dataTransfer';
import { describeSummary } from '@/src/utils/dataSummary';

const copyText = async (text: string): Promise<boolean> => {
  if (Platform.OS === 'web') {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {}
    // Older browsers: copy through a hidden text box.
    const box = document.createElement('textarea');
    box.value = text;
    box.setAttribute('readonly', '');
    box.style.position = 'fixed';
    box.style.opacity = '0';
    document.body.appendChild(box);
    box.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(box);
    return ok;
  }
  Clipboard.setString(text);
  return true;
};

const shareText = async (exported: BuiltExport): Promise<'shared' | 'downloaded' | 'cancelled'> => {
  const title = 'Gym app data';
  if (Platform.OS === 'web') {
    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      try {
        await (navigator as any).share({ title, text: exported.text });
        return 'shared';
      } catch {
        return 'cancelled';
      }
    }
    const blob = new Blob([exported.text], { type: exported.packed ? 'text/plain' : 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `gym-app-export-${stamp}.${exported.packed ? 'txt' : 'json'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return 'downloaded';
  }
  const result = await Share.share({ title, message: exported.text });
  return result.action === Share.dismissedAction ? 'cancelled' : 'shared';
};

export default function ExportDataScreen() {
  const { colors } = useTheme();
  const [exported, setExported] = useState<BuiltExport | null>(null);
  const [failed, setFailed] = useState(false);
  const [note, setNote] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  useEffect(() => {
    let alive = true;
    buildExport()
      .then(e => alive && setExported(e))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  const onCopy = async () => {
    if (!exported) return;
    try {
      const ok = await copyText(exported.text);
      setNote(ok
        ? { kind: 'ok', text: 'Copied. Now open WhatsApp, paste it into a chat with yourself and send it.' }
        : { kind: 'error', text: 'Couldn\'t copy on this browser. Use Share instead.' });
    } catch {
      setNote({ kind: 'error', text: 'Couldn\'t copy. Try Share instead.' });
    }
  };

  const onShare = async () => {
    if (!exported) return;
    try {
      const how = await shareText(exported);
      if (how === 'downloaded') setNote({ kind: 'ok', text: 'Saved as a file to your downloads.' });
      else if (how === 'shared') setNote({ kind: 'ok', text: 'Shared. Send it to yourself, then import it on the other phone.' });
    } catch {
      setNote({ kind: 'error', text: 'Couldn\'t open the share sheet. Try Copy instead.' });
    }
  };

  const summary: ExportSummary | null = exported ? exported.summary : null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/settings'))}
          style={styles.back}
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Export data</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.lead, { color: colors.text }]}>
          Copy everything from this phone, send it to yourself on WhatsApp, then paste it into Import data on your other phone.
        </Text>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {failed ? (
            <Text style={[styles.body, { color: colors.error }]}>Couldn't read your data on this phone.</Text>
          ) : !summary ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <>
              <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>What's in it</Text>
              <Text style={[styles.body, { color: colors.text }]}>{describeSummary(summary)}</Text>
              {exported?.packed ? (
                <Text style={[styles.small, { color: colors.textSecondary }]}>
                  Your history is big, so the copy is packed to fit in one WhatsApp message. Paste it the same way; Import reads it.
                </Text>
              ) : null}
            </>
          )}
        </View>

        <TouchableOpacity
          testID="export-copy"
          disabled={!exported}
          onPress={onCopy}
          style={[styles.button, { backgroundColor: colors.primary, opacity: exported ? 1 : 0.5 }]}
        >
          <Ionicons name="copy-outline" size={20} color="#FFFFFF" />
          <Text style={styles.buttonText}>Copy to clipboard</Text>
        </TouchableOpacity>

        <TouchableOpacity
          testID="export-share"
          disabled={!exported}
          onPress={onShare}
          style={[styles.buttonOutline, { borderColor: colors.primary, opacity: exported ? 1 : 0.5 }]}
        >
          <Ionicons name="share-outline" size={20} color={colors.primary} />
          <Text style={[styles.buttonOutlineText, { color: colors.primary }]}>
            {Platform.OS === 'web' ? 'Share or download' : 'Share'}
          </Text>
        </TouchableOpacity>

        {note ? (
          <Text
            testID="export-note"
            style={[styles.note, { color: note.kind === 'ok' ? colors.success : colors.error }]}
          >
            {note.text}
          </Text>
        ) : null}

        <Text style={[styles.small, { color: colors.textSecondary }]}>
          Nothing leaves your phone until you send it yourself. This copy is a snapshot of right now.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  back: { padding: 4, marginRight: 4 },
  headerTitle: { fontSize: 22, fontWeight: 'bold' },
  content: { padding: 16, gap: 14 },
  lead: { fontSize: 16, lineHeight: 22 },
  card: { padding: 16, borderRadius: 12, borderWidth: 1, gap: 8, minHeight: 90, justifyContent: 'center' },
  cardLabel: { fontSize: 13, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 22 },
  small: { fontSize: 13, lineHeight: 18 },
  note: { fontSize: 15, fontWeight: '600', lineHeight: 21 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 12,
  },
  buttonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  buttonOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 15,
    borderRadius: 12,
    borderWidth: 2,
  },
  buttonOutlineText: { fontSize: 17, fontWeight: '700' },
});
