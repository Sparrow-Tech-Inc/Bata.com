// Load data from external JSON file
let wallData = {};
let columnData = {};
let itemElements = [];

// DOM elements
const searchInput = document.getElementById("searchInput");
const result = document.getElementById("result");
const allData = document.getElementById("allData");
const clearSearch = document.getElementById("clearSearch");
const matchCount = document.getElementById("matchCount");
const suggestionsDropdown = document.getElementById("suggestionsDropdown");

// Load data and initialize
fetch('data.json')
  .then(response => response.json())
  .then(data => {
    wallData = data.wallData;
    columnData = data.columnData;
    initializeApp();
  })
  .catch(error => {
    console.error('Error loading data:', error);
    result.classList.remove("d-none");
    result.innerHTML = `<i class="bi bi-x-circle-fill text-danger"></i> Error loading data. Please try again later.`;
  });

function initializeApp() {
  // Render Wall Data
  for (let wall in wallData) {
    const wallDiv = document.createElement("div");
    wallDiv.className = "wall-section col-12";
    wallDiv.innerHTML = `<h5 class="wall-title"><i class="bi bi-bounding-box-circles"></i> ${wall}</h5>`;

    const itemsHTML = wallData[wall].map(item => {
      const span = document.createElement('span');
      span.className = 'item';
      span.dataset.code = item.code.toUpperCase();
      span.dataset.name = item.name.toUpperCase();
      span.dataset.wall = wall;
      span.setAttribute('role', 'listitem');
      span.setAttribute('aria-label', `${item.name}, code ${item.code}, located on ${wall}`);
      span.innerHTML = `<strong>${item.name}</strong> (${item.code}) <br><small>${wall}</small>`;
      itemElements.push(span);
      return span.outerHTML;
    }).join(' ');

    wallDiv.innerHTML += `<div role="list">${itemsHTML}</div>`;
    allData.appendChild(wallDiv);
  }

  // Render Column & Pillar Data
  const rowDiv = document.createElement('div');
  rowDiv.className = 'row gy-3';

  for (let column in columnData) {
    const colDiv = document.createElement('div');
    colDiv.className = 'col-md-4';

    let pillarsHTML = '';

    for (let pillar in columnData[column]) {
      const itemsHTML = columnData[column][pillar].map(item => {
        const span = document.createElement('span');
        span.className = 'item';
        span.dataset.code = item.code.toUpperCase();
        span.dataset.name = item.name.toUpperCase();
        span.dataset.column = column;
        span.dataset.pillar = pillar;
        span.setAttribute('role', 'listitem');
        span.setAttribute('aria-label', `${item.name}, code ${item.code}, located in ${column}, ${pillar}`);
        span.innerHTML = `<strong>${item.name}</strong> (${item.code}) <br><small>${column} - ${pillar}</small>`;
        itemElements.push(span);
        return span.outerHTML;
      }).join(' ');

      pillarsHTML += `
        <div class="pillar-card" role="list">
          <strong class="custom-color"><i class="bi bi-building"></i> ${pillar}:</strong>
          <div>${itemsHTML}</div>
        </div>
      `;
    }

    colDiv.innerHTML = `
      <div>
        <h5 class="custom-color"><i class="bi bi-columns-gap"></i> ${column}</h5>
        ${pillarsHTML}
      </div>
    `;
    rowDiv.appendChild(colDiv);
  }
  allData.appendChild(rowDiv);

  // Event Listeners
  searchInput.addEventListener("input", handleSearch);
  clearSearch.addEventListener("click", clearSearchHandler);
  searchInput.addEventListener("focus", showSuggestions);
  searchInput.addEventListener("keydown", handleKeyboardNavigation);
}

// Enhanced Search Functions
function handleSearch() {
  const query = this.value.trim().toUpperCase();
  clearSearch.style.display = query ? "block" : "none";

  // Remove highlights
  itemElements.forEach(el => el.classList.remove("highlight"));

  if (query === "") {
    result.classList.add("d-none");
    matchCount.textContent = "";
    return;
  }

  // Generate suggestions
  updateSuggestions(query);

  // Find matches (fuzzy search)
  const matches = itemElements.filter(el => {
    return el.dataset.code.includes(query) || 
           el.dataset.name.includes(query) ||
           fuzzyMatch(el.dataset.code, query) || 
           fuzzyMatch(el.dataset.name, query);
  });

  // Update match count
  matchCount.textContent = matches.length > 0 ? 
    `${matches.length} item${matches.length > 1 ? 's' : ''} found` : 
    "No items found";

  // Highlight matches
  matches.forEach(el => el.classList.add("highlight"));

  // Show first match details
  if (matches.length > 0) {
    const firstMatch = matches[0];
    showMatchDetails(firstMatch);
    result.classList.remove("d-none");
  } else {
    result.classList.remove("d-none");
    result.innerHTML = `<i class="bi bi-x-circle-fill text-danger"></i> <strong>${query}</strong> not found`;
  }
}

function fuzzyMatch(str, query) {
  // Simple fuzzy matching - checks if query letters appear in order in str
  let queryIndex = 0;
  str = str.toLowerCase();
  query = query.toLowerCase();
  
  for (let i = 0; i < str.length; i++) {
    if (str[i] === query[queryIndex]) {
      queryIndex++;
      if (queryIndex === query.length) return true;
    }
  }
  return false;
}

function showMatchDetails(matchEl) {
  let location = '';
  if (matchEl.dataset.wall) {
    location = `${matchEl.dataset.wall}`;
  } else {
    location = `${matchEl.dataset.column} → ${matchEl.dataset.pillar}`;
  }

  result.innerHTML = `
    <i class="bi bi-check-circle-fill text-success"></i> 
    <strong>${matchEl.dataset.name}</strong> (${matchEl.dataset.code}) 
    found in <strong>${location}</strong>
  `;
}

function clearSearchHandler() {
  searchInput.value = "";
  searchInput.focus();
  clearSearch.style.display = "none";
  itemElements.forEach(el => el.classList.remove("highlight"));
  result.classList.add("d-none");
  matchCount.textContent = "";
  suggestionsDropdown.style.display = "none";
}

// Autocomplete Suggestions
function updateSuggestions(query) {
  if (query.length < 2) {
    suggestionsDropdown.style.display = "none";
    return;
  }

  const suggestions = [];
  const queryLower = query.toLowerCase();

  // Get unique suggestions from both codes and names
  const seen = new Set();
  itemElements.forEach(el => {
    if (el.dataset.code.toLowerCase().includes(queryLower) && !seen.has(el.dataset.code)) {
      suggestions.push({ type: "Code", value: el.dataset.code });
      seen.add(el.dataset.code);
    }
    if (el.dataset.name.toLowerCase().includes(queryLower) && !seen.has(el.dataset.name)) {
      suggestions.push({ type: "Name", value: el.dataset.name });
      seen.add(el.dataset.name);
    }
  });

  // Limit to 10 suggestions
  const limitedSuggestions = suggestions.slice(0, 10);

  if (limitedSuggestions.length > 0) {
    suggestionsDropdown.innerHTML = limitedSuggestions.map(s => `
      <div class="suggestion-item" data-value="${s.value}">
        <small class="text-muted">${s.type}:</small> ${s.value}
      </div>
    `).join("");
    
    // Add click handlers to suggestions
    document.querySelectorAll('.suggestion-item').forEach(item => {
      item.addEventListener('click', () => {
        searchInput.value = item.dataset.value;
        searchInput.dispatchEvent(new Event('input'));
        suggestionsDropdown.style.display = "none";
      });
    });
    
    suggestionsDropdown.style.display = "block";
  } else {
    suggestionsDropdown.style.display = "none";
  }
}

function showSuggestions() {
  if (searchInput.value.trim().length >= 2) {
    suggestionsDropdown.style.display = "block";
  }
}

// Close suggestions when clicking outside
document.addEventListener('click', (e) => {
  if (!searchInput.contains(e.target) && !suggestionsDropdown.contains(e.target)) {
    suggestionsDropdown.style.display = "none";
  }
});

// Keyboard navigation for suggestions
function handleKeyboardNavigation(e) {
  if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter") {
    const suggestions = Array.from(suggestionsDropdown.querySelectorAll('.suggestion-item'));
    const currentFocus = document.activeElement;
    let currentIndex = suggestions.indexOf(currentFocus);

    if (e.key === "ArrowDown") {
      e.preventDefault();
      const nextIndex = currentIndex < suggestions.length - 1 ? currentIndex + 1 : 0;
      suggestions[nextIndex].focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : suggestions.length - 1;
      suggestions[prevIndex].focus();
    } else if (e.key === "Enter" && currentIndex !== -1) {
      e.preventDefault();
      searchInput.value = suggestions[currentIndex].dataset.value;
      searchInput.dispatchEvent(new Event('input'));
      suggestionsDropdown.style.display = "none";
    }
  } else if (e.key === "Escape") {
    suggestionsDropdown.style.display = "none";
  }
}
