/**
 * Research Opportunity Portal — Frontend Logic
 * Pure Vanilla JavaScript (No frameworks, no build tools, no CDN dependencies)
 */

// =============================================================================
// Configuration & Constants
// =============================================================================

const API_BASE_URL = "http://localhost:5000/api/opportunities";

// Global Application State
let opportunities = [];
let currentEditingId = null;
let currentDeletingId = null;
let currentModal = null;

// =============================================================================
// DOM Elements Cache
// =============================================================================

const elements = {
  // Main view
  opportunitiesGrid: document.getElementById("opportunitiesGrid"),
  loadingState: document.getElementById("loadingState"),
  emptyState: document.getElementById("emptyState"),
  emptyTitle: document.getElementById("emptyTitle"),
  emptyDescription: document.getElementById("emptyDescription"),
  resultsCount: document.getElementById("resultsCount"),
  searchInput: document.getElementById("searchInput"),
  clearSearchBtn: document.getElementById("clearSearchBtn"),
  statusFilter: document.getElementById("statusFilter"),
  refreshBtn: document.getElementById("refreshBtn"),
  openCreateBtn: document.getElementById("openCreateBtn"),
  emptyActionBtn: document.getElementById("emptyActionBtn"),
  toastContainer: document.getElementById("toastContainer"),

  // Form Modal
  formModal: document.getElementById("formModal"),
  opportunityForm: document.getElementById("opportunityForm"),
  formModalTitle: document.getElementById("formModalTitle"),
  formModalSubtitle: document.getElementById("formModalSubtitle"),
  submitBtn: document.getElementById("submitBtn"),
  inputTitle: document.getElementById("inputTitle"),
  inputResearchArea: document.getElementById("inputResearchArea"),
  inputFacultyName: document.getElementById("inputFacultyName"),
  inputDepartment: document.getElementById("inputDepartment"),
  inputPositions: document.getElementById("inputPositions"),
  inputDeadline: document.getElementById("inputDeadline"),
  selectStatus: document.getElementById("selectStatus"),
  inputSkills: document.getElementById("inputSkills"),
  inputDescription: document.getElementById("inputDescription"),
  countTitle: document.getElementById("countTitle"),

  // Details Modal
  detailsModal: document.getElementById("detailsModal"),
  detailsTitle: document.getElementById("detailsTitle"),
  detailsStatusBadge: document.getElementById("detailsStatusBadge"),
  detailsArea: document.getElementById("detailsArea"),
  detailsFaculty: document.getElementById("detailsFaculty"),
  detailsDepartment: document.getElementById("detailsDepartment"),
  detailsPositions: document.getElementById("detailsPositions"),
  detailsDeadline: document.getElementById("detailsDeadline"),
  detailsSkills: document.getElementById("detailsSkills"),
  detailsDescription: document.getElementById("detailsDescription"),
  detailsCloseStatusBtn: document.getElementById("detailsCloseStatusBtn"),
  detailsEditBtn: document.getElementById("detailsEditBtn"),
  detailsDeleteBtn: document.getElementById("detailsDeleteBtn"),

  // Delete Modal
  deleteModal: document.getElementById("deleteModal"),
  deleteTargetTitle: document.getElementById("deleteTargetTitle"),
  confirmDeleteBtn: document.getElementById("confirmDeleteBtn"),
};

// =============================================================================
// Security & Formatting Helpers
// =============================================================================

/**
 * Escape HTML to prevent XSS attacks when rendering content.
 * @param {string|number} str
 * @returns {string}
 */
function escapeHTML(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Format ISO date string (YYYY-MM-DD) to friendly display format.
 * @param {string} dateStr
 * @returns {string}
 */
function formatDate(dateStr) {
  if (!dateStr) return "N/A";
  // Handle ISO strings with timestamps
  const cleanDate = dateStr.split("T")[0];
  const parts = cleanDate.split("-");
  if (parts.length === 3) {
    const year = parts[0];
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const dateObj = new Date(year, month, day);
    if (!isNaN(dateObj)) {
      return dateObj.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }
  }
  return cleanDate;
}

// =============================================================================
// API Request Helper
// =============================================================================

/**
 * Universal API helper that sets headers, parses JSON, and standardizes errors.
 * @param {string} endpoint - Sub-path (e.g. "/1") or empty string for base URL.
 * @param {object} options - Fetch options (method, body, etc.).
 * @returns {Promise<any>}
 */
async function apiRequest(endpoint = "", options = {}) {
  const url = endpoint
    ? `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : "/" + endpoint}`
    : API_BASE_URL;

  const config = {
    headers: {
      Accept: "application/json",
      ...(options.headers || {}),
    },
    ...options,
  };

  // Ensure JSON headers and stringified body for mutations
  if (config.body && typeof config.body === "object") {
    config.headers["Content-Type"] = "application/json";
    config.body = JSON.stringify(config.body);
  }

  let response;
  try {
    response = await fetch(url, config);
  } catch (networkError) {
    // Thrown if server is offline or unreachable
    throw new Error(
      "Cannot connect to the server. Make sure the backend is running on port 5000."
    );
  }

  // Parse JSON response safely
  let data = null;
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    try {
      data = await response.json();
    } catch (e) {
      data = null;
    }
  }

  // Handle HTTP error responses
  if (!response.ok) {
    const errorMsg =
      (data && (data.error || data.message)) ||
      `Request failed with status ${response.status}`;
    const err = new Error(errorMsg);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}

// =============================================================================
// Toast Notifications
// =============================================================================

/**
 * Display toast notification with auto-dismissal.
 * @param {string} message - Text to display.
 * @param {"success"|"error"} type - Toast style accent.
 */
function showToast(message, type = "success") {
  if (!elements.toastContainer) return;

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.setAttribute("role", "alert");

  const iconSvg =
    type === "success"
      ? `<svg class="toast-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
           <path d="M20 6 9 17l-5-5"/>
         </svg>`
      : `<svg class="toast-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
           <circle cx="12" cy="12" r="10"/>
           <line x1="12" y1="8" x2="12" y2="12"/>
           <line x1="12" y1="16" x2="12.01" y2="16"/>
         </svg>`;

  toast.innerHTML = `
    ${iconSvg}
    <div class="toast-body">${escapeHTML(message)}</div>
    <button class="toast-close" type="button" aria-label="Dismiss notification">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 6 6 18M6 6l12 12"/>
      </svg>
    </button>
  `;

  // Close toast on button click
  const closeBtn = toast.querySelector(".toast-close");
  closeBtn.addEventListener("click", () => dismissToast(toast));

  elements.toastContainer.appendChild(toast);

  // Auto dismiss after ~4 seconds
  const autoDismissTimer = setTimeout(() => {
    dismissToast(toast);
  }, 4000);

  function dismissToast(el) {
    clearTimeout(autoDismissTimer);
    el.classList.add("toast-hiding");
    setTimeout(() => {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 180);
  }
}

// =============================================================================
// Modal Management (Accessibility & Keyboard Support)
// =============================================================================

/**
 * Open a modal and trap focus.
 * @param {HTMLElement} modalEl
 */
function openModal(modalEl) {
  if (!modalEl) return;
  modalEl.hidden = false;
  // Trigger animation frame for CSS transition
  requestAnimationFrame(() => {
    modalEl.classList.add("is-active");
  });
  currentModal = modalEl;
  document.body.style.overflow = "hidden";

  // Focus the first sensible input or close button
  const focusable = modalEl.querySelector(
    'input:not([type="hidden"]), select, textarea, button:not(.modal-close-btn)'
  );
  if (focusable) {
    setTimeout(() => focusable.focus(), 50);
  }
}

/**
 * Close a modal and restore document scrolling.
 * @param {HTMLElement} modalEl
 */
function closeModal(modalEl) {
  if (!modalEl) return;
  modalEl.classList.remove("is-active");
  setTimeout(() => {
    modalEl.hidden = true;
    if (currentModal === modalEl) currentModal = null;
    // Check if any other modal is active
    if (!document.querySelector(".modal-backdrop.is-active")) {
      document.body.style.overflow = "";
    }
  }, 150);
}

// =============================================================================
// Opportunity Data Management & Card Rendering
// =============================================================================

/**
 * Fetch all opportunities from backend API.
 */
async function loadOpportunities() {
  showLoadingState();

  try {
    const response = await apiRequest();
    // Normalize data: backend may return [items] or { success: true, data: [items] }
    if (Array.isArray(response)) {
      opportunities = response;
    } else if (response && Array.isArray(response.data)) {
      opportunities = response.data;
    } else {
      opportunities = [];
    }
    renderCards();
  } catch (error) {
    showToast(error.message, "error");
    showEmptyState(
      "Unable to Load Opportunities",
      error.message
    );
  } finally {
    hideLoadingState();
  }
}

/**
 * Filter opportunities and render them into cards grid.
 */
function renderCards() {
  const searchQuery = (elements.searchInput.value || "").trim().toLowerCase();
  const statusFilterVal = elements.statusFilter.value || "All";

  // Filter based on search query and status filter
  const filtered = opportunities.filter((item) => {
    const matchesStatus =
      statusFilterVal === "All" || item.status === statusFilterVal;

    const matchesSearch =
      !searchQuery ||
      (item.title && item.title.toLowerCase().includes(searchQuery)) ||
      (item.research_area && item.research_area.toLowerCase().includes(searchQuery)) ||
      (item.faculty_name && item.faculty_name.toLowerCase().includes(searchQuery)) ||
      (item.department && item.department.toLowerCase().includes(searchQuery));

    return matchesStatus && matchesSearch;
  });

  // Update counter
  elements.resultsCount.textContent = `Showing ${filtered.length} of ${opportunities.length} opportunities`;

  // Toggle clear search button
  elements.clearSearchBtn.hidden = !searchQuery;

  // Clear grid
  elements.opportunitiesGrid.innerHTML = "";

  if (filtered.length === 0) {
    elements.opportunitiesGrid.hidden = true;
    elements.emptyState.hidden = false;

    if (opportunities.length === 0) {
      elements.emptyTitle.textContent = "No Opportunities Found";
      elements.emptyDescription.textContent =
        "There are no research positions posted yet. Click below to add the first one.";
      elements.emptyActionBtn.hidden = false;
    } else {
      elements.emptyTitle.textContent = "No Matching Opportunities";
      elements.emptyDescription.textContent =
        "Try adjusting your search criteria or clearing filters.";
      elements.emptyActionBtn.hidden = true;
    }
    return;
  }

  elements.emptyState.hidden = true;
  elements.opportunitiesGrid.hidden = false;

  // Build and append each card
  filtered.forEach((opp) => {
    const card = createCardElement(opp);
    elements.opportunitiesGrid.appendChild(card);
  });
}

/**
 * Create a DOM card element for an opportunity.
 * @param {object} opp
 * @returns {HTMLElement}
 */
function createCardElement(opp) {
  const card = document.createElement("article");
  card.className = "card";
  card.setAttribute("data-id", opp.id);

  const isOpen = opp.status === "Open";
  const statusClass = isOpen ? "status-open" : "status-closed";
  const deadlineText = formatDate(opp.deadline);

  card.innerHTML = `
    <div class="card-top">
      <div class="card-header">
        <span class="status-badge ${statusClass}">
          <span class="status-dot"></span>
          <span class="status-text">${escapeHTML(opp.status)}</span>
        </span>
        <span class="card-area-badge" title="${escapeHTML(opp.research_area)}">
          ${escapeHTML(opp.research_area)}
        </span>
      </div>

      <h3 class="card-title" title="${escapeHTML(opp.title)}">${escapeHTML(opp.title)}</h3>

      <div class="card-meta-list" style="margin-top: 12px;">
        <div class="card-meta-item" title="Faculty Supervisor">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
          <span>${escapeHTML(opp.faculty_name)}</span>
        </div>

        <div class="card-meta-item" title="Department">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M3 21h18M3 7v14M21 7v14M6 7V3h12v4"/>
          </svg>
          <span>${escapeHTML(opp.department)}</span>
        </div>

        <div class="card-meta-item" title="Available Positions">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
          </svg>
          <span>${escapeHTML(opp.available_positions)} ${opp.available_positions === 1 ? "position" : "positions"}</span>
        </div>

        <div class="card-meta-item" title="Application Deadline">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
            <line x1="16" x2="16" y1="2" y2="6"/>
            <line x1="8" x2="8" y1="2" y2="6"/>
            <line x1="3" x2="21" y1="10" y2="10"/>
          </svg>
          <span>Deadline: ${escapeHTML(deadlineText)}</span>
        </div>
      </div>
    </div>

    <div class="card-actions">
      <div class="card-actions-left">
        <button class="btn btn-secondary btn-sm btn-view" type="button">
          View Details
        </button>
      </div>

      <div class="card-actions-right">
        ${
          isOpen
            ? `<button class="btn btn-warning btn-sm btn-close-opp" type="button" title="Close applications">
                 Close
               </button>`
            : ""
        }
        <button class="btn btn-secondary btn-sm btn-edit" type="button" aria-label="Edit opportunity" title="Edit">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
          </svg>
        </button>
        <button class="btn btn-danger btn-sm btn-delete" type="button" aria-label="Delete opportunity" title="Delete">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
          </svg>
        </button>
      </div>
    </div>
  `;

  // Attach card event listeners
  const viewBtn = card.querySelector(".btn-view");
  viewBtn.addEventListener("click", () => openDetailsModal(opp.id));

  const editBtn = card.querySelector(".btn-edit");
  editBtn.addEventListener("click", () => openEditModal(opp.id));

  const deleteBtn = card.querySelector(".btn-delete");
  deleteBtn.addEventListener("click", () => promptDelete(opp.id, opp.title));

  const closeBtn = card.querySelector(".btn-close-opp");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => closeOpportunity(opp.id));
  }

  return card;
}

function showLoadingState() {
  elements.loadingState.hidden = false;
  elements.emptyState.hidden = true;
  elements.opportunitiesGrid.hidden = true;
  elements.resultsCount.textContent = "Loading opportunities...";
}

function hideLoadingState() {
  elements.loadingState.hidden = true;
}

function showEmptyState(title, desc) {
  elements.emptyState.hidden = false;
  elements.opportunitiesGrid.hidden = true;
  elements.emptyTitle.textContent = title;
  elements.emptyDescription.textContent = desc;
  elements.resultsCount.textContent = "0 opportunities found";
}

// =============================================================================
// Opportunity Details Modal
// =============================================================================

/**
 * Open details modal for an opportunity fetched via GET /api/opportunities/:id
 * @param {number|string} id
 */
async function openDetailsModal(id) {
  try {
    const res = await apiRequest(`/${id}`);
    const opp = res && res.data && !Array.isArray(res.data) ? res.data : res;

    if (!opp) throw new Error("Opportunity data could not be retrieved");

    // Populate Details Modal
    elements.detailsTitle.textContent = opp.title || "";
    elements.detailsArea.textContent = opp.research_area || "";
    elements.detailsFaculty.textContent = opp.faculty_name || "N/A";
    elements.detailsDepartment.textContent = opp.department || "N/A";
    elements.detailsPositions.textContent = `${opp.available_positions} ${
      Number(opp.available_positions) === 1 ? "position" : "positions"
    }`;
    elements.detailsDeadline.textContent = formatDate(opp.deadline);
    elements.detailsDescription.textContent = opp.description || "No description provided.";

    // Update Status Badge
    const isOpen = opp.status === "Open";
    elements.detailsStatusBadge.className = `status-badge ${
      isOpen ? "status-open" : "status-closed"
    }`;
    elements.detailsStatusBadge.querySelector(".status-text").textContent =
      opp.status || "Unknown";

    // Format Required Skills
    elements.detailsSkills.innerHTML = "";
    if (opp.required_skills) {
      const skills = opp.required_skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (skills.length > 0) {
        skills.forEach((skill) => {
          const tag = document.createElement("span");
          tag.className = "skill-tag";
          tag.textContent = skill;
          elements.detailsSkills.appendChild(tag);
        });
      } else {
        const tag = document.createElement("span");
        tag.className = "skill-tag";
        tag.textContent = opp.required_skills;
        elements.detailsSkills.appendChild(tag);
      }
    } else {
      elements.detailsSkills.textContent = "None specified";
    }

    // Configure Footer Action Buttons
    if (isOpen) {
      elements.detailsCloseStatusBtn.hidden = false;
      elements.detailsCloseStatusBtn.onclick = async () => {
        closeModal(elements.detailsModal);
        await closeOpportunity(opp.id);
      };
    } else {
      elements.detailsCloseStatusBtn.hidden = true;
    }

    elements.detailsEditBtn.onclick = () => {
      closeModal(elements.detailsModal);
      openEditModal(opp.id);
    };

    elements.detailsDeleteBtn.onclick = () => {
      closeModal(elements.detailsModal);
      promptDelete(opp.id, opp.title);
    };

    openModal(elements.detailsModal);
  } catch (error) {
    showToast(error.message, "error");
    if (error.status === 404) {
      loadOpportunities();
    }
  }
}

// =============================================================================
// Opportunity Form (Create & Edit) + Validation
// =============================================================================

/**
 * Open form modal in "Create" mode.
 */
function openCreateModal() {
  currentEditingId = null;
  clearFormValidation();
  elements.opportunityForm.reset();

  elements.formModalTitle.textContent = "New Opportunity";
  elements.formModalSubtitle.textContent =
    "Post a new research opportunity for university students";
  elements.submitBtn.querySelector(".btn-text").textContent =
    "Create Opportunity";
  elements.selectStatus.value = "Open";
  elements.countTitle.textContent = "0";

  openModal(elements.formModal);
}

/**
 * Open form modal in "Edit" mode pre-filled with data.
 * @param {number|string} id
 */
async function openEditModal(id) {
  try {
    const res = await apiRequest(`/${id}`);
    const opp = res && res.data && !Array.isArray(res.data) ? res.data : res;

    if (!opp) throw new Error("Opportunity could not be loaded for editing");

    currentEditingId = id;
    clearFormValidation();

    elements.formModalTitle.textContent = "Edit Opportunity";
    elements.formModalSubtitle.textContent = `Update opportunity #${id}`;
    elements.submitBtn.querySelector(".btn-text").textContent = "Save Changes";

    // Pre-fill inputs with exact field names
    elements.inputTitle.value = opp.title || "";
    elements.inputResearchArea.value = opp.research_area || "";
    elements.inputFacultyName.value = opp.faculty_name || "";
    elements.inputDepartment.value = opp.department || "";
    elements.inputPositions.value = opp.available_positions || 1;
    // Format deadline as YYYY-MM-DD for date input
    elements.inputDeadline.value = opp.deadline ? opp.deadline.split("T")[0] : "";
    elements.selectStatus.value = opp.status || "Open";
    elements.inputSkills.value = opp.required_skills || "";
    elements.inputDescription.value = opp.description || "";

    elements.countTitle.textContent = elements.inputTitle.value.length;

    openModal(elements.formModal);
  } catch (error) {
    showToast(error.message, "error");
    if (error.status === 404) {
      loadOpportunities();
    }
  }
}

/**
 * Perform client-side validation on all required fields.
 * @returns {boolean} isValid
 */
function validateForm() {
  clearFormValidation();
  let isValid = true;

  // Title: required, trimmed, max 200 chars
  const title = elements.inputTitle.value.trim();
  if (!title) {
    setFieldError("title", "Opportunity title is required");
    isValid = false;
  } else if (title.length > 200) {
    setFieldError("title", "Title cannot exceed 200 characters");
    isValid = false;
  }

  // Research Area: required, trimmed, max 100 chars
  const researchArea = elements.inputResearchArea.value.trim();
  if (!researchArea) {
    setFieldError("research_area", "Research area is required");
    isValid = false;
  } else if (researchArea.length > 100) {
    setFieldError("research_area", "Research area cannot exceed 100 characters");
    isValid = false;
  }

  // Faculty Name: required, trimmed, max 100 chars
  const facultyName = elements.inputFacultyName.value.trim();
  if (!facultyName) {
    setFieldError("faculty_name", "Faculty name is required");
    isValid = false;
  } else if (facultyName.length > 100) {
    setFieldError("faculty_name", "Faculty name cannot exceed 100 characters");
    isValid = false;
  }

  // Department: required, trimmed, max 100 chars
  const department = elements.inputDepartment.value.trim();
  if (!department) {
    setFieldError("department", "Department is required");
    isValid = false;
  } else if (department.length > 100) {
    setFieldError("department", "Department cannot exceed 100 characters");
    isValid = false;
  }

  // Available Positions: required, whole number >= 1
  const positionsRaw = elements.inputPositions.value.trim();
  const positionsNum = Number(positionsRaw);
  if (!positionsRaw) {
    setFieldError("available_positions", "Number of positions is required");
    isValid = false;
  } else if (
    isNaN(positionsNum) ||
    !Number.isInteger(positionsNum) ||
    positionsNum < 1
  ) {
    setFieldError(
      "available_positions",
      "Positions must be a whole number (1 or more)"
    );
    isValid = false;
  }

  // Deadline: required, valid date
  const deadline = elements.inputDeadline.value.trim();
  if (!deadline) {
    setFieldError("deadline", "Application deadline is required");
    isValid = false;
  } else if (isNaN(Date.parse(deadline))) {
    setFieldError("deadline", "Please enter a valid date");
    isValid = false;
  }

  // Status: must be exactly "Open" or "Closed"
  const status = elements.selectStatus.value;
  if (status !== "Open" && status !== "Closed") {
    setFieldError("status", "Status must be 'Open' or 'Closed'");
    isValid = false;
  }

  // Required Skills: required, trimmed
  const skills = elements.inputSkills.value.trim();
  if (!skills) {
    setFieldError("required_skills", "Required skills are required");
    isValid = false;
  }

  // Description: required, trimmed
  const description = elements.inputDescription.value.trim();
  if (!description) {
    setFieldError("description", "Description is required");
    isValid = false;
  }

  return isValid;
}

/**
 * Set an inline error on a form group.
 * @param {string} fieldName
 * @param {string} message
 */
function setFieldError(fieldName, message) {
  const group = document.getElementById(`group-${fieldName}`);
  const errorSpan = document.getElementById(`error-${fieldName}`);
  if (group) group.classList.add("has-error");
  if (errorSpan) errorSpan.textContent = message;
}

/**
 * Clear all inline error states and messages.
 */
function clearFormValidation() {
  document.querySelectorAll(".form-group.has-error").forEach((el) => {
    el.classList.remove("has-error");
  });
  document.querySelectorAll(".field-error").forEach((el) => {
    el.textContent = "";
  });
}

/**
 * Handle form submission for Create (POST) or Edit (PUT).
 * @param {Event} e
 */
async function handleFormSubmit(e) {
  e.preventDefault();

  if (!validateForm()) {
    showToast("Please correct the errors in the form", "error");
    return;
  }

  // Prepare exact payload without 'id'
  const payload = {
    title: elements.inputTitle.value.trim(),
    description: elements.inputDescription.value.trim(),
    research_area: elements.inputResearchArea.value.trim(),
    faculty_name: elements.inputFacultyName.value.trim(),
    department: elements.inputDepartment.value.trim(),
    required_skills: elements.inputSkills.value.trim(),
    available_positions: Number(elements.inputPositions.value.trim()),
    deadline: elements.inputDeadline.value.trim(),
    status: elements.selectStatus.value,
  };

  // Disable button and indicate loading
  setSubmitLoading(true);

  try {
    if (currentEditingId) {
      // Edit existing opportunity
      await apiRequest(`/${currentEditingId}`, {
        method: "PUT",
        body: payload,
      });
      showToast("Opportunity updated successfully", "success");
    } else {
      // Create new opportunity
      await apiRequest("", {
        method: "POST",
        body: payload,
      });
      showToast("Opportunity created successfully", "success");
    }

    closeModal(elements.formModal);
    await loadOpportunities();
  } catch (error) {
    showToast(error.message, "error");
    if (error.status === 404 && currentEditingId) {
      closeModal(elements.formModal);
      await loadOpportunities();
    }
  } finally {
    setSubmitLoading(false);
  }
}

function setSubmitLoading(isLoading) {
  elements.submitBtn.disabled = isLoading;
  const spinner = elements.submitBtn.querySelector(".btn-spinner");
  const text = elements.submitBtn.querySelector(".btn-text");
  if (spinner) spinner.hidden = !isLoading;
  if (text) {
    if (isLoading) {
      text.dataset.original = text.textContent;
      text.textContent = "Saving...";
    } else {
      text.textContent = text.dataset.original || "Save Opportunity";
    }
  }
}

// =============================================================================
// Opportunity Status Updates (Close Button)
// =============================================================================

/**
 * Close an open opportunity using PUT with {"status": "Closed"}
 * @param {number|string} id
 */
async function closeOpportunity(id) {
  try {
    await apiRequest(`/${id}`, {
      method: "PUT",
      body: { status: "Closed" },
    });
    showToast("Opportunity marked as Closed", "success");
    await loadOpportunities();
  } catch (error) {
    showToast(error.message, "error");
    if (error.status === 404) {
      await loadOpportunities();
    }
  }
}

// =============================================================================
// Opportunity Deletion (Confirmation Modal & DELETE)
// =============================================================================

/**
 * Open custom delete confirmation modal (no window.confirm).
 * @param {number|string} id
 * @param {string} title
 */
function promptDelete(id, title) {
  currentDeletingId = id;
  elements.deleteTargetTitle.textContent = title || `#${id}`;
  openModal(elements.deleteModal);
}

/**
 * Perform DELETE request on confirmed delete action.
 */
async function handleDeleteConfirm() {
  if (!currentDeletingId) return;

  elements.confirmDeleteBtn.disabled = true;
  const spinner = elements.confirmDeleteBtn.querySelector(".btn-spinner");
  const text = elements.confirmDeleteBtn.querySelector(".btn-text");
  if (spinner) spinner.hidden = false;
  if (text) text.textContent = "Deleting...";

  try {
    await apiRequest(`/${currentDeletingId}`, {
      method: "DELETE",
    });
    showToast("Opportunity deleted successfully", "success");
    closeModal(elements.deleteModal);
    await loadOpportunities();
  } catch (error) {
    showToast(error.message, "error");
    if (error.status === 404) {
      closeModal(elements.deleteModal);
      await loadOpportunities();
    }
  } finally {
    elements.confirmDeleteBtn.disabled = false;
    if (spinner) spinner.hidden = true;
    if (text) text.textContent = "Delete Permanently";
    currentDeletingId = null;
  }
}

// =============================================================================
// Event Listeners & Initialization
// =============================================================================

function setupEventListeners() {
  // Navigation & Controls
  elements.openCreateBtn.addEventListener("click", openCreateModal);
  elements.emptyActionBtn.addEventListener("click", openCreateModal);
  elements.refreshBtn.addEventListener("click", loadOpportunities);

  // Search & Filter
  elements.searchInput.addEventListener("input", renderCards);
  elements.clearSearchBtn.addEventListener("click", () => {
    elements.searchInput.value = "";
    elements.searchInput.focus();
    renderCards();
  });
  elements.statusFilter.addEventListener("change", renderCards);

  // Form Submission
  elements.opportunityForm.addEventListener("submit", handleFormSubmit);

  // Character Count Indicator
  elements.inputTitle.addEventListener("input", () => {
    elements.countTitle.textContent = elements.inputTitle.value.length;
  });

  // Delete Confirmation
  elements.confirmDeleteBtn.addEventListener("click", handleDeleteConfirm);

  // Generic Modal Close Triggers (X buttons, Cancel buttons)
  document.querySelectorAll("[data-close-modal]").forEach((button) => {
    button.addEventListener("click", () => {
      const modalId = button.getAttribute("data-close-modal");
      const targetModal = document.getElementById(modalId);
      if (targetModal) closeModal(targetModal);
    });
  });

  // Close modals on clicking backdrop outside card
  document.querySelectorAll(".modal-backdrop").forEach((backdrop) => {
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) {
        closeModal(backdrop);
      }
    });
  });

  // Close modals on Escape key press
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && currentModal) {
      closeModal(currentModal);
    }
  });
}

// Initialize on DOM Ready
document.addEventListener("DOMContentLoaded", () => {
  setupEventListeners();
  loadOpportunities();
});
