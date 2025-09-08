import React, { createContext, useReducer, useContext, useEffect, useCallback } from 'react';

// Initial state
import {
  recalculateUserStats as apiRecalculateUserStats,
  getDailyQuests as apiGetDailyQuests
} from '../services/api';

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
const UPDATE_USER = 'UPDATE_USER';
const LOAD_EXERCISES_START = 'LOAD_EXERCISES_START';
const LOAD_EXERCISES_SUCCESS = 'LOAD_EXERCISES_SUCCESS';
const LOAD_EXERCISES_FAIL = 'LOAD_EXERCISES_FAIL';
const SET_ERROR = 'SET_ERROR';
const CLEAR_ERROR = 'CLEAR_ERROR';
const RECALCULATE_STATS_START = 'RECALCULATE_STATS_START'; // Added
const RECALCULATE_STATS_SUCCESS = 'RECALCULATE_STATS_SUCCESS'; // Added
const RECALCULATE_STATS_FAIL = 'RECALCULATE_STATS_FAIL'; // Added
const GET_DAILY_QUESTS_START = 'GET_DAILY_QUESTS_START';
const GET_DAILY_QUESTS_SUCCESS = 'GET_DAILY_QUESTS_SUCCESS';
const GET_DAILY_QUESTS_FAIL = 'GET_DAILY_QUESTS_FAIL';

// Reducer
function globalReducer(state, action) {
  switch (action.type) {
    case LOGIN_SUCCESS:
      // Reset detailed contributions on new login
      return { ...state, currentUser: action.payload, currentUserDetailedContributions: null, error: null };
    case LOGOUT:
      return { ...state, currentUser: null, currentUserDetailedContributions: null, error: null };
    case UPDATE_USER:
      return { ...state, currentUser: action.payload };
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
        currentUser: {
          ...state.currentUser, // Keep all existing user data
          stats: action.payload.user.stats, // ONLY update the stats field
        },
        // Also update the separate detailed contributions field
        currentUserDetailedContributions: action.payload.detailedContributions,
        error: null
      };
    case RECALCULATE_STATS_FAIL: // Added
      return { ...state, isLoadingStats: false, error: action.payload };
    case GET_DAILY_QUESTS_START:
      return { ...state, isLoading: true, error: null };
    case GET_DAILY_QUESTS_SUCCESS:
      return { ...state, currentUser: action.payload, isLoading: false, error: null };
    case GET_DAILY_QUESTS_FAIL:
      return { ...state, isLoading: false, error: action.payload };
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
  const loginUser = useCallback((userData) => {
    localStorage.setItem('currentUser', JSON.stringify(userData));
    dispatch({ type: LOGIN_SUCCESS, payload: userData });
  }, []);

  const logoutUser = useCallback(() => {
    dispatch({ type: LOGOUT });
  }, []);

  const updateUser = useCallback((userData) => {
    // Persist updated user data so changes survive page refreshes
    localStorage.setItem('currentUser', JSON.stringify(userData));
    dispatch({ type: UPDATE_USER, payload: userData });
  }, []);

  const loadExercises = useCallback(async () => {
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
  }, []);

  const recalculateStats = useCallback(async (userId) => {
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
  }, []);

  const getDailyQuests = useCallback(async (userId) => {
    if (!userId) {
      console.error("getDailyQuests: userId is undefined.");
      dispatch({ type: GET_DAILY_QUESTS_FAIL, payload: "User ID not provided for fetching quests." });
      return;
    }
    dispatch({ type: GET_DAILY_QUESTS_START });
    try {
      const result = await apiGetDailyQuests(userId);
      if (result.success) {
        // The API now returns the full user object.
        dispatch({ type: GET_DAILY_QUESTS_SUCCESS, payload: result.user });
      } else {
        throw new Error(result.message || 'Failed to fetch daily quests.');
      }
    } catch (error) {
      console.error('Error fetching daily quests in GlobalState:', error);
      dispatch({ type: GET_DAILY_QUESTS_FAIL, payload: error.message });
    }
  }, []);


  const setError = useCallback((errorMessage) => {
    dispatch({ type: SET_ERROR, payload: errorMessage });
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: CLEAR_ERROR });
  }, []);

  // Load user from local storage on initial mount
  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      dispatch({ type: LOGIN_SUCCESS, payload: JSON.parse(storedUser) });
    }
  }, []);

  // Load exercises on initial mount
  useEffect(() => {
    // Check if exercises are already loaded or if loading is in progress
    // This check prevents re-fetching if another component instance triggers this effect.
    if (state.exercises.length === 0 && !state.loadingExercises) {
        loadExercises();
    }
  // loadExercises is now wrapped in useCallback, so it's a stable dependency.
  // state.exercises.length and state.loadingExercises are primitives or part of state, also fine.
  }, [loadExercises, state.exercises.length, state.loadingExercises]);


  return (
    <GlobalStateContext.Provider
      value={{
        currentUser: state.currentUser,
        currentUserDetailedContributions: state.currentUserDetailedContributions,
        isLoadingStats: state.isLoadingStats,
        exercises: state.exercises,
        loadingExercises: state.loadingExercises,
        error: state.error,
        loginUser,
        logoutUser,
        updateUser,
        loadExercises,
        recalculateStats,
        getDailyQuests,
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
