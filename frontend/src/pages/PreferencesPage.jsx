import React, { useState, useEffect, useMemo } from 'react';
import { useGlobalState } from '../context/GlobalState';
import SidebarLayout from '../components/SidebarLayout';
import homeBg from '../../assets/home.png';
import { updateUserPreferences, getSchema, getExercises } from '../services/api';

const PreferencesPage = () => {
  const { currentUser, updateUser, error: globalError, clearError, setError } = useGlobalState();

  const [preferences, setPreferences] = useState(currentUser?.preferences || {});
  const [equipmentOptions, setEquipmentOptions] = useState([]);
  const [muscleOptions, setMuscleOptions] = useState([]);
  const [exerciseOptions, setExerciseOptions] = useState([]);

  useEffect(() => {
    if (currentUser) {
      setPreferences(currentUser.preferences);
    }
    const fetchOptions = async () => {
      try {
        const schemaRes = await getSchema();
        if (schemaRes.success) {
          setEquipmentOptions(schemaRes.data.properties.equipment.enum.filter(e => e));
          setMuscleOptions(schemaRes.data.properties.primaryMuscles.items[0].enum.filter(m => m));
        } else {
          setError(schemaRes.message);
        }

        const exercisesRes = await getExercises();
        if (exercisesRes.success) {
          setExerciseOptions(exercisesRes.data.map(e => e.name));
        } else {
          setError(exercisesRes.message);
        }
      } catch (error) {
        setError(error.message);
      }
    };

    fetchOptions();
  }, [currentUser, setError]);

  const handlePreferenceChange = async (field, value) => {
    const updatedPreferences = { ...preferences, [field]: value };
    setPreferences(updatedPreferences);
    try {
      const updatedUser = await updateUserPreferences(currentUser._id, updatedPreferences);
      updateUser(updatedUser.user);
    } catch (error) {
      setError(error.message);
    }
  };

  const buttons = [
    { label: 'Return to House', to: '/home' },
  ];

  const trainingGoalOptions = useMemo(() => [
    "Increase upper body strength", "Increase lower body strength", "Improve core strength",
    "Improve cardio endurance", "Improve flexibility mobility", "Improve explosive power",
    "General fitness", "Weight loss", "Muscle hypertrophy (size)", "Active recovery / injury rehab"
  ], []);

  const renderContentArea = () => {
    if (!currentUser) return <p>Loading...</p>;

    return (
      <div className="p-6 bg-gray-100 text-gray-900 rounded-lg shadow-xl overflow-auto" style={{ maxHeight: '80vh' }}>
        <h2 className="text-2xl font-bold mb-4 text-yellow-400">Preferences</h2>

        <div className="space-y-4">
          <MultiSelectDropdown
            label="Training Goals"
            options={trainingGoalOptions}
            selected={preferences.trainingGoals || []}
            onChange={(selected) => handlePreferenceChange('trainingGoals', selected)}
          />
          <MultiSelectDropdown
            label="Excluded Equipment"
            options={equipmentOptions}
            selected={preferences.excludedEquipment || []}
            onChange={(selected) => handlePreferenceChange('excludedEquipment', selected)}
          />
          <MultiSelectDropdown
            label="Excluded Muscles"
            options={muscleOptions}
            selected={preferences.excludedMuscles || []}
            onChange={(selected) => handlePreferenceChange('excludedMuscles', selected)}
          />
          <MultiSelectDropdown
            label="Excluded Exercises"
            options={exerciseOptions}
            selected={preferences.excludedExercises || []}
            onChange={(selected) => handlePreferenceChange('excludedExercises', selected)}
          />
          <div>
            <label className="block text-lg font-medium text-gray-700">Custom Instructions</label>
            <textarea
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              rows="4"
              value={preferences.customInstructions || ''}
              onChange={(e) => handlePreferenceChange('customInstructions', e.target.value)}
            ></textarea>
          </div>
        </div>
      </div>
    );
  };

  return (
    <SidebarLayout
      bgImage={homeBg}
      pageTitle="Preferences"
      buttons={buttons}
      renderContent={renderContentArea}
      error={globalError}
      clearError={clearError}
      currentUser={currentUser}
      buttonJustify="center"
      isAuthRequired={true}
    />
  );
};

const MultiSelectDropdown = ({ label, options, selected, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (option) => {
    const newSelected = selected.includes(option)
      ? selected.filter(item => item !== option)
      : [...selected, option];
    onChange(newSelected);
  };

  return (
    <div className="relative">
      <label className="block text-lg font-medium text-gray-700">{label}</label>
      <button
        type="button"
        className="mt-1 block w-full rounded-md border border-gray-300 bg-white py-2 px-3 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm text-left"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="block truncate">{selected.join(', ') || `Select ${label}...`}</span>
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
          {options.map(option => (
            <div
              key={option}
              className="text-gray-900 cursor-default select-none relative py-2 pl-3 pr-9 hover:bg-indigo-600 hover:text-white"
              onClick={() => handleSelect(option)}
            >
              <span className={`font-normal block truncate ${selected.includes(option) ? 'font-semibold' : ''}`}>
                {option}
              </span>
              {selected.includes(option) && (
                <span className="text-indigo-600 absolute inset-y-0 right-0 flex items-center pr-4">
                  &#10003;
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PreferencesPage;
