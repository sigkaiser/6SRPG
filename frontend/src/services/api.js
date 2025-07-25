const API_BASE_URL = `http://${window.location.hostname}:5000`; // Dynamically set API base URL

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
  console.log(`[XP LOG] Calling logExercise API for user ${userId} with data:`, exerciseData);
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
    console.log('[XP LOG] API response received:', data);
    if (!response.ok) {
      console.error('[XP LOG] API response not OK:', response);
      return { success: false, message: data.message || 'Failed to log exercise.' };
    }
    // The backend now returns the full user object.
    // The structure is { success: true, message: '...', user: {...} }
    return { success: true, ...data };
  } catch (error) {
    console.error('[XP LOG] Log Exercise API error:', error);
    return { success: false, message: error.message || 'A network error occurred while logging exercise.' };
  }
};

export const fetchUserExerciseHistory = async (userId) => {
  console.log(`Fetching exercise history for user ${userId}...`);
  try {
    const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
      method: 'GET',
      headers: {
        // 'Authorization': `Bearer ${localStorage.getItem('token')}`, // If auth is implemented
      },
    });
    const data = await response.json();
    if (!response.ok) {
      return { success: false, message: data.message || 'Failed to fetch user data.' };
    }
    return { success: true, user: data };
  } catch (error) {
    console.error('Fetch User Data API error:', error);
    return { success: false, message: error.message || 'A network error occurred while fetching user data.' };
  }
};

export const recalculateUserStats = async (userId) => {
  console.log(`Requesting stat recalculation for user ${userId}...`);
  try {
    const response = await fetch(`${API_BASE_URL}/api/users/${userId}/recalculate-stats`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // 'Authorization': `Bearer ${localStorage.getItem('token')}`, // If auth is implemented
      },
      // No body is needed for this POST request as per current design
    });
    const data = await response.json();
    if (!response.ok) {
      return { success: false, message: data.message || 'Failed to recalculate stats.' };
    }
    // Expected response: { message: '...', user: { ... (updated stats), detailedContributions: { ... } } }
    return { success: true, ...data };
  } catch (error) {
    console.error('Recalculate Stats API error:', error);
    return { success: false, message: error.message || 'A network error occurred while recalculating stats.' };
  }
};

export const updateUserPreferences = async (userId, preferences) => {
  console.log(`Updating preferences for user ${userId}...`);
  try {
    const response = await fetch(`${API_BASE_URL}/api/users/${userId}/preferences`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(preferences),
    });
    const data = await response.json();
    if (!response.ok) {
      return { success: false, message: data.message || 'Failed to update preferences.' };
    }
    return { success: true, ...data };
  } catch (error) {
    console.error('Update Preferences API error:', error);
    return { success: false, message: error.message || 'A network error occurred while updating preferences.' };
  }
};
