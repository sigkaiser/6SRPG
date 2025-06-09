const sceneBackgrounds = {
  town: 'assets/town-map3.png',
  guild: 'assets/guild-bg.png',
  dungeon: 'assets/dungeon-bg.png',
  market: 'assets/market-bg.png'
};

// Global variables
let currentUser = null;
let exercises = [];

// Exercise data functions (for general exercise list, not user-specific)
function saveExercises(exerciseData) {
    try {
        const jsonData = JSON.stringify(exerciseData);
        // Placeholder for actual file saving logic
        localStorage.setItem('adventurers-town-exercises', jsonData);
        console.log('Exercises saved successfully.');
    } catch (error) {
        console.error('Error saving exercises:', error);
    }
}

async function loadExercises() {
    try {
        // Try to load from local storage first
        const jsonData = localStorage.getItem('adventurers-town-exercises');
        if (jsonData) {
            exercises = JSON.parse(jsonData);
            console.log('Exercises loaded from local storage.');
            return;
        }

        // If not in local storage, fetch from URL
        const response = await fetch('https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const fetchedData = await response.json();
        saveExercises(fetchedData); // Save fetched data to local storage
        exercises = fetchedData;
        console.log('Exercises fetched and saved.');
    } catch (error) {
        console.error('Error loading exercises:', error);
    }
}

function setScene(sceneKey) {
  const container = document.getElementById('scene-container');
  const content = document.getElementById('scene-content');

  // Set background
  container.style.backgroundImage = `url('${sceneBackgrounds[sceneKey]}')`;

  // Load scene content
  content.innerHTML = getSceneUI(sceneKey);
}

function getSceneUI(sceneKey) {
  switch (sceneKey) {
    case 'guild':
      return `
        <div class="button-group">
          <button class="menu-btn" onclick="showRegistrationForm()">Register</button>
          <button class="menu-btn" onclick="showLoginForm()">Login</button>
          <button class="menu-btn" onclick="showGuildCard()">Player Card</button>
          <button class="menu-btn" onclick="showExerciseLogForm()">Log Exercise</button>
          <button class="menu-btn" onclick="showExerciseHistory()">View Exercise History</button>
          <button class="menu-btn" onclick="setScene('town')">← Town</button>
        </div>
        <h1>Welcome to the Guild</h1>
      `;
    case 'dungeon':
      return `
        <button class="back-btn" onclick="setScene('town')">← Back to Town</button>
        <h1>Welcome to the Dungeon</h1>
      `;
    case 'market':
      return `
        <button class="back-btn" onclick="setScene('town')">← Back to Town</button>
        <h1>Welcome to the Market</h1>
      `;
    default:
      return `
        <div class="facility" onclick="setScene('guild')" style="top: 30%; left: 40%;">Guild</div>
        <div class="facility" onclick="setScene('dungeon')" style="top: 60%; left: 50%;">Dungeon</div>
        <div class="facility" onclick="setScene('market')" style="top: 40%; left: 70%;">Market</div>
      `;
  }
}

function showRegistrationForm() {
  const content = document.getElementById('scene-content');
  content.innerHTML = `
    <h1>Register Account</h1>
    <div class="form-group">
      <label for="usernameInput">Username:</label>
      <input type="text" id="usernameInput" placeholder="Enter username">
    </div>
    <div class="form-group">
      <label for="emailInput">Email:</label>
      <input type="email" id="emailInput" placeholder="Enter email">
    </div>
    <div class="form-group">
      <label for="passwordInput">Password:</label>
      <input type="password" id="passwordInput" placeholder="Enter password">
    </div>
    <button class="menu-btn" onclick="handleRegistration()">Register</button>
    <button class="menu-btn" onclick="showLoginForm()">Go to Login</button>
    <button class="menu-btn" onclick="setScene('guild')">← Back to Guild</button>
  `;
}

function handleRegistration() {
  const usernameInput = document.getElementById('usernameInput');
  const emailInput = document.getElementById('emailInput');
  const passwordInput = document.getElementById('passwordInput');

  const username = usernameInput.value.trim();
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!username || !email || !password) {
    alert("Username, email, and password cannot be empty.");
    return;
  }

  const body = JSON.stringify({ username, email, password });

  fetch('/api/users/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: body,
  })
  .then(response => {
    if (response.ok) { // Typically 201 Created for registration
      return response.json();
    } else {
      return response.json().then(err => { throw new Error(err.error || 'Registration failed') });
    }
  })
  .then(data => {
    alert(data.message || "Registration successful! Please login.");
    currentUser = null; // Ensure user is not set
    showLoginForm(); // Or navigate to login view
  })
  .catch(error => {
    console.error('Registration error:', error);
    alert(`Registration failed: ${error.message}`);
  });
}

function showLoginForm() {
  const content = document.getElementById('scene-content');
  content.innerHTML = `
    <h1>Login</h1>
    <div class="form-group">
      <label for="loginEmailInput">Email:</label>
      <input type="email" id="loginEmailInput" placeholder="Enter email">
    </div>
    <div class="form-group">
      <label for="loginPasswordInput">Password:</label>
      <input type="password" id="loginPasswordInput" placeholder="Enter password">
    </div>
    <button class="menu-btn" onclick="handleLogin()">Login</button>
    <button class="menu-btn" onclick="setScene('guild')">← Back to Guild</button>
  `;
}

async function handleLogin() {
  const emailInput = document.getElementById('loginEmailInput');
  const passwordInput = document.getElementById('loginPasswordInput');

  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    alert("Email and password cannot be empty.");
    return;
  }

  const body = JSON.stringify({ email, password });

  try {
    const response = await fetch('/api/users/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: body,
    });

    if (response.ok) { // Typically 200 OK for login
      const data = await response.json();
      currentUser = data.user; // Backend sends { message: '...', user: {...} }
      alert(data.message || "Login successful!");
      showGuildCard(); // Or setScene('guild') or another appropriate view
    } else {
      const errData = await response.json();
      alert(errData.error || 'Login failed. Please check your credentials.');
      currentUser = null;
    }
  } catch (error) {
    console.error('Login error:', error);
    alert(`Login failed: ${error.message}`);
    currentUser = null;
  }
}

function showGuildCard() {
  if (!currentUser || !currentUser.id) { // Check for ID, more robust
    alert("Please login to view your Guild Card.");
    showLoginForm(); // Redirect to login
    return;
  }

  const content = document.getElementById('scene-content');
  // Ensure stats object exists and provide defaults if not
  const stats = currentUser.stats || {
    upperBodyStrength: 0,
    lowerBodyStrength: 0,
    coreStrength: 0,
    powerExplosiveness: 0,
    flexibilityMobility: 0,
    cardioEndurance: 0
  };

  content.innerHTML = `
    <h1>Guild Card</h1>
    <div class="guild-card-section">
      <p><strong>Username:</strong> ${currentUser.username}</p>
      <p><strong>Email:</strong> ${currentUser.email}</p>
      <p><strong>Level:</strong> ${currentUser.level || 1}</p>
      <p><strong>Experience:</strong> ${currentUser.experience || 0} XP</p>
      <p><strong>Member Since:</strong> ${new Date(currentUser.createdAt).toLocaleDateString()}</p>
    </div>
    <h2>Stats:</h2>
    <ul class="guild-card-stats">
      <li>Upper Body Strength: ${stats.upperBodyStrength}</li>
      <li>Lower Body Strength: ${stats.lowerBodyStrength}</li>
      <li>Core Strength: ${stats.coreStrength}</li>
      <li>Power Explosiveness: ${stats.powerExplosiveness}</li>
      <li>Flexibility/Mobility: ${stats.flexibilityMobility}</li>
      <li>Cardio/Endurance: ${stats.cardioEndurance}</li>
    </ul>
    <button class="menu-btn" onclick="setScene('guild')">← Back to Guild</button>
  `;
}

function showExerciseLogForm() {
  if (!currentUser) {
    alert("Please login to log exercises.");
    return;
  }

  const content = document.getElementById('scene-content');
  let exerciseOptions = '';
  if (Array.isArray(exercises)) {
    exercises.forEach(exercise => {
      exerciseOptions += `<option value="${exercise.name}">${exercise.name}</option>`;
    });
  }

  content.innerHTML = `
    <h1>Log Exercise</h1>
    <label for="exerciseSelect">Exercise Type:</label>
    <select id="exerciseSelect">${exerciseOptions}</select>
    <br>
    <label for="setsInput">Sets:</label>
    <input type="number" id="setsInput" placeholder="Enter sets">
    <br>
    <label for="repsInput">Reps:</label>
    <input type="number" id="repsInput" placeholder="Enter reps">
    <br>
    <label for="weightInput">Weight (kg/lbs):</label>
    <input type="number" id="weightInput" placeholder="Enter weight">
    <br>
    <button class="menu-btn" onclick="handleExerciseLog()">Log Exercise</button>
    <button class="menu-btn" onclick="setScene('guild')">← Back to Guild</button>
  `;
}

async function handleExerciseLog() {
  if (!currentUser || !currentUser.id) {
    alert("Please login first to log exercises.");
    return;
  }

  const exerciseType = document.getElementById('exerciseSelect').value;
  const setsValue = document.getElementById('setsInput').value;
  const repsValue = document.getElementById('repsInput').value;
  const weightValue = document.getElementById('weightInput').value;

  // Validate inputs
  if (!exerciseType) {
    alert("Please select an exercise type.");
    return;
  }
  if (setsValue === '' || repsValue === '' || weightValue === '') {
    alert("Please fill in sets, reps, and weight.");
    return;
  }

  const sets = parseInt(setsValue);
  const reps = parseInt(repsValue);
  const weight = parseFloat(weightValue);

  if (isNaN(sets) || sets <= 0 || isNaN(reps) || reps <= 0 || isNaN(weight) || weight < 0) {
    alert("Please enter valid numbers for sets, reps, and weight. Sets and reps must be greater than 0. Weight cannot be negative.");
    return;
  }

  const exerciseLogEntry = {
    date: new Date().toISOString(), // Backend can also default this
    type: exerciseType, // Changed from exerciseName to type
    sets: sets,
    reps: reps,
    weight: weight
  };

  const body = JSON.stringify(exerciseLogEntry);

  try {
    const response = await fetch(`/api/users/${currentUser.id}/exercises`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: body,
    });

    if (response.ok) {
      const newExercise = await response.json();
      // Ensure exerciseHistory array exists on currentUser
      if (!currentUser.exerciseHistory) {
        currentUser.exerciseHistory = [];
      }
      currentUser.exerciseHistory.push(newExercise);
      alert("Exercise logged successfully!");
      setScene('guild'); // Or perhaps show guild card or exercise history view
    } else {
      const errData = await response.json();
      alert(`Error logging exercise: ${errData.error || 'Unknown server error'}`);
    }
  } catch (error) {
    console.error('Failed to log exercise:', error);
    alert(`Failed to log exercise: ${error.message}`);
  }
}

function showExerciseHistory() {
  const content = document.getElementById('scene-content');

  if (!currentUser || !currentUser.id) {
    alert("Please login to view history.");
    showLoginForm(); // Redirect to login
    return;
  }

  let historyHtml = '<h1>Exercise History</h1>';

  if (!currentUser.exerciseHistory || currentUser.exerciseHistory.length === 0) {
    historyHtml += '<p>No exercises logged yet.</p>';
  } else {
    // Sort exercises by date, most recent first
    const sortedHistory = [...currentUser.exerciseHistory].sort((a, b) => new Date(b.date) - new Date(a.date));

    sortedHistory.forEach(exercise => {
      historyHtml += `
        <div class="exercise-entry" style="border: 1px solid #ccc; margin-bottom: 10px; padding: 10px;">
          <p><strong>Date:</strong> ${new Date(exercise.date).toLocaleDateString()} ${new Date(exercise.date).toLocaleTimeString()}</p>
          <p><strong>Type:</strong> ${exercise.type}</p>
          <p><strong>Sets:</strong> ${exercise.sets}</p>
          <p><strong>Reps:</strong> ${exercise.reps}</p>
          <p><strong>Weight:</strong> ${exercise.weight} ${exercise.weightUnit || 'kg'}</p>
        </div>`;
        // Added a placeholder for weightUnit, assuming it might be added later. Defaulting to kg.
    });
  }

  historyHtml += '<button class="menu-btn" onclick="setScene(\'guild\')">← Back to Guild</button>';
  content.innerHTML = historyHtml;
}

// Initialize the town scene on page load
window.onload = () => {
  setScene('town');
  loadExercises();
};
