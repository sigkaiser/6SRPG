import React, { createContext, useReducer, useContext, useEffect } from 'react';

// Initial state
import { recalculateUserStats as apiRecalculateUserStats } from '../services/api'; // Added import

const initialState = {
  currentUser: null,
  currentUserDetailedContributions: null, // Added for stat contributions
  isLoadingStats: false, // Added for loading state of stats recalculation
  exercises: [],
  loadingExercises: false,
  error: null,
};

// Action types
const LOGIN_SUCCESS = 'LOGIN_SUCCESS';
const LOGOUT = 'LOGOUT';
const LOAD_EXERCISES_START = 'LOAD_EXERCISES_START';
const LOAD_EXERCISES_SUCCESS = 'LOAD_EXERCISES_SUCCESS';
const LOAD_EXERCISES_FAIL = 'LOAD_EXERCISES_FAIL';
const SET_ERROR = 'SET_ERROR';
const CLEAR_ERROR = 'CLEAR_ERROR';
const RECALCULATE_STATS_START = 'RECALCULATE_STATS_START'; // Added
const RECALCULATE_STATS_SUCCESS = 'RECALCULATE_STATS_SUCCESS'; // Added
const RECALCULATE_STATS_FAIL = 'RECALCULATE_STATS_FAIL'; // Added

// Reducer
function globalReducer(state, action) {
  switch (action.type) {
    case LOGIN_SUCCESS:
      // Reset detailed contributions on new login
      return { ...state, currentUser: action.payload, currentUserDetailedContributions: null, error: null };
    case LOGOUT:
      return { ...state, currentUser: null, currentUserDetailedContributions: null, error: null };
    case LOAD_EXERCISES_START:
      return { ...state, loadingExercises: true, error: null };
    case LOAD_EXERCISES_SUCCESS:
      return { ...state, exercises: action.payload, loadingExercises: false, error: null };
    case LOAD_EXERCISES_FAIL:
      return { ...state, loadingExercises: false, error: action.payload };
    case SET_ERROR:
      return { ...state, error: action.payload };
    case CLEAR_ERROR:
      return { ...state, error: null };
    case RECALCULATE_STATS_START: // Added
      return { ...state, isLoadingStats: true, error: null };
    case RECALCULATE_STATS_SUCCESS: // Added
      return {
        ...state,
        isLoadingStats: false,
        currentUser: action.payload.user,
        currentUserDetailedContributions: action.payload.detailedContributions,
        error: null
      };
    case RECALCULATE_STATS_FAIL: // Added
      return { ...state, isLoadingStats: false, error: action.payload };
    default:
      return state;
  }
}

// Create Context
const GlobalStateContext = createContext(initialState);

// Provider Component
export const GlobalStateProvider = ({ children }) => {
  const [state, dispatch] = useReducer(globalReducer, initialState);

  // Actions
  const loginUser = (userData) => {
    dispatch({ type: LOGIN_SUCCESS, payload: userData });
  };

  const logoutUser = () => {
    dispatch({ type: LOGOUT });
  };

  const loadExercises = async () => {
    dispatch({ type: LOAD_EXERCISES_START });
    try {
      const localExercises = localStorage.getItem('adventurers-town-exercises');
      if (localExercises) {
        dispatch({ type: LOAD_EXERCISES_SUCCESS, payload: JSON.parse(localExercises) });
        console.log('Exercises loaded from local storage.');
        return;
      }

      const response = await fetch('https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const fetchedData = await response.json();
      localStorage.setItem('adventurers-town-exercises', JSON.stringify(fetchedData));
      dispatch({ type: LOAD_EXERCISES_SUCCESS, payload: fetchedData });
      console.log('Exercises fetched and saved.');
    } catch (error) {
      console.error('Error loading exercises:', error);
      dispatch({ type: LOAD_EXERCISES_FAIL, payload: error.message });
    }
  };

  const recalculateStats = async (userId) => { // Added function
    if (!userId) {
      console.error("RecalculateStats: userId is undefined.");
      dispatch({ type: RECALCULATE_STATS_FAIL, payload: "User ID not provided for stat recalculation." });
      return;
    }
    dispatch({ type: RECALCULATE_STATS_START });
    try {
      const result = await apiRecalculateUserStats(userId);
      if (result.success && result.user) {
        dispatch({
          type: RECALCULATE_STATS_SUCCESS,
          payload: { user: result.user, detailedContributions: result.user.detailedContributions }
        });
      } else {
        throw new Error(result.message || 'Failed to recalculate stats.');
      }
    } catch (error) {
      console.error('Error recalculating stats in GlobalState:', error);
      dispatch({ type: RECALCULATE_STATS_FAIL, payload: error.message });
    }
  };


  const setError = (errorMessage) => {
    dispatch({ type: SET_ERROR, payload: errorMessage });
  };

  const clearError = () => {
    dispatch({ type: CLEAR_ERROR });
  };

  // Load exercises on initial mount
  useEffect(() => {
    if (state.exercises.length === 0) {
        loadExercises();
    }
  }, []);


  return (
    <GlobalStateContext.Provider
      value={{
        currentUser: state.currentUser,
        currentUserDetailedContributions: state.currentUserDetailedContributions, // Added
        isLoadingStats: state.isLoadingStats, // Added
        exercises: state.exercises,
        loadingExercises: state.loadingExercises,
        error: state.error,
        loginUser,
        logoutUser,
        loadExercises,
        recalculateStats, // Added
        setError,
        clearError,
      }}
    >
      {children}
    </GlobalStateContext.Provider>
  );
};

// Custom hook to use the context
export const useGlobalState = () => {
  const context = useContext(GlobalStateContext);
  if (context === undefined) {
    throw new Error('useGlobalState must be used within a GlobalStateProvider');
  }
  return context;
};
