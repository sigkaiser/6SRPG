const sceneBackgrounds = {
  town: 'assets/town-map3.png',
  guild: 'assets/guild-bg.png',
  dungeon: 'assets/dungeon-bg.png',
  market: 'assets/market-bg.png'
};

// Global variables
let currentUser = null;
let exercises = [];

// User data functions
function saveUserData(username, data) {
    try {
        const jsonData = JSON.stringify(data);
        // This is a placeholder for actual file saving logic,
        // which is not directly possible in browser-side JavaScript.
        // In a real application, this would involve sending data to a server
        // or using browser storage APIs (localStorage, IndexedDB).
        localStorage.setItem(`adventurers-town-user-${username}`, jsonData);
        console.log(`User data for ${username} saved successfully.`);
    } catch (error) {
        console.error(`Error saving user data for ${username}:`, error);
    }
}

function loadUserData(username) {
    try {
        // Placeholder for actual file loading logic.
        const jsonData = localStorage.getItem(`adventurers-town-user-${username}`);
        if (jsonData) {
            const data = JSON.parse(jsonData);
            console.log(`User data for ${username} loaded successfully.`);
            return data;
        } else {
            console.log(`No data found for user ${username}.`);
            return null;
        }
    } catch (error) {
        console.error(`Error loading user data for ${username}:`, error);
        return null;
    }
}

// Exercise data functions
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
          <button class="menu-btn" onclick="showGuildCard()">Player Card</button>
          <button class="menu-btn" onclick="showExerciseLogForm()">Log Exercise</button>
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
    <input type="text" id="usernameInput" placeholder="Enter username">
    <button class="menu-btn" onclick="handleRegistration()">Register</button>
    <button class="menu-btn" onclick="setScene('guild')">← Back to Guild</button>
  `;
}

function handleRegistration() {
  const usernameInput = document.getElementById('usernameInput');
  const username = usernameInput.value.trim();

  if (!username) {
    alert("Username cannot be empty.");
    return;
  }

  const existingUser = loadUserData(username);
  if (existingUser) {
    alert("User already exists.");
  } else {
    const newUserObject = {
      username: username,
      registeredAt: new Date().toISOString(),
      exercises: []
    };
    saveUserData(username, newUserObject);
    currentUser = newUserObject;
    alert("Registration successful!");
    setScene('guild');
  }
}

function showGuildCard() {
  if (!currentUser || !currentUser.username) {
    alert("Please register first.");
    return;
  }

  const content = document.getElementById('scene-content');
  content.innerHTML = `
    <h1>Guild Card</h1>
    <div>Username: ${currentUser.username}</div>
    <h2>Stats:</h2>
    <ul>
      <li>Upper Body Strength: 50</li>
      <li>Lower Body Strength: 60</li>
      <li>Core Strength: 55</li>
      <li>Power Explosiveness: 40</li>
      <li>Flexibility Mobility: 45</li>
      <li>Cardio Endurance: 65</li>
    </ul>
    <button class="menu-btn" onclick="setScene('guild')">← Back to Guild</button>
  `;
}

function showExerciseLogForm() {
  if (!currentUser) {
    alert("Please register first.");
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

function handleExerciseLog() {
  if (!currentUser) {
    alert("Please register or login first."); // Should not happen if showExerciseLogForm is called correctly
    return;
  }

  const exerciseLogEntry = {
    date: new Date().toISOString(),
    exerciseName: document.getElementById('exerciseSelect').value,
    sets: parseInt(document.getElementById('setsInput').value) || 0,
    reps: parseInt(document.getElementById('repsInput').value) || 0,
    weight: parseFloat(document.getElementById('weightInput').value) || 0
  };

  if (!currentUser.exercises) {
    currentUser.exercises = [];
  }
  currentUser.exercises.push(exerciseLogEntry);
  saveUserData(currentUser.username, currentUser);

  alert("Exercise logged!");
  setScene('guild');
}

// Initialize the town scene on page load
window.onload = () => {
  setScene('town');
  loadExercises();
};
