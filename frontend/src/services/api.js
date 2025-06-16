const API_BASE_URL = 'http://localhost:5000'; // Assuming backend runs on port 5000

export const registerUser = async (userData) => {
  console.log('Attempting to register user:', userData);
  try {
    const response = await fetch(`${API_BASE_URL}/api/users/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });
    const data = await response.json();
    if (!response.ok) {
      // Throws an error or returns an error object that the calling code expects
      // For compatibility with existing error handling in RegistrationForm.jsx which expects { message: ... }
      return { success: false, message: data.message || 'Registration failed.' };
    }
    return { success: true, ...data }; // Assuming backend returns { message: '...', user: {...} } on success
  } catch (error) {
    console.error('Registration API error:', error);
    return { success: false, message: error.message || 'An network error occurred during registration.' };
  }
};

export const loginUser = async (credentials) => {
  console.log('Attempting to login with:', credentials);
  try {
    const response = await fetch(`${API_BASE_URL}/api/users/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });
    const data = await response.json();
    if (!response.ok) {
      return { success: false, message: data.message || 'Login failed.' };
    }
    return { success: true, ...data }; // Assuming backend returns { message: '...', user: {...} }
  } catch (error) {
    console.error('Login API error:', error);
    return { success: false, message: error.message || 'A network error occurred during login.' };
  }
};

export const logExercise = async (userId, exerciseData) => {
  console.log(`User ${userId} attempting to log exercise:`, exerciseData);
  try {
    const response = await fetch(`${API_BASE_URL}/api/users/${userId}/exercises`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      // Ensure date is included, if not already part of exerciseData from form
      body: JSON.stringify({ ...exerciseData, date: exerciseData.date || new Date().toISOString() }),
    });
    const data = await response.json();
    if (!response.ok) {
      return { success: false, message: data.message || 'Failed to log exercise.' };
    }
    // Assuming backend returns { message: '...', exercise: {...} }
    // The global state update in ExerciseLogForm expects `response.exercise`
    return { success: true, message: data.message || "Exercise logged!", exercise: data.exercise };
  } catch (error) {
    console.error('Log Exercise API error:', error);
    return { success: false, message: error.message || 'A network error occurred while logging exercise.' };
  }
};

export const fetchUserExerciseHistory = async (userId) => {
  console.log(`Fetching exercise history for user ${userId}...`);
  try {
    // As per instruction, assume GET /api/users/{userId} returns full user object including exerciseHistory
    const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
      method: 'GET',
      headers: {
        // Include Authorization header if needed, e.g., for protected routes
        // 'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    });
    const data = await response.json();
    if (!response.ok) {
      // If the endpoint is just for history and returns { history: [...] }
      // return { success: false, message: data.message || 'Failed to fetch exercise history.' };
      // If it returns the full user object:
      return { success: false, message: data.message || 'Failed to fetch user data.' };
    }
    // If backend returns { user: { exerciseHistory: [...] } } or similar
    // Adjust access to exerciseHistory based on actual backend response structure.
    // For now, assuming data directly is the user object or has a top-level exerciseHistory field.
    // The component using this (useGlobalState's initial fetch or a direct call) will need to adapt.
    // Let's assume the backend returns the full user object as `data` (which includes `exerciseHistory`)
    // This function will then be used to update the user in global state.
    // Or, if the backend has a specific endpoint /api/users/{userId}/exercises for GET:
    // const response = await fetch(`${API_BASE_URL}/api/users/${userId}/exercises`, { method: 'GET' });
    // const data = await response.json(); // Assuming this returns { success: true, history: [...] }
    // if (!response.ok) return { success: false, message: data.message || 'Failed to fetch exercise history.' };
    // return { success: true, history: data.history };

    // For now, sticking to GET /api/users/{userId} returning the user object:
    return { success: true, user: data }; // The component/context will then extract exerciseHistory from user.

  } catch (error) {
    console.error('Fetch Exercise History API error:', error);
    return { success: false, message: error.message || 'A network error occurred while fetching exercise history.' };
  }
};
