import React, { createContext, useReducer, useContext, useEffect } from 'react';

// Initial state
const initialState = {
  currentUser: null,
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

// Reducer
function globalReducer(state, action) {
  switch (action.type) {
    case LOGIN_SUCCESS:
      return { ...state, currentUser: action.payload, error: null };
    case LOGOUT:
      return { ...state, currentUser: null, error: null };
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
    // Potentially save user to localStorage here if persistence is needed beyond session
  };

  const logoutUser = () => {
    dispatch({ type: LOGOUT });
    // Potentially remove user from localStorage here
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
  }, []); // Empty dependency array means this runs once on mount


  return (
    <GlobalStateContext.Provider
      value={{
        currentUser: state.currentUser,
        exercises: state.exercises,
        loadingExercises: state.loadingExercises,
        error: state.error,
        loginUser,
        logoutUser,
        loadExercises,
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
