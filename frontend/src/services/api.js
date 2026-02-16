const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || `http://${window.location.hostname}:5000`;

const TOKEN_STORAGE_KEY = 'token';

const getAuthToken = () => localStorage.getItem(TOKEN_STORAGE_KEY);

const buildHeaders = ({ withJson = true, requireAuth = false, extraHeaders = {} } = {}) => {
  const headers = { ...extraHeaders };
  if (withJson) headers['Content-Type'] = 'application/json';
  if (requireAuth) {
    const token = getAuthToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }
  return headers;
};

const requestJson = async (path, options = {}) => {
  const response = await fetch(`${API_BASE_URL}${path}`, options);
  const data = await response.json().catch(() => ({}));
  const message = data.message || data.error || 'Request failed.';
  return { ok: response.ok, status: response.status, data, message };
};

export const registerUser = async (userData) => {
  try {
    const result = await requestJson('/api/users/register', {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(userData),
    });
    if (!result.ok) {
      return { success: false, message: result.message };
    }
    return { success: true, ...result.data };
  } catch (error) {
    return {
      success: false,
      message: error.message || 'A network error occurred during registration.',
    };
  }
};

export const loginUser = async (credentials) => {
  try {
    const result = await requestJson('/api/users/login', {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(credentials),
    });
    if (!result.ok) {
      return { success: false, message: result.message };
    }
    return { success: true, ...result.data };
  } catch (error) {
    return { success: false, message: error.message || 'A network error occurred during login.' };
  }
};

export const logExercise = async (userId, exerciseData) => {
  try {
    const result = await requestJson(`/api/users/${userId}/exercises`, {
      method: 'POST',
      headers: buildHeaders({ requireAuth: true }),
      body: JSON.stringify({ ...exerciseData, date: exerciseData.date || new Date().toISOString() }),
    });
    if (!result.ok) {
      return { success: false, message: result.message };
    }
    return { success: true, ...result.data };
  } catch (error) {
    return { success: false, message: error.message || 'A network error occurred while logging exercise.' };
  }
};

export const fetchUserExerciseHistory = async (userId) => {
  try {
    const result = await requestJson(`/api/users/${userId}`, {
      method: 'GET',
      headers: buildHeaders({ withJson: false, requireAuth: true }),
    });
    if (!result.ok) {
      return { success: false, message: result.message };
    }
    return { success: true, user: result.data };
  } catch (error) {
    return { success: false, message: error.message || 'A network error occurred while fetching user data.' };
  }
};

export const recalculateUserStats = async (userId) => {
  try {
    const result = await requestJson(`/api/users/${userId}/recalculate-stats`, {
      method: 'POST',
      headers: buildHeaders({ requireAuth: true }),
    });
    if (!result.ok) {
      return { success: false, message: result.message };
    }
    return { success: true, ...result.data };
  } catch (error) {
    return { success: false, message: error.message || 'A network error occurred while recalculating stats.' };
  }
};

export const updateUserPreferences = async (userId, preferences) => {
  try {
    const result = await requestJson(`/api/users/${userId}/preferences`, {
      method: 'PUT',
      headers: buildHeaders({ requireAuth: true }),
      body: JSON.stringify(preferences),
    });
    if (!result.ok) {
      return { success: false, message: result.message };
    }
    return { success: true, ...result.data };
  } catch (error) {
    return { success: false, message: error.message || 'A network error occurred while updating preferences.' };
  }
};

export const getDailyQuests = async (userId) => {
  try {
    const result = await requestJson(`/api/users/${userId}`, {
      headers: buildHeaders({ withJson: false, requireAuth: true }),
    });
    if (!result.ok) {
      return { success: false, message: result.message };
    }
    return { success: true, user: result.data };
  } catch (error) {
    return { success: false, message: error.message || 'A network error occurred while fetching daily quests.' };
  }
};

export const generateDailyQuests = async (userId) => {
  try {
    const result = await requestJson(`/api/users/${userId}/daily-quests`, {
      method: 'POST',
      headers: buildHeaders({ requireAuth: true }),
    });
    if (!result.ok) {
      return { success: false, message: result.message };
    }
    return { success: true, ...result.data };
  } catch (error) {
    return { success: false, message: error.message || 'A network error occurred while generating daily quests.' };
  }
};

const handleQuestAction = async (userId, questId, action, body = null) => {
  try {
    const options = {
      method: 'POST',
      headers: buildHeaders({ requireAuth: true }),
    };
    if (body) {
      options.body = JSON.stringify(body);
    }
    const result = await requestJson(`/api/users/${userId}/quests/${questId}/${action}`, options);
    if (!result.ok) {
      return { success: false, message: result.message || `Failed to ${action} quest.` };
    }
    return { success: true, ...result.data };
  } catch (error) {
    return { success: false, message: error.message || `A network error occurred while trying to ${action} the quest.` };
  }
};

export const acceptQuest = (userId, questId) => handleQuestAction(userId, questId, 'accept');
export const abandonQuest = (userId, questId) => handleQuestAction(userId, questId, 'abandon');
export const completeQuest = (userId, questId, loggedExercises) => handleQuestAction(userId, questId, 'complete', { loggedExercises });


export const deleteHistory = async (userId, exerciseId) => {
  try {
    const result = await requestJson(`/api/users/${userId}/exercises/${exerciseId}`, {
      method: 'DELETE',
      headers: buildHeaders({ withJson: false, requireAuth: true }),
    });
    if (!result.ok) {
      return { success: false, message: result.message || 'Failed to delete exercise.' };
    }
    return { success: true, ...result.data };
  } catch (error) {
    return { success: false, message: error.message || 'A network error occurred while deleting exercise.' };
  }
};
