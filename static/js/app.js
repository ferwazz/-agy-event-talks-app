// Global Application State
let releaseNotes = [];
let selectedNotes = new Set();
let currentFilter = 'all';
let searchQuery = '';

// DOM Elements
const notesListEl = document.getElementById('notes-list');
const searchInputEl = document.getElementById('search-input');
const btnRefreshEl = document.getElementById('btn-refresh');
const lastUpdatedEl = document.getElementById('last-updated');
const syncIndicatorEl = document.getElementById('sync-indicator');
const filterChipsContainer = document.getElementById('filter-chips');
const floatingBarEl = document.getElementById('floating-bar');
const floatingCountEl = document.getElementById('floating-count');
const btnClearSelectionEl = document.getElementById('btn-clear-selection');
const btnTweetSelectedEl = document.getElementById('btn-tweet-selected');

// Modal Elements
const tweetModalEl = document.getElementById('tweet-modal');
const btnCloseModalEl = document.getElementById('btn-close-modal');
const btnCancelTweetEl = document.getElementById('btn-cancel-tweet');
const btnTweetConfirmEl = document.getElementById('btn-tweet-confirm');
const btnCopyTweetEl = document.getElementById('btn-copy-tweet');
const tweetTextareaEl = document.getElementById('tweet-textarea');
const charCountEl = document.getElementById('char-count');

// Toast Container
const toastContainerEl = document.getElementById('toast-container');

// SVG Icons (to keep code clean and self-contained)
const iconCheckSvg = `<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`;

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  loadReleaseNotes();
});

// Event Listeners
function setupEventListeners() {
  // Search
  searchInputEl.addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase().strip(); // Custom inline strip-like clean or standard trim
    searchQuery = e.target.value.toLowerCase().trim();
    renderFilteredNotes();
  });

  // Refresh
  btnRefreshEl.addEventListener('click', () => {
    loadReleaseNotes(true);
  });

  // Clear Selection
  btnClearSelectionEl.addEventListener('click', clearSelection);

  // Open Tweet Modal for selected
  btnTweetSelectedEl.addEventListener('click', () => {
    openTweetComposer(Array.from(selectedNotes));
  });

  // Modal Actions
  btnCloseModalEl.addEventListener('click', closeTweetComposer);
  btnCancelTweetEl.addEventListener('click', closeTweetComposer);
  btnCopyTweetEl.addEventListener('click', copyTweetToClipboard);
  btnTweetConfirmEl.addEventListener('click', publishTweet);

  tweetTextareaEl.addEventListener('input', updateCharCount);

  // Close modal on click outside
  tweetModalEl.addEventListener('click', (e) => {
    if (e.target === tweetModalEl) {
      closeTweetComposer();
    }
  });

  // Keyboard navigation for escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeTweetComposer();
    }
  });
}

// Fetch notes from Flask API
async function loadReleaseNotes(forceRefresh = false) {
  setLoadingState(true);
  clearSelection();

  try {
    const url = `/api/release-notes${forceRefresh ? '?refresh=true' : ''}`;
    const response = await fetch(url);
    const result = await response.json();

    if (result.success) {
      releaseNotes = result.notes;
      updateSyncStatus(result.source);
      renderFilterChips();
      renderFilteredNotes();
      showToast(
        forceRefresh 
          ? `Successfully refreshed BigQuery release notes!` 
          : `Loaded ${releaseNotes.length} updates.`,
        'success'
      );
    } else {
      showToast(`Failed to load release notes: ${result.error}`, 'error');
      renderEmptyState(`Error loading release notes: ${result.error}`);
    }
  } catch (error) {
    console.error('Error fetching release notes:', error);
    showToast(`Error fetching data from server.`, 'error');
    renderEmptyState('Could not connect to the backend server. Make sure Flask is running.');
  } finally {
    setLoadingState(false);
  }
}

// Set Loading UI State
function setLoadingState(isLoading) {
  if (isLoading) {
    btnRefreshEl.classList.add('loading');
    btnRefreshEl.disabled = true;
    searchInputEl.disabled = true;
    
    // Show Skeletons
    notesListEl.innerHTML = Array(5).fill(0).map(() => `
      <div class="skeleton-card">
        <div class="skeleton-header">
          <div class="skeleton-title"></div>
          <div class="skeleton-badge"></div>
        </div>
        <div class="skeleton-line" style="width: 90%;"></div>
        <div class="skeleton-line" style="width: 75%;"></div>
        <div class="skeleton-line" style="width: 40%;"></div>
      </div>
    `).join('');
  } else {
    btnRefreshEl.classList.remove('loading');
    btnRefreshEl.disabled = false;
    searchInputEl.disabled = false;
  }
}

// Update Sync Status indicators
function updateSyncStatus(source) {
  const now = new Date();
  const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  lastUpdatedEl.textContent = `Last synchronized: ${timeString}`;

  if (source === 'cached') {
    syncIndicatorEl.className = 'sync-indicator cached';
    syncIndicatorEl.querySelector('.status-text').textContent = 'Local Cache';
  } else {
    syncIndicatorEl.className = 'sync-indicator';
    syncIndicatorEl.querySelector('.status-text').textContent = 'Live Feed';
  }
}

// Render dynamic chips with update counts
function renderFilterChips() {
  const counts = {
    all: releaseNotes.length,
    feature: 0,
    issue: 0,
    announcement: 0,
    deprecated: 0,
    general: 0
  };

  releaseNotes.forEach(note => {
    const type = note.type.toLowerCase();
    if (counts.hasOwnProperty(type)) {
      counts[type]++;
    } else {
      counts['general']++;
    }
  });

  const categories = [
    { id: 'all', label: 'All Updates' },
    { id: 'feature', label: 'Features', class: 'badge-feature' },
    { id: 'issue', label: 'Issues', class: 'badge-issue' },
    { id: 'announcement', label: 'Announcements', class: 'badge-announcement' },
    { id: 'deprecated', label: 'Deprecated', class: 'badge-deprecated' },
    { id: 'general', label: 'General', class: 'badge-general' }
  ];

  filterChipsContainer.innerHTML = categories.map(cat => {
    const count = counts[cat.id];
    if (count === 0 && cat.id !== 'all') return ''; // Don't show empty filters

    const isActive = currentFilter === cat.id ? 'active' : '';
    return `
      <div class="chip ${isActive}" data-filter="${cat.id}">
        <span>${cat.label}</span>
        <span class="chip-count">${count}</span>
      </div>
    `;
  }).join('');

  // Add click handlers
  filterChipsContainer.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      filterChipsContainer.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentFilter = chip.dataset.filter;
      renderFilteredNotes();
    });
  });
}

// Filter and render notes
function renderFilteredNotes() {
  let filtered = releaseNotes;

  // Filter by category
  if (currentFilter !== 'all') {
    filtered = filtered.filter(note => {
      const type = note.type.toLowerCase();
      if (currentFilter === 'general') {
        return type !== 'feature' && type !== 'issue' && type !== 'announcement' && type !== 'deprecated';
      }
      return type === currentFilter;
    });
  }

  // Filter by search query
  if (searchQuery) {
    filtered = filtered.filter(note => 
      note.content_text.toLowerCase().includes(searchQuery) ||
      note.type.toLowerCase().includes(searchQuery) ||
      note.date.toLowerCase().includes(searchQuery)
    );
  }

  if (filtered.length === 0) {
    renderEmptyState('No release notes match your search or filter criteria.');
    return;
  }

  notesListEl.innerHTML = filtered.map(note => {
    const isSelected = selectedNotes.has(note.id) ? 'selected' : '';
    const badgeClass = getBadgeClass(note.type);
    
    return `
      <div class="card ${isSelected}" data-id="${note.id}" data-type="${note.type}">
        <div class="card-header">
          <div class="card-meta">
            <span class="card-date">${note.date}</span>
            <div>
              <span class="badge ${badgeClass}">${note.type}</span>
            </div>
          </div>
          <div class="checkbox-container" title="Select for tweet digest">
            ${iconCheckSvg}
          </div>
        </div>
        <div class="card-content">
          ${note.content_html}
        </div>
        <div class="card-footer">
          <a href="${note.link}" class="btn-source-link" target="_blank" rel="noopener noreferrer">
            <svg viewBox="0 0 24 24"><path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>
            Release Notes Link
          </a>
          <button class="btn btn-tweet-sm btn-action-tweet" data-id="${note.id}">
            <svg viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            Tweet
          </button>
        </div>
      </div>
    `;
  }).join('');

  // Setup click handlers for cards (toggles selection)
  notesListEl.querySelectorAll('.card').forEach(card => {
    card.addEventListener('click', (e) => {
      // Don't toggle selection if the user clicked a link, button, or inside a button
      if (
        e.target.tagName === 'A' || 
        e.target.closest('a') || 
        e.target.tagName === 'BUTTON' || 
        e.target.closest('button')
      ) {
        return;
      }
      
      const id = card.dataset.id;
      toggleNoteSelection(id);
    });
  });

  // Setup individual tweet button clicks
  notesListEl.querySelectorAll('.btn-action-tweet').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation(); // Stop card click from triggering
      const id = btn.dataset.id;
      const note = releaseNotes.find(n => n.id === id);
      if (note) {
        openTweetComposer([note]);
      }
    });
  });
}

// Render empty state placeholder
function renderEmptyState(message) {
  notesListEl.innerHTML = `
    <div class="empty-state">
      <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h-2v-2h4v8zm0-10h-2V5h2v2z"/></svg>
      <h3>No Updates Found</h3>
      <p>${message}</p>
    </div>
  `;
}

// Select note toggler
function toggleNoteSelection(id) {
  if (selectedNotes.has(id)) {
    selectedNotes.delete(id);
  } else {
    selectedNotes.add(id);
  }

  // Update card UI class
  const card = notesListEl.querySelector(`.card[data-id="${id}"]`);
  if (card) {
    card.classList.toggle('selected');
  }

  updateFloatingBar();
}

// Clear all card selections
function clearSelection() {
  selectedNotes.clear();
  notesListEl.querySelectorAll('.card').forEach(card => {
    card.classList.remove('selected');
  });
  updateFloatingBar();
}

// Manage display and count on floating action bar
function updateFloatingBar() {
  const count = selectedNotes.size;
  if (count > 0) {
    floatingCountEl.textContent = count;
    floatingBarEl.classList.add('show');
  } else {
    floatingBarEl.classList.remove('show');
  }
}

// Map database categories to CSS classes
function getBadgeClass(type) {
  switch (type.toLowerCase()) {
    case 'feature': return 'badge-feature';
    case 'issue': return 'badge-issue';
    case 'announcement': return 'badge-announcement';
    case 'deprecated': return 'badge-deprecated';
    default: return 'badge-general';
  }
}

// Open Tweet Modal with precomposed draft
function openTweetComposer(notesToCompose) {
  if (notesToCompose.length === 0) return;

  let tweetContent = '';

  if (notesToCompose.length === 1) {
    // Single update tweet
    const note = typeof notesToCompose[0] === 'string' 
      ? releaseNotes.find(n => n.id === notesToCompose[0]) 
      : notesToCompose[0];
      
    if (note) {
      // Compose nice text: "BigQuery Feature (June 15): Use Gemini Cloud Assist... [link]"
      const cleanText = note.content_text;
      
      // Compute safe text snippet length
      // 280 max - (length of "BigQuery Feature (June 15, 2026): " -> ~34 chars) - (link length -> 23 chars for t.co) - buffer
      const prefix = `BigQuery ${note.type} (${note.date}): `;
      const suffix = ` ${note.link}`;
      const hashTags = " #BigQuery #GoogleCloud";
      
      // Free character space for the raw text
      const maxTextSpace = 280 - prefix.length - 24 - hashTags.length; // 24 accounts for t.co link standard
      let bodyText = cleanText;
      if (bodyText.length > maxTextSpace) {
        bodyText = bodyText.substring(0, maxTextSpace - 3) + "...";
      }
      
      tweetContent = `${prefix}${bodyText}${suffix}${hashTags}`;
    }
  } else {
    // Multi-select digest digest tweet
    // Combine short summaries of selected updates
    const resolvedNotes = notesToCompose.map(idOrNote => {
      return typeof idOrNote === 'string' 
        ? releaseNotes.find(n => n.id === idOrNote) 
        : idOrNote;
    }).filter(Boolean);

    tweetContent = `BigQuery Updates Digest 🚀\n`;
    
    resolvedNotes.forEach((note, idx) => {
      // Mini summary of each
      let summary = note.content_text;
      if (summary.length > 70) {
        summary = summary.substring(0, 67) + "...";
      }
      tweetContent += `• [${note.type}] ${summary}\n`;
    });
    
    tweetContent += `\nRead more at Google Cloud Release Notes: https://docs.cloud.google.com/bigquery/docs/release-notes`;
  }

  // Set text in composer and show modal
  tweetTextareaEl.value = tweetContent;
  updateCharCount();
  tweetModalEl.classList.add('show');
}

// Close Tweet Modal
function closeTweetComposer() {
  tweetModalEl.classList.remove('show');
}

// Character counter and visual indicators
function updateCharCount() {
  const currentLength = tweetTextareaEl.value.length;
  charCountEl.textContent = `${currentLength} / 280`;

  // Visual warning for character length
  if (currentLength > 280) {
    charCountEl.className = 'char-counter danger';
    btnTweetConfirmEl.disabled = true;
  } else if (currentLength > 250) {
    charCountEl.className = 'char-counter warning';
    btnTweetConfirmEl.disabled = false;
  } else {
    charCountEl.className = 'char-counter';
    btnTweetConfirmEl.disabled = false;
  }
}

// Copies Composed Tweet text to clipboard
function copyTweetToClipboard() {
  tweetTextareaEl.select();
  tweetTextareaEl.setSelectionRange(0, 99999); // For mobile devices

  try {
    navigator.clipboard.writeText(tweetTextareaEl.value);
    showToast('Copied tweet text to clipboard!', 'success');
  } catch (err) {
    // Fallback in case navigator.clipboard is not supported
    try {
      document.execCommand('copy');
      showToast('Copied tweet text to clipboard!', 'success');
    } catch (fallbackErr) {
      showToast('Failed to copy text. Please select and copy manually.', 'error');
    }
  }
}

// Launches Twitter Web Intent
function publishTweet() {
  const tweetText = tweetTextareaEl.value;
  const encodedText = encodeURIComponent(tweetText);
  const twitterIntentUrl = `https://twitter.com/intent/tweet?text=${encodedText}`;
  
  window.open(twitterIntentUrl, '_blank', 'width=550,height=420,menubar=no,toolbar=no,status=no');
  
  closeTweetComposer();
  showToast('Opened Twitter Intent window!', 'success');
  clearSelection();
}

// Show standard toast notifications
function showToast(message, type = 'success') {
  // Create elements
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  let iconHtml = '';
  if (type === 'success') {
    iconHtml = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;
  } else {
    iconHtml = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;
  }

  toast.innerHTML = `
    <div class="toast-icon ${type}">
      ${iconHtml}
    </div>
    <div class="toast-message">${message}</div>
  `;

  toastContainerEl.appendChild(toast);

  // Trigger reflow to animate
  toast.offsetHeight;
  toast.classList.add('show');

  // Remove toast after 3 seconds
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3000);
}
