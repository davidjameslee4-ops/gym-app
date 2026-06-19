import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/contexts/ThemeContext';
import { storage } from '@/src/utils/storage';

export default function TimerScreen() {
  const { colors } = useTheme();
  const [mode, setMode] = useState<'stopwatch' | 'countdown'>('stopwatch');
  
  // Stopwatch
  const [stopwatchTime, setStopwatchTime] = useState(0);
  const [stopwatchRunning, setStopwatchRunning] = useState(false);
  const stopwatchInterval = useRef<NodeJS.Timeout | null>(null);
  
  // Countdown
  const [countdownTime, setCountdownTime] = useState(60);
  const [countdownInput, setCountdownInput] = useState('60');
  const [countdownRunning, setCountdownRunning] = useState(false);
  const countdownInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadSettings();
    return () => {
      if (stopwatchInterval.current) clearInterval(stopwatchInterval.current);
      if (countdownInterval.current) clearInterval(countdownInterval.current);
    };
  }, []);

  const loadSettings = async () => {
    const savedDuration = await storage.getItem('timerDuration', 60) as number;
    setCountdownInput(savedDuration.toString());
  };

  // Stopwatch functions
  const startStopwatch = () => {
    setStopwatchRunning(true);
    stopwatchInterval.current = setInterval(() => {
      setStopwatchTime(prev => prev + 10);
    }, 10);
  };

  const pauseStopwatch = () => {
    setStopwatchRunning(false);
    if (stopwatchInterval.current) {
      clearInterval(stopwatchInterval.current);
    }
  };

  const resetStopwatch = () => {
    setStopwatchRunning(false);
    setStopwatchTime(0);
    if (stopwatchInterval.current) {
      clearInterval(stopwatchInterval.current);
    }
  };

  // Countdown functions
  const startCountdown = () => {
    const duration = parseInt(countdownInput) || 60;
    setCountdownTime(duration);
    setCountdownRunning(true);
    
    let remaining = duration;
    countdownInterval.current = setInterval(() => {
      remaining -= 1;
      setCountdownTime(remaining);
      
      if (remaining <= 0) {
        if (countdownInterval.current) {
          clearInterval(countdownInterval.current);
        }
        setCountdownRunning(false);
        playAlarm();
        Alert.alert('Time&apos;s Up!', 'Your countdown timer has finished.');
      }
    }, 1000);
  };

  const pauseCountdown = () => {
    setCountdownRunning(false);
    if (countdownInterval.current) {
      clearInterval(countdownInterval.current);
    }
  };

  const resetCountdown = () => {
    setCountdownRunning(false);
    const duration = parseInt(countdownInput) || 60;
    setCountdownTime(duration);
    if (countdownInterval.current) {
      clearInterval(countdownInterval.current);
    }
  };

  const playAlarm = async () => {
    try {
      // Note: This requires an actual alarm sound file in production
      // For now, we just rely on the Alert dialog
      console.log('Countdown complete!');
    } catch (error) {
      console.log('Error playing sound:', error);
    }
  };

  const formatTime = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const ms = Math.floor((milliseconds % 1000) / 10);
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Timer</Text>
      </View>

      {/* Mode Selector */}
      <View style={styles.modeSelector}>
        <TouchableOpacity
          style={[
            styles.modeButton,
            { borderColor: colors.border },
            mode === 'stopwatch' && { backgroundColor: colors.primary, borderColor: colors.primary },
          ]}
          onPress={() => setMode('stopwatch')}
        >
          <Ionicons
            name="stopwatch"
            size={24}
            color={mode === 'stopwatch' ? '#FFFFFF' : colors.text}
          />
          <Text
            style={[
              styles.modeButtonText,
              { color: colors.text },
              mode === 'stopwatch' && { color: '#FFFFFF' },
            ]}
          >
            Stopwatch
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.modeButton,
            { borderColor: colors.border },
            mode === 'countdown' && { backgroundColor: colors.primary, borderColor: colors.primary },
          ]}
          onPress={() => setMode('countdown')}
        >
          <Ionicons
            name="timer"
            size={24}
            color={mode === 'countdown' ? '#FFFFFF' : colors.text}
          />
          <Text
            style={[
              styles.modeButtonText,
              { color: colors.text },
              mode === 'countdown' && { color: '#FFFFFF' },
            ]}
          >
            Countdown
          </Text>
        </TouchableOpacity>
      </View>

      {/* Timer Display */}
      <View style={styles.timerDisplay}>
        {mode === 'stopwatch' ? (
          <>
            <Text style={[styles.timerText, { color: colors.text }]}>
              {formatTime(stopwatchTime)}
            </Text>
            <View style={styles.controls}>
              {!stopwatchRunning ? (
                <TouchableOpacity
                  style={[styles.controlButton, styles.startButton, { backgroundColor: colors.primary }]}
                  onPress={startStopwatch}
                >
                  <Ionicons name="play" size={40} color="#FFFFFF" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.controlButton, styles.pauseButton, { backgroundColor: '#FFA500' }]}
                  onPress={pauseStopwatch}
                >
                  <Ionicons name="pause" size={40} color="#FFFFFF" />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.controlButton, styles.resetButton, { backgroundColor: colors.error }]}
                onPress={resetStopwatch}
              >
                <Ionicons name="refresh" size={32} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            {!countdownRunning && (
              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                  Duration (seconds)
                </Text>
                <TextInput
                  style={[
                    styles.durationInput,
                    { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
                  ]}
                  keyboardType="numeric"
                  value={countdownInput}
                  onChangeText={setCountdownInput}
                  placeholder="60"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            )}
            <Text style={[styles.timerText, { color: colors.text }]}>
              {formatCountdown(countdownTime)}
            </Text>
            <View style={styles.controls}>
              {!countdownRunning ? (
                <TouchableOpacity
                  style={[styles.controlButton, styles.startButton, { backgroundColor: colors.primary }]}
                  onPress={startCountdown}
                >
                  <Ionicons name="play" size={40} color="#FFFFFF" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.controlButton, styles.pauseButton, { backgroundColor: '#FFA500' }]}
                  onPress={pauseCountdown}
                >
                  <Ionicons name="pause" size={40} color="#FFFFFF" />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.controlButton, styles.resetButton, { backgroundColor: colors.error }]}
                onPress={resetCountdown}
              >
                <Ionicons name="refresh" size={32} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {/* Quick Timer Presets (Countdown only) */}
      {mode === 'countdown' && !countdownRunning && (
        <View style={styles.presetsContainer}>
          <Text style={[styles.presetsTitle, { color: colors.text }]}>Quick Presets</Text>
          <View style={styles.presetsList}>
            {[30, 60, 90, 120, 180, 300].map(seconds => (
              <TouchableOpacity
                key={seconds}
                style={[styles.presetButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => setCountdownInput(seconds.toString())}
              >
                <Text style={[styles.presetButtonText, { color: colors.text }]}>
                  {seconds < 60 ? `${seconds}s` : `${seconds / 60}m`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  modeSelector: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    gap: 8,
  },
  modeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  timerDisplay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  timerText: {
    fontSize: 64,
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
    letterSpacing: 2,
  },
  controls: {
    flexDirection: 'row',
    gap: 24,
    marginTop: 48,
  },
  controlButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButton: {},
  pauseButton: {},
  resetButton: {},
  inputContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  durationInput: {
    width: 200,
    height: 56,
    borderRadius: 12,
    borderWidth: 2,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  presetsContainer: {
    padding: 16,
  },
  presetsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  presetsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  presetButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  presetButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
