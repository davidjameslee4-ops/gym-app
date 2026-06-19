import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/contexts/ThemeContext';
import { storage } from '@/src/utils/storage';
import { UserProfile } from '@/src/types/workout';

export default function SettingsScreen() {
  const { colors, theme, toggleTheme } = useTheme();
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const profile = await storage.getItem('userProfile', null) as UserProfile | null;
    if (profile) {
      setWeightUnit(profile.weightUnit);
    }
  };

  const handleWeightUnitChange = async (unit: 'kg' | 'lbs') => {
    setWeightUnit(unit);
    const profile = await storage.getItem('userProfile', null) as UserProfile | null;
    if (profile) {
      await storage.setItem('userProfile', { ...profile, weightUnit: unit });
    }
  };

  const handleExportData = async () => {
    try {
      const programs = await storage.getItem('workoutPrograms', []);
      const logs = await storage.getItem('workoutLogs', []);
      const profile = await storage.getItem('userProfile', null);
      
      const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        data: {
          programs,
          logs,
          profile,
        },
      };

      const jsonString = JSON.stringify(exportData, null, 2);
      console.log('Export data:', jsonString);
      
      Alert.alert(
        'Export Data',
        'Your data has been prepared for export. In a production app, this would save to a file or share via the system share sheet.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Error', 'Failed to export data');
    }
  };

  const handleImportData = () => {
    Alert.alert(
      'Import Data',
      'In a production app, this would allow you to select and import a previously exported data file.',
      [{ text: 'OK' }]
    );
  };

  const handleBackupData = async () => {
    try {
      const programs = await storage.getItem('workoutPrograms', []);
      const logs = await storage.getItem('workoutLogs', []);
      const profile = await storage.getItem('userProfile', null);
      
      const backupData = {
        programs,
        logs,
        profile,
        timestamp: new Date().toISOString(),
      };

      await storage.setItem('backup_latest', backupData);
      Alert.alert('Success', 'Data backed up successfully!');
    } catch (error) {
      console.error('Backup error:', error);
      Alert.alert('Error', 'Failed to backup data');
    }
  };

  const handleRestoreData = async () => {
    Alert.alert(
      'Restore Data',
      'This will restore your data from the last backup. Current data will be replaced. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          style: 'destructive',
          onPress: async () => {
            try {
              const backup = await storage.getItem('backup_latest', null) as any;
              if (!backup) {
                Alert.alert('Error', 'No backup found');
                return;
              }

              if (backup.programs) await storage.setItem('workoutPrograms', backup.programs);
              if (backup.logs) await storage.setItem('workoutLogs', backup.logs);
              if (backup.profile) await storage.setItem('userProfile', backup.profile);

              Alert.alert('Success', 'Data restored successfully! Please restart the app.');
            } catch (error) {
              console.error('Restore error:', error);
              Alert.alert('Error', 'Failed to restore data');
            }
          },
        },
      ]
    );
  };

  const handleClearAllData = () => {
    Alert.alert(
      'Clear All Data',
      'This will permanently delete all your workout data, programs, and history. This action cannot be undone. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            try {
              await storage.removeItem('workoutPrograms');
              await storage.removeItem('workoutLogs');
              await storage.removeItem('userProfile');
              await storage.removeItem('backup_latest');
              Alert.alert('Success', 'All data cleared. Please restart the app.');
            } catch (error) {
              console.error('Clear data error:', error);
              Alert.alert('Error', 'Failed to clear data');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Settings</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Appearance */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Appearance</Text>
          <View style={[styles.settingCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Ionicons name="moon" size={24} color={colors.text} />
                <View style={styles.settingText}>
                  <Text style={[styles.settingTitle, { color: colors.text }]}>Dark Mode</Text>
                  <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                    {theme === 'dark' ? 'Enabled' : 'Disabled'}
                  </Text>
                </View>
              </View>
              <Switch
                value={theme === 'dark'}
                onValueChange={toggleTheme}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </View>

        {/* Units */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Units</Text>
          <View style={[styles.settingCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Weight Unit</Text>
            <View style={styles.unitButtons}>
              <TouchableOpacity
                style={[
                  styles.unitOptionButton,
                  { borderColor: colors.border },
                  weightUnit === 'kg' && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
                onPress={() => handleWeightUnitChange('kg')}
              >
                <Text
                  style={[
                    styles.unitOptionText,
                    { color: colors.text },
                    weightUnit === 'kg' && { color: '#FFFFFF' },
                  ]}
                >
                  Kilograms (kg)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.unitOptionButton,
                  { borderColor: colors.border },
                  weightUnit === 'lbs' && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
                onPress={() => handleWeightUnitChange('lbs')}
              >
                <Text
                  style={[
                    styles.unitOptionText,
                    { color: colors.text },
                    weightUnit === 'lbs' && { color: '#FFFFFF' },
                  ]}
                >
                  Pounds (lbs)
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Data Management */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Data Management</Text>
          
          <TouchableOpacity
            style={[styles.settingCard, styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={handleExportData}
          >
            <Ionicons name="download-outline" size={24} color={colors.primary} />
            <View style={styles.settingText}>
              <Text style={[styles.settingTitle, { color: colors.text }]}>Export Data</Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                Save all your data to a file
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.settingCard, styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={handleImportData}
          >
            <Ionicons name="cloud-upload-outline" size={24} color={colors.primary} />
            <View style={styles.settingText}>
              <Text style={[styles.settingTitle, { color: colors.text }]}>Import Data</Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                Restore data from a file
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.settingCard, styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={handleBackupData}
          >
            <Ionicons name="shield-checkmark-outline" size={24} color={colors.success} />
            <View style={styles.settingText}>
              <Text style={[styles.settingTitle, { color: colors.text }]}>Backup Data</Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                Create a local backup
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.settingCard, styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={handleRestoreData}
          >
            <Ionicons name="refresh-outline" size={24} color={colors.primary} />
            <View style={styles.settingText}>
              <Text style={[styles.settingTitle, { color: colors.text }]}>Restore Data</Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                Restore from latest backup
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.error }]}>Danger Zone</Text>
          <TouchableOpacity
            style={[styles.settingCard, styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.error }]}
            onPress={handleClearAllData}
          >
            <Ionicons name="trash-outline" size={24} color={colors.error} />
            <View style={styles.settingText}>
              <Text style={[styles.settingTitle, { color: colors.error }]}>Clear All Data</Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                Permanently delete all data
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={[styles.appInfo, { borderTopColor: colors.border }]}>
          <Text style={[styles.appInfoText, { color: colors.textSecondary }]}>
            Avner&apos;s Gym Tracker v1.0.0
          </Text>
          <Text style={[styles.appInfoText, { color: colors.textSecondary }]}>
            All data is stored locally on your device
          </Text>
        </View>
      </ScrollView>
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
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  settingCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    marginLeft: 12,
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
  },
  unitButtons: {
    gap: 8,
  },
  unitOptionButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
  },
  unitOptionText: {
    fontSize: 15,
    fontWeight: '600',
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appInfo: {
    padding: 16,
    borderTopWidth: 1,
    alignItems: 'center',
    marginTop: 24,
    gap: 8,
  },
  appInfoText: {
    fontSize: 12,
  },
});
