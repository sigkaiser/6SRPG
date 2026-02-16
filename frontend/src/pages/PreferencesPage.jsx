import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import { useGlobalState } from '../context/GlobalState';
import { updateUserPreferences } from '../services/api';
import schema from '../../../backend/data/schema_v2.json';
import SidebarLayout from '../components/SidebarLayout';
import homeBg from '../../assets/home.png';

const PreferencesPage = () => {
  const { currentUser, exercises, updateUser, setError } = useGlobalState();
  const [preferences, setPreferences] = useState(currentUser?.preferences || {
    trainingGoals: [],
    excludedEquipment: [],
    excludedMuscles: [],
    excludedExercises: [],
    customInstructions: '',
  });

  useEffect(() => {
    if (currentUser?.preferences) {
      setPreferences(currentUser.preferences);
    }
  }, [currentUser]);

  const customStyles = {
    option: (provided) => ({
      ...provided,
      color: 'black'
    }),
    singleValue: (provided) => ({
      ...provided,
      color: 'black'
    }),
    multiValue: (provided) => ({
      ...provided,
      color: 'black'
    }),
    input: (provided) => ({
      ...provided,
      color: 'black'
    }),
  };

  const trainingGoalsOptions = [
    { value: 'increase upper body strength', label: 'Increase upper body strength' },
    { value: 'increase lower body strength', label: 'Increase lower body strength' },
    { value: 'improve core strength', label: 'Improve core strength' },
    { value: 'improve cardio endurance', label: 'Improve cardio endurance' },
    { value: 'improve flexibility mobility', label: 'Improve flexibility mobility' },
    { value: 'improve explosive power', label: 'Improve explosive power' },
    { value: 'general fitness', label: 'General fitness' },
    { value: 'weight loss', label: 'Weight loss' },
    { value: 'muscle hypertrophy (size)', label: 'Muscle hypertrophy (size)' },
    { value: 'active recovery / injury rehab', label: 'Active recovery / injury rehab' },
  ];

  const formatLabel = (value) =>
    String(value)
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');

  const excludedEquipmentOptions =
    (schema?.items?.properties?.equipment?.items?.enum || [])
      .filter(Boolean)
      .map((equipment) => ({ value: equipment, label: formatLabel(equipment) }));

  const excludedMusclesOptions =
    (schema?.items?.properties?.primaryMuscles?.items?.enum || [])
      .map((muscle) => ({ value: muscle, label: formatLabel(muscle) }));

  const excludedExercisesOptions = (exercises || []).map((exercise) => ({
    value: exercise.name,
    label: exercise.name,
  }));

  const handlePreferenceChange = async (name, value) => {
    const newPreferences = { ...preferences, [name]: value };
    setPreferences(newPreferences);
    try {
      const updatedUser = await updateUserPreferences(currentUser.id, newPreferences);
      updateUser(updatedUser.user);
    } catch (error) {
      setError(error.message);
    }
  };

  const renderContentArea = () => {
    return (
      <div className="p-6 bg-gray-100 text-gray-900 rounded-lg shadow-xl">
        <h2 className="text-2xl font-bold mb-4 text-yellow-400">Preferences</h2>
        <div className="space-y-4">
          <div>
            <label className="block mb-2 font-bold">Training Goals</label>
            <Select
              isMulti
              styles={customStyles}
              options={trainingGoalsOptions}
              value={trainingGoalsOptions.filter(o => (preferences.trainingGoals || []).includes(o.value))}
              onChange={selectedOptions => handlePreferenceChange('trainingGoals', (selectedOptions || []).map(o => o.value))}
            />
          </div>
          <div>
            <label className="block mb-2 font-bold">Excluded Equipment</label>
            <Select
              isMulti
              styles={customStyles}
              options={excludedEquipmentOptions}
              value={excludedEquipmentOptions.filter(o => (preferences.excludedEquipment || []).includes(o.value))}
              onChange={selectedOptions => handlePreferenceChange('excludedEquipment', (selectedOptions || []).map(o => o.value))}
            />
          </div>
          <div>
            <label className="block mb-2 font-bold">Excluded Muscles</label>
            <Select
              isMulti
              styles={customStyles}
              options={excludedMusclesOptions}
              value={excludedMusclesOptions.filter(o => (preferences.excludedMuscles || []).includes(o.value))}
              onChange={selectedOptions => handlePreferenceChange('excludedMuscles', (selectedOptions || []).map(o => o.value))}
            />
          </div>
          <div>
            <label className="block mb-2 font-bold">Excluded Exercises</label>
            <Select
              isMulti
              styles={customStyles}
              options={excludedExercisesOptions}
              value={excludedExercisesOptions.filter(o => (preferences.excludedExercises || []).includes(o.value))}
              onChange={selectedOptions => handlePreferenceChange('excludedExercises', (selectedOptions || []).map(o => o.value))}
            />
          </div>
          <div>
            <label className="block mb-2 font-bold">Custom Instructions</label>
            <textarea
              className="w-full p-2 border rounded"
              value={preferences.customInstructions || ''}
              onChange={e => handlePreferenceChange('customInstructions', e.target.value)}
            />
          </div>
        </div>
      </div>
    );
  };

  const buttons = [
    { label: 'Return to House', to: '/home', fontColor: '#d49942' },
  ];

  return (
    <SidebarLayout
      bgImage={homeBg}
      pageTitle="Preferences"
      buttons={buttons}
      renderContent={renderContentArea}
      currentUser={currentUser}
      buttonJustify="center"
      isAuthRequired={true}
      fontColor="black"
    />
  );
};

export default PreferencesPage;
