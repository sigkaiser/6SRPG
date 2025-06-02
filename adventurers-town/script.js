const sceneBackgrounds = {
  town: 'assets/town-map3.png',
  guild: 'assets/guild-bg.png',
  dungeon: 'assets/dungeon-bg.png',
  market: 'assets/market-bg.png'
};

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
          <button class="menu-btn" onclick="console.log('Register clicked')">Register</button>
          <button class="menu-btn" onclick="console.log('Player Card clicked')">Player Card</button>
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


// Initialize the town scene on page load
window.onload = () => {
  setScene('town');
};
