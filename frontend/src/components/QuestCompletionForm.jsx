import React, { useState } from 'react';
import { createPortal } from 'react-dom';

const QuestCompletionForm = ({ quest, onSubmit, onClose }) => {
  const [loggedExercises, setLoggedExercises] = useState(
    quest.exercises.map(ex => ({
      name: ex.name,
      sets: ex.sets,
      reps: ex.reps || null,
      duration: ex.duration || null,
      weight: null,
    }))
  );

  const handleInputChange = (exerciseIndex, field, value) => {
    const updatedLogs = [...loggedExercises];
    // Ensure value is a number or null
    const numericValue = value === '' ? null : Number(value);
    updatedLogs[exerciseIndex] = {
      ...updatedLogs[exerciseIndex],
      [field]: numericValue,
    };
    setLoggedExercises(updatedLogs);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(quest.questId, loggedExercises);
  };

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-800 text-white p-6 rounded-lg shadow-xl max-w-lg w-full">
        <h2 className="text-2xl font-bold mb-4">Complete Quest: {quest.title}</h2>
        <form onSubmit={handleSubmit}>
          {loggedExercises.map((log, index) => (
            <div key={index} className="mb-4 p-3 bg-gray-700 rounded">
              <h3 className="font-semibold text-yellow-400">{log.name}</h3>
              <p className="text-sm text-gray-400 mb-2">Required: {quest.exercises[index].sets} sets of {quest.exercises[index].reps ? `${quest.exercises[index].reps} reps` : `${quest.exercises[index].duration}s`}</p>
              <div className="grid grid-cols-2 gap-4">
                {log.reps !== null && (
                  <label className="block">
                    <span className="text-gray-300">Reps</span>
                    <input
                      type="number"
                      className="w-full bg-gray-900 rounded p-2 mt-1"
                      value={log.reps || ''}
                      onChange={(e) => handleInputChange(index, 'reps', e.target.value)}
                    />
                  </label>
                )}
                {log.reps !== null && (
                   <label className="block">
                    <span className="text-gray-300">Weight (kg)</span>
                    <input
                      type="number"
                      step="0.5"
                      className="w-full bg-gray-900 rounded p-2 mt-1"
                      value={log.weight || ''}
                      onChange={(e) => handleInputChange(index, 'weight', e.target.value)}
                    />
                  </label>
                )}
                {log.duration !== null && (
                  <label className="block col-span-2">
                    <span className="text-gray-300">Duration (seconds)</span>
                    <input
                      type="number"
                      className="w-full bg-gray-900 rounded p-2 mt-1"
                      value={log.duration || ''}
                      onChange={(e) => handleInputChange(index, 'duration', e.target.value)}
                    />
                  </label>
                )}
              </div>
            </div>
          ))}
          <div className="flex justify-end gap-4 mt-6">
            <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-600 hover:bg-gray-500 rounded">
              Cancel
            </button>
            <button type="submit" className="py-2 px-4 bg-green-600 hover:bg-green-500 rounded">
              Turn In Quest
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default QuestCompletionForm;
