// Basic API service structure
// In a real app, these would make actual fetch requests to your backend.

export const registerUser = async (userData) => {
  console.log('Attempting to register user:', userData);
  // Simulate API call
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (userData.email && userData.password && userData.username) {
        resolve({ success: true, message: 'Registration successful! Please login.', user: { username: userData.username, email: userData.email } });
      } else {
        reject({ success: false, message: 'Registration failed. Missing fields.' });
      }
    }, 500);
  });
};

export const loginUser = async (credentials) => {
  console.log('Attempting to login with:', credentials);
  // Simulate API call
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // Simple mock user database for demonstration if needed, or just one user
      const mockUser = {
        id: '1',
        username: 'TestUser',
        email: 'test@example.com',
        level: 1,
        experience: 0,
        stats: {
          upperBodyStrength: 10, lowerBodyStrength: 12, coreStrength: 15,
          powerExplosiveness: 5, flexibilityMobility: 7, cardioEndurance: 20
        },
        exerciseHistory: [ // Some mock history for the test user
          { id: 'ex1', date: new Date(Date.now() - 86400000 * 2).toISOString(), type: 'Push Ups', sets: 3, reps: 10, weight: 0 },
          { id: 'ex2', date: new Date(Date.now() - 86400000).toISOString(), type: 'Squats', sets: 3, reps: 8, weight: 50 },
        ],
        createdAt: new Date(Date.now() - 86400000 * 5).toISOString() // Member for 5 days
      };

      if (credentials.email === mockUser.email && credentials.password === 'password') {
        resolve({
          success: true,
          message: 'Login successful!',
          user: mockUser
        });
      } else {
        reject({ success: false, message: 'Invalid email or password.' });
      }
    }, 500);
  });
};

export const logExercise = async (userId, exerciseData) => {
  console.log(`User ${userId} attempting to log exercise:`, exerciseData);
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (exerciseData.type && exerciseData.sets > 0 && exerciseData.reps > 0) {
        const newExerciseEntry = {
          ...exerciseData,
          id: `ex${Date.now()}`, // More unique ID
          date: new Date().toISOString()
        };
        resolve({ success: true, message: 'Exercise logged successfully!', exercise: newExerciseEntry });
      } else {
        reject({ success: false, message: 'Failed to log exercise. Invalid data.' });
      }
    }, 500);
  });
};

// New mock function for fetching exercise history
export const fetchUserExerciseHistory = async (userId) => {
  console.log(`Fetching exercise history for user ${userId}...`);
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // In a real app, this would fetch from backend.
      // For mock, we can check if it's our known 'TestUser' (id '1')
      if (userId === '1') {
        // Return a part of the mock user's history or a predefined list
        // This helps simulate an API that only returns history.
        // For simplicity, let's assume it returns the same history as embedded in the mock user for now.
        const mockHistory = [
          { id: 'ex1', date: new Date(Date.now() - 86400000 * 2).toISOString(), type: 'Push Ups', sets: 3, reps: 10, weight: 0 },
          { id: 'ex2', date: new Date(Date.now() - 86400000).toISOString(), type: 'Squats', sets: 3, reps: 8, weight: 50 },
          { id: 'ex_new_mock', date: new Date().toISOString(), type: 'Plank', sets: 3, reps: 60, weight: 0 } // An extra one not in login
        ];
        resolve({ success: true, history: mockHistory });
      } else {
        // For other users, or if no specific mock is set up
        resolve({ success: true, history: [] }); // Or reject if user not found
      }
    }, 500);
  });
};
