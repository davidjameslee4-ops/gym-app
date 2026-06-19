import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  ScrollView,
  Platform,
  Alert,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '@/src/contexts/ThemeContext';
import { storage } from '@/src/utils/storage';
import { UserProfile } from '@/src/types/workout';
import { useFocusEffect } from 'expo-router';

export default function ProfileScreen() {
  const { colors } = useTheme();
  const [profile, setProfile] = useState<UserProfile>({
    name: '',
    currentWeight: 0,
    goalWeight: 0,
    weightUnit: 'kg',
  });
  const [editing, setEditing] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      loadProfile();
    }, [])
  );

  useEffect(() => {
    loadProfile();
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Needed',
        'Please grant camera roll permissions to upload profile pictures.'
      );
    }
  };

  const loadProfile = async () => {
    const savedProfile = await storage.getItem('userProfile', null) as UserProfile | null;
    if (savedProfile) {
      setProfile(savedProfile);
    }
  };

  const saveProfile = async () => {
    await storage.setItem('userProfile', profile);
    setEditing(false);
    Alert.alert('Success', 'Profile updated successfully!');
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
        setProfile({ ...profile, profilePicture: base64Image });
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Needed',
          'Please grant camera permissions to take photos.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
        setProfile({ ...profile, profilePicture: base64Image });
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const handleImagePicker = () => {
    Alert.alert(
      'Profile Picture',
      'Choose an option',
      [
        { text: 'Take Photo', onPress: takePhoto },
        { text: 'Choose from Gallery', onPress: pickImage },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const weightRemaining = Math.abs(profile.goalWeight - profile.currentWeight);
  const isLosing = profile.currentWeight > profile.goalWeight;
  const goalReached = weightRemaining === 0 && profile.goalWeight > 0;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Profile</Text>
          <TouchableOpacity
            style={[styles.editButton, { backgroundColor: editing ? colors.success : colors.primary }]}
            onPress={() => {
              if (editing) {
                saveProfile();
              } else {
                setEditing(true);
              }
            }}
          >
            <Ionicons name={editing ? 'checkmark' : 'create'} size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {/* Profile Picture */}
          <TouchableOpacity
            style={styles.profilePictureContainer}
            onPress={editing ? handleImagePicker : undefined}
            disabled={!editing}
          >
            {profile.profilePicture ? (
              <Image source={{ uri: profile.profilePicture }} style={styles.profilePicture} />
            ) : (
              <View style={[styles.profilePicturePlaceholder, { backgroundColor: colors.surface }]}>
                <Ionicons name="person" size={64} color={colors.textSecondary} />
              </View>
            )}
            {editing && (
              <View style={[styles.cameraIcon, { backgroundColor: colors.primary }]}>
                <Ionicons name="camera" size={20} color="#FFFFFF" />
              </View>
            )}
          </TouchableOpacity>

          {/* Stats Cards */}
          {!editing && (
            <View style={styles.statsContainer}>
              <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="fitness" size={32} color={colors.primary} />
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {profile.currentWeight} {profile.weightUnit}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Current Weight</Text>
              </View>

              <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="trophy" size={32} color={colors.primary} />
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {profile.goalWeight} {profile.weightUnit}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Goal Weight</Text>
              </View>

              <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons
                  name={isLosing ? 'trending-down' : 'trending-up'}
                  size={32}
                  color={colors.primary}
                />
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {weightRemaining.toFixed(1)} {profile.weightUnit}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  {goalReached ? 'Goal Reached!' : 'Remaining'}
                </Text>
              </View>
            </View>
          )}

          {/* Form Fields */}
          <View style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.formField}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Name</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.background, color: colors.text, borderColor: colors.border },
                ]}
                value={profile.name}
                onChangeText={text => setProfile({ ...profile, name: text })}
                editable={editing}
                placeholder="Enter your name"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.formRow}>
              <View style={styles.formFieldHalf}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Age</Text>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: colors.background, color: colors.text, borderColor: colors.border },
                  ]}
                  value={profile.age?.toString() || ''}
                  onChangeText={text => setProfile({ ...profile, age: parseInt(text) || undefined })}
                  editable={editing}
                  keyboardType="numeric"
                  placeholder="Age"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.formFieldHalf}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Height (cm)</Text>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: colors.background, color: colors.text, borderColor: colors.border },
                  ]}
                  value={profile.height?.toString() || ''}
                  onChangeText={text => setProfile({ ...profile, height: parseInt(text) || undefined })}
                  editable={editing}
                  keyboardType="numeric"
                  placeholder="Height"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={styles.formFieldHalf}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Current Weight</Text>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: colors.background, color: colors.text, borderColor: colors.border },
                  ]}
                  value={profile.currentWeight.toString()}
                  onChangeText={text => setProfile({ ...profile, currentWeight: parseFloat(text) || 0 })}
                  editable={editing}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.formFieldHalf}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Goal Weight</Text>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: colors.background, color: colors.text, borderColor: colors.border },
                  ]}
                  value={profile.goalWeight.toString()}
                  onChangeText={text => setProfile({ ...profile, goalWeight: parseFloat(text) || 0 })}
                  editable={editing}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </View>

            <View style={styles.formField}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Weight Unit</Text>
              <View style={styles.unitSelector}>
                <TouchableOpacity
                  style={[
                    styles.unitButton,
                    { borderColor: colors.border },
                    profile.weightUnit === 'kg' && { backgroundColor: colors.primary, borderColor: colors.primary },
                  ]}
                  onPress={() => editing && setProfile({ ...profile, weightUnit: 'kg' })}
                  disabled={!editing}
                >
                  <Text
                    style={[
                      styles.unitButtonText,
                      { color: colors.text },
                      profile.weightUnit === 'kg' && { color: '#FFFFFF' },
                    ]}
                  >
                    Kilograms (kg)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.unitButton,
                    { borderColor: colors.border },
                    profile.weightUnit === 'lbs' && { backgroundColor: colors.primary, borderColor: colors.primary },
                  ]}
                  onPress={() => editing && setProfile({ ...profile, weightUnit: 'lbs' })}
                  disabled={!editing}
                >
                  <Text
                    style={[
                      styles.unitButtonText,
                      { color: colors.text },
                      profile.weightUnit === 'lbs' && { color: '#FFFFFF' },
                    ]}
                  >
                    Pounds (lbs)
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {editing && (
            <TouchableOpacity
              style={[styles.cancelButton, { backgroundColor: colors.error }]}
              onPress={() => {
                setEditing(false);
                loadProfile();
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  editButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  profilePictureContainer: {
    alignSelf: 'center',
    marginBottom: 24,
  },
  profilePicture: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  profilePicturePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraIcon: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 11,
    textAlign: 'center',
  },
  formCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  formField: {
    marginBottom: 16,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  formFieldHalf: {
    flex: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  unitSelector: {
    gap: 8,
  },
  unitButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
  },
  unitButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
