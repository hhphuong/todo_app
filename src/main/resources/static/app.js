// ============================================
// Todo Pro - Main Application JavaScript
// ============================================

const API_BASE_URL = '/api/todos';
const TAG_API_URL = '/api/tags';

// Check authentication
if (!Auth.requireAuth()) {
    // Will redirect to login
}

// ============================================
// State
// ============================================
let todos = [];
let tags = [];
let currentDate = new Date();
let currentView = 'month';
let selectedDate = null;
let currentTagFilter = 'all';
let draggedItem = null;

// ============================================
// DOM Elements
// ============================================
const usernameDisplay = document.getElementById('usernameDisplay');
const logoutBtn = document.getElementById('logoutBtn');
const themeToggle = document.getElementById('themeToggle');
const statsBtn = document.getElementById('statsBtn');
const streakCount = document.getElementById('streakCount');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const todayBtn = document.getElementById('todayBtn');
const currentPeriod = document.getElementById('currentPeriod');
const viewTabs = document.querySelectorAll('.view-tab');
const addTodoBtn = document.getElementById('addTodoBtn');

// Views
const monthView = document.getElementById('monthView');
const dayView = document.getElementById('dayView');
const weekView = document.getElementById('weekView');
const listView = document.getElementById('listView');
const calendarGrid = document.getElementById('calendarGrid');
const selectedDaySection = document.getElementById('selectedDaySection');

// Modals
const todoModal = document.getElementById('todoModal');
const todoForm = document.getElementById('todoForm');
const modalTitle = document.getElementById('modalTitle');
const todoId = document.getElementById('todoId');
const todoTitle = document.getElementById('todoTitle');
const todoDescription = document.getElementById('todoDescription');
const todoDueDate = document.getElementById('todoDueDate');
const todoDueTime = document.getElementById('todoDueTime');
const todoPriority = document.getElementById('todoPriority');
const todoCompleted = document.getElementById('todoCompleted');
const completedGroup = document.getElementById('completedGroup');
const tagSelector = document.getElementById('tagSelector');
const closeModal = document.getElementById('closeModal');
const cancelTodo = document.getElementById('cancelTodo');

const tagModal = document.getElementById('tagModal');
const statsModal = document.getElementById('statsModal');
const tagsList = document.getElementById('tagsList');

// Quick Add
const quickAddWrapper = document.getElementById('quickAddWrapper');
const quickAddInput = document.getElementById('quickAddInput');

const loadingState = document.getElementById('loadingState');
const emptyState = document.getElementById('emptyState');
const toast = document.getElementById('toast');
const shortcutsHelp = document.getElementById('shortcutsHelp');

// ============================================
// Initialize
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    // Load theme
    loadTheme();

    // Display username
    if (usernameDisplay) {
        usernameDisplay.textContent = Auth.getUsername() || 'User';
    }

    // Setup event listeners
    setupEventListeners();
    setupKeyboardShortcuts();
    setupDragAndDrop();

    // Request notification permission
    requestNotificationPermission();

    // Load data
    await loadTags();
    await updateView();

    // Check for upcoming deadlines
    checkDeadlines();
});

// ============================================
// Event Listeners
// ============================================
function setupEventListeners() {
    // Navigation
    prevBtn.addEventListener('click', () => navigate(-1));
    nextBtn.addEventListener('click', () => navigate(1));
    todayBtn.addEventListener('click', goToToday);

    // View tabs
    viewTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            viewTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentView = tab.dataset.view;
            updateView();
        });
    });

    // Add todo button
    addTodoBtn.addEventListener('click', () => openTodoModal());

    // Theme toggle
    themeToggle.addEventListener('click', toggleTheme);

    // Stats button
    statsBtn.addEventListener('click', openStatsModal);

    // Todo Modal
    closeModal.addEventListener('click', closeTodoModal);
    cancelTodo.addEventListener('click', closeTodoModal);
    todoModal.querySelector('.modal-overlay').addEventListener('click', closeTodoModal);
    todoForm.addEventListener('submit', handleSaveTodo);

    // Tag Modal
    document.getElementById('manageTagsBtn')?.addEventListener('click', openTagModal);
    document.getElementById('closeTagModal')?.addEventListener('click', closeTagModal);
    tagModal?.querySelector('.modal-overlay')?.addEventListener('click', closeTagModal);
    document.getElementById('addTagBtn')?.addEventListener('click', handleAddTag);

    // Stats Modal
    document.getElementById('closeStatsModal')?.addEventListener('click', closeStatsModal);
    statsModal?.querySelector('.modal-overlay')?.addEventListener('click', closeStatsModal);

    // Close selected day
    document.getElementById('closeSelectedDay')?.addEventListener('click', () => {
        selectedDaySection.classList.add('hidden');
        selectedDate = null;
    });

    // List view filters
    document.querySelectorAll('#listView .filter-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('#listView .filter-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            renderListView(tab.dataset.filter);
        });
    });

    // Quick add
    quickAddInput.addEventListener('keydown', handleQuickAddKeydown);
    quickAddInput.addEventListener('blur', hideQuickAdd);

    // Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => Auth.logout());
    }
}

// ============================================
// Keyboard Shortcuts
// ============================================
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ignore if typing in input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
            if (e.key === 'Escape') {
                closeTodoModal();
                closeTagModal();
                closeStatsModal();
                hideQuickAdd();
            }
            return;
        }

        switch (e.key.toLowerCase()) {
            case 'n':
                e.preventDefault();
                openTodoModal();
                break;
            case 'd':
                e.preventDefault();
                toggleTheme();
                break;
            case 'escape':
                closeTodoModal();
                closeTagModal();
                closeStatsModal();
                selectedDaySection.classList.add('hidden');
                shortcutsHelp.classList.add('hidden');
                break;
            case '?':
                e.preventDefault();
                shortcutsHelp.classList.toggle('hidden');
                break;
        }
    });
}

// ============================================
// Drag and Drop
// ============================================
function setupDragAndDrop() {
    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('dragend', handleDragEnd);
    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('drop', handleDrop);
}

function handleDragStart(e) {
    if (!e.target.classList.contains('todo-item')) return;
    draggedItem = e.target;
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', e.target.dataset.id);
}

function handleDragEnd(e) {
    if (draggedItem) {
        draggedItem.classList.remove('dragging');
        draggedItem = null;
    }
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
}

function handleDragOver(e) {
    e.preventDefault();

    // Calendar day drop zone
    const calendarDay = e.target.closest('.calendar-day:not(.empty)');
    if (calendarDay) {
        document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
        calendarDay.classList.add('drag-over');
        return;
    }

    // Todo list reorder
    const todoItem = e.target.closest('.todo-item');
    if (todoItem && draggedItem && todoItem !== draggedItem) {
        const container = todoItem.parentNode;
        const items = [...container.querySelectorAll('.todo-item:not(.dragging)')];
        const draggedIndex = items.indexOf(draggedItem);
        const targetIndex = items.indexOf(todoItem);

        if (draggedIndex < targetIndex) {
            todoItem.parentNode.insertBefore(draggedItem, todoItem.nextSibling);
        } else {
            todoItem.parentNode.insertBefore(draggedItem, todoItem);
        }
    }
}

async function handleDrop(e) {
    e.preventDefault();
    const todoId = e.dataTransfer.getData('text/plain');

    // Drop on calendar day
    const calendarDay = e.target.closest('.calendar-day:not(.empty)');
    if (calendarDay && todoId) {
        const newDate = calendarDay.dataset.date;
        await updateTodoDueDate(parseInt(todoId), newDate);
        calendarDay.classList.remove('drag-over');
        updateView();
        return;
    }

    // Reorder in list
    const container = e.target.closest('.sortable-list');
    if (container) {
        const items = [...container.querySelectorAll('.todo-item')];
        const todoIds = items.map(item => parseInt(item.dataset.id));
        await reorderTodos(todoIds);
    }
}

// ============================================
// Quick Add (Double-click)
// ============================================
calendarGrid?.addEventListener('dblclick', (e) => {
    const calendarDay = e.target.closest('.calendar-day:not(.empty)');
    if (calendarDay) {
        showQuickAdd(calendarDay.dataset.date, e);
    }
});

function showQuickAdd(date, event) {
    selectedDate = date;
    quickAddWrapper.style.left = event.clientX + 'px';
    quickAddWrapper.style.top = event.clientY + 'px';
    quickAddWrapper.classList.remove('hidden');
    quickAddInput.value = '';
    quickAddInput.focus();
}

function hideQuickAdd() {
    quickAddWrapper.classList.add('hidden');
    quickAddInput.value = '';
}

async function handleQuickAddKeydown(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        const title = quickAddInput.value.trim();
        if (title) {
            await createTodo({ title, dueDate: selectedDate, priority: 'MEDIUM' });
            hideQuickAdd();
            updateView();
        }
    } else if (e.key === 'Escape') {
        hideQuickAdd();
    }
}

// ============================================
// Theme Toggle
// ============================================
function loadTheme() {
    const theme = localStorage.getItem('theme') || 'dark';
    document.body.className = theme + '-theme';
    updateThemeIcon(theme);
}

function toggleTheme() {
    const isDark = document.body.classList.contains('dark-theme');
    const newTheme = isDark ? 'light' : 'dark';
    document.body.className = newTheme + '-theme';
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
    showToast(newTheme === 'dark' ? 'Chế độ tối' : 'Chế độ sáng', 'success');
}

function updateThemeIcon(theme) {
    themeToggle.textContent = theme === 'dark' ? '🌙' : '☀️';
}

// ============================================
// Navigation
// ============================================
function navigate(direction) {
    if (currentView === 'day') {
        currentDate.setDate(currentDate.getDate() + direction);
    } else if (currentView === 'week') {
        currentDate.setDate(currentDate.getDate() + (direction * 7));
    } else {
        currentDate.setMonth(currentDate.getMonth() + direction);
    }
    updateView();
}

function goToToday() {
    currentDate = new Date();
    updateView();
}

// ============================================
// Update View
// ============================================
async function updateView() {
    updatePeriodTitle();
    showLoading();

    try {
        if (currentView === 'month') {
            await renderMonthView();
        } else if (currentView === 'week') {
            await renderWeekView();
        } else if (currentView === 'day') {
            await renderDayView();
        } else if (currentView === 'list') {
            await renderListView('all');
        }
    } catch (error) {
        console.error('Error updating view:', error);
        showToast('Lỗi tải dữ liệu', 'error');
    } finally {
        hideLoading();
    }

    // Show/hide correct view
    monthView.classList.toggle('hidden', currentView !== 'month');
    weekView.classList.toggle('hidden', currentView !== 'week');
    dayView.classList.toggle('hidden', currentView !== 'day');
    listView.classList.toggle('hidden', currentView !== 'list');
    selectedDaySection.classList.add('hidden');
}

function updatePeriodTitle() {
    const options = { year: 'numeric' };

    if (currentView === 'day') {
        options.day = 'numeric';
        options.month = 'long';
    } else if (currentView === 'week') {
        const startOfWeek = getStartOfWeek(currentDate);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 6);
        currentPeriod.textContent = `${formatDate(startOfWeek)} - ${formatDate(endOfWeek)}`;
        return;
    } else {
        options.month = 'long';
    }

    currentPeriod.textContent = currentDate.toLocaleDateString('vi-VN', options);
}

// ============================================
// Month View
// ============================================
async function renderMonthView() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const counts = await fetchCalendarCounts(year, month + 1);

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let html = '';

    for (let i = 0; i < startDay; i++) {
        html += '<div class="calendar-day empty"></div>';
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dateStr = formatDateISO(date);
        const count = counts[dateStr] || 0;
        const isToday = date.getTime() === today.getTime();
        const isPast = date < today;

        html += `
            <div class="calendar-day ${isToday ? 'today' : ''} ${isPast ? 'past' : ''}" 
                 data-date="${dateStr}" draggable="false">
                <span class="day-number">${day}</span>
                ${count > 0 ? `<span class="todo-count">${count}</span>` : ''}
            </div>
        `;
    }

    calendarGrid.innerHTML = html;

    calendarGrid.querySelectorAll('.calendar-day:not(.empty)').forEach(dayEl => {
        dayEl.addEventListener('click', () => showDayTodos(dayEl.dataset.date));
    });
}

// ============================================
// Week View
// ============================================
async function renderWeekView() {
    const startOfWeek = getStartOfWeek(currentDate);
    const todos = await fetchWeekTodos(startOfWeek);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let html = '<div class="week-header">';
    const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

    for (let i = 0; i < 7; i++) {
        const date = new Date(startOfWeek);
        date.setDate(date.getDate() + i);
        const isToday = date.getTime() === today.getTime();
        html += `<div class="week-day-header ${isToday ? 'today' : ''}">${days[i]}<br>${date.getDate()}</div>`;
    }
    html += '</div><div class="week-body">';

    for (let i = 0; i < 7; i++) {
        const date = new Date(startOfWeek);
        date.setDate(date.getDate() + i);
        const dateStr = formatDateISO(date);
        const dayTodos = filterTodosByTag(todos.filter(t => t.dueDate === dateStr));
        const isToday = date.getTime() === today.getTime();

        html += `<div class="week-day-column ${isToday ? 'today' : ''} sortable-list" data-date="${dateStr}">`;
        dayTodos.forEach(todo => {
            html += createTodoHTML(todo, true);
        });
        html += '</div>';
    }
    html += '</div>';

    document.getElementById('weekGrid').innerHTML = html;
    attachTodoListeners(document.getElementById('weekGrid'));
}

// ============================================
// Day View
// ============================================
async function renderDayView() {
    const dateStr = formatDateISO(currentDate);
    let todos = await fetchDayTodos(dateStr);
    todos = filterTodosByTag(todos);

    const container = document.getElementById('dayTodoList');

    if (todos.length === 0) {
        container.innerHTML = '<div class="empty-day">Không có công việc nào. Nhấn đúp để thêm nhanh!</div>';
    } else {
        container.innerHTML = todos.map(todo => createTodoHTML(todo)).join('');
        attachTodoListeners(container);
    }
}

// ============================================
// List View
// ============================================
async function renderListView(filter = 'all') {
    let todos;

    try {
        if (filter === 'overdue') {
            todos = await fetchOverdueTodos();
        } else if (filter === 'today') {
            todos = await fetchDayTodos(formatDateISO(new Date()));
        } else if (filter === 'upcoming') {
            const start = new Date();
            start.setDate(start.getDate() + 1);
            todos = await fetchWeekTodos(start);
        } else if (filter === 'no-date') {
            todos = await fetchNoDateTodos();
        } else {
            todos = await fetchAllTodos();
        }

        todos = filterTodosByTag(todos);

        const container = document.getElementById('listTodoList');

        if (todos.length === 0) {
            container.innerHTML = '<div class="empty-day">Không có công việc nào</div>';
        } else {
            container.innerHTML = todos.map(todo => createTodoHTML(todo)).join('');
            attachTodoListeners(container);
        }
    } catch (error) {
        console.error('Error rendering list view:', error);
    }
}

// ============================================
// Show Day Todos
// ============================================
async function showDayTodos(dateStr) {
    selectedDate = dateStr;
    let todos = await fetchDayTodos(dateStr);
    todos = filterTodosByTag(todos);

    const date = parseLocalDate(dateStr);
    document.getElementById('selectedDayTitle').textContent = date.toLocaleDateString('vi-VN', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    const container = document.getElementById('selectedDayTodos');
    if (todos.length === 0) {
        container.innerHTML = '<div class="empty-day">Không có công việc. Nhấn đúp để thêm!</div>';
    } else {
        container.innerHTML = todos.map(todo => createTodoHTML(todo)).join('');
        attachTodoListeners(container);
    }

    selectedDaySection.classList.remove('hidden');
}

// ============================================
// Filter by Tag
// ============================================
function filterTodosByTag(todos) {
    if (currentTagFilter === 'all') return todos;
    return todos.filter(todo =>
        todo.tags && todo.tags.some(tag => tag.id === parseInt(currentTagFilter))
    );
}

// ============================================
// Create Todo HTML
// ============================================
function createTodoHTML(todo, compact = false) {
    const priorityClass = `priority-${todo.priority?.toLowerCase() || 'medium'}`;
    const overdueClass = isOverdue(todo) ? 'overdue' : '';
    const completedClass = todo.completed ? 'completed' : '';

    const dueInfo = todo.dueDate
        ? `${formatDate(parseLocalDate(todo.dueDate))}${todo.dueTime ? ' ' + todo.dueTime.substring(0, 5) : ''}`
        : '';

    const tagsHtml = (todo.tags || []).map(tag =>
        `<span class="todo-tag" style="background:${tag.color}">${tag.name}</span>`
    ).join('');

    const subtaskProgress = todo.subtasks?.length > 0 ? todo.getSubtaskProgress || 0 : -1;
    const progressHtml = subtaskProgress >= 0
        ? `<div class="subtask-progress"><div class="progress-bar" style="width:${subtaskProgress}%"></div></div>`
        : '';

    if (compact) {
        return `
            <div class="todo-item compact ${priorityClass} ${overdueClass} ${completedClass}" 
                 data-id="${todo.id}" draggable="true">
                <label class="todo-checkbox">
                    <input type="checkbox" ${todo.completed ? 'checked' : ''}>
                    <span class="checkmark"></span>
                </label>
                <span class="todo-title">${escapeHtml(todo.title)}</span>
            </div>
        `;
    }

    return `
        <div class="todo-item ${priorityClass} ${overdueClass} ${completedClass}" 
             data-id="${todo.id}" draggable="true">
            <label class="todo-checkbox">
                <input type="checkbox" ${todo.completed ? 'checked' : ''}>
                <span class="checkmark"></span>
            </label>
            <div class="todo-content">
                <h3 class="todo-title">${escapeHtml(todo.title)}</h3>
                ${todo.description ? `<p class="todo-description">${escapeHtml(todo.description)}</p>` : ''}
                ${progressHtml}
                <div class="todo-meta">
                    ${dueInfo ? `<span class="due-date">${dueInfo}</span>` : ''}
                    <span class="priority-badge">${getPriorityLabel(todo.priority)}</span>
                    ${tagsHtml}
                </div>
                ${todo.subtasks?.length > 0 ? `<div class="subtask-info">📋 ${todo.subtasks.filter(s => s.completed).length}/${todo.subtasks.length}</div>` : ''}
            </div>
            <div class="todo-actions">
                ${todo.parentId ? '' : '<button class="action-btn subtask-btn" title="Thêm bước con">➕</button>'}
                <button class="action-btn edit-btn" title="Chỉnh sửa">✏️</button>
                <button class="action-btn delete-btn" title="Xóa">🗑️</button>
            </div>
        </div>
    `;
}

function attachTodoListeners(container) {
    container.querySelectorAll('.todo-item').forEach(item => {
        const id = parseInt(item.dataset.id);

        const checkbox = item.querySelector('input[type="checkbox"]');
        checkbox?.addEventListener('change', () => toggleTodo(id));

        const editBtn = item.querySelector('.edit-btn');
        editBtn?.addEventListener('click', () => openTodoModal(id));

        const deleteBtn = item.querySelector('.delete-btn');
        deleteBtn?.addEventListener('click', () => {
            if (confirm('Bạn có chắc muốn xóa công việc này?')) {
                deleteTodo(id);
            }
        });

        const subtaskBtn = item.querySelector('.subtask-btn');
        subtaskBtn?.addEventListener('click', () => openTodoModal(null, id));
    });
}

// ============================================
// Tags
// ============================================
async function loadTags() {
    try {
        tags = await fetchTags();
        renderTagsFilter();
        renderTagSelector();
    } catch (error) {
        console.error('Error loading tags:', error);
    }
}

function renderTagsFilter() {
    let html = '<button class="tag-filter active" data-tag-id="all">Tất cả</button>';
    tags.forEach(tag => {
        html += `<button class="tag-filter" data-tag-id="${tag.id}" style="--tag-color:${tag.color}">${tag.name}</button>`;
    });
    tagsList.innerHTML = html;

    tagsList.querySelectorAll('.tag-filter').forEach(btn => {
        btn.addEventListener('click', () => {
            tagsList.querySelectorAll('.tag-filter').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentTagFilter = btn.dataset.tagId;
            updateView();
        });
    });
}

function renderTagSelector() {
    tagSelector.innerHTML = tags.map(tag => `
        <label class="tag-checkbox" style="--tag-color:${tag.color}">
            <input type="checkbox" value="${tag.id}">
            <span>${tag.name}</span>
        </label>
    `).join('');
}

function openTagModal() {
    renderTagManagerList();
    tagModal.classList.remove('hidden');
}

function closeTagModal() {
    tagModal.classList.add('hidden');
}

function renderTagManagerList() {
    const container = document.getElementById('tagManagerList');
    container.innerHTML = tags.map(tag => `
        <div class="tag-manager-item" data-id="${tag.id}">
            <span class="tag-color" style="background:${tag.color}"></span>
            <span class="tag-name">${tag.name}</span>
            <button class="btn-icon-sm delete-tag-btn">🗑️</button>
        </div>
    `).join('');

    container.querySelectorAll('.delete-tag-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = parseInt(e.target.closest('.tag-manager-item').dataset.id);
            await deleteTag(id);
            await loadTags();
            renderTagManagerList();
        });
    });
}

async function handleAddTag() {
    const name = document.getElementById('newTagName').value.trim();
    const color = document.getElementById('newTagColor').value;

    if (!name) return;

    await createTag({ name, color });
    document.getElementById('newTagName').value = '';
    await loadTags();
    renderTagManagerList();
}

// ============================================
// Todo Modal
// ============================================
function openTodoModal(id = null, parentId = null) {
    if (id) {
        // Edit mode
        const todo = todos.find(t => t.id === id);
        if (todo) {
            modalTitle.textContent = 'Chỉnh sửa công việc';
            todoId.value = todo.id;
            document.getElementById('todoParentId').value = '';
            todoTitle.value = todo.title;
            todoDescription.value = todo.description || '';
            todoDueDate.value = todo.dueDate || '';
            todoDueTime.value = todo.dueTime || '';
            todoPriority.value = todo.priority || 'MEDIUM';
            todoCompleted.checked = todo.completed;
            completedGroup.style.display = 'block';

            // Set selected tags
            tagSelector.querySelectorAll('input').forEach(cb => {
                cb.checked = todo.tags?.some(t => t.id === parseInt(cb.value)) || false;
            });
        }
    } else if (parentId) {
        // Add subtask
        modalTitle.textContent = 'Thêm bước con';
        todoForm.reset();
        todoId.value = '';
        document.getElementById('todoParentId').value = parentId;
        todoDueDate.value = selectedDate || formatDateISO(new Date());
        todoPriority.value = 'MEDIUM';
        completedGroup.style.display = 'none';
    } else {
        // Add mode
        modalTitle.textContent = 'Thêm công việc';
        todoForm.reset();
        todoId.value = '';
        document.getElementById('todoParentId').value = '';
        todoDueDate.value = selectedDate || formatDateISO(new Date());
        todoPriority.value = 'MEDIUM';
        completedGroup.style.display = 'none';
    }

    todoModal.classList.remove('hidden');
    todoTitle.focus();
}

function closeTodoModal() {
    todoModal.classList.add('hidden');
    todoForm.reset();
}

async function handleSaveTodo(e) {
    e.preventDefault();

    const selectedTagIds = [...tagSelector.querySelectorAll('input:checked')].map(cb => parseInt(cb.value));

    const todoData = {
        title: todoTitle.value.trim(),
        description: todoDescription.value.trim(),
        dueDate: todoDueDate.value || null,
        dueTime: todoDueTime.value || null,
        priority: todoPriority.value,
        completed: todoCompleted.checked,
        tagIds: selectedTagIds,
        parentId: document.getElementById('todoParentId').value ? parseInt(document.getElementById('todoParentId').value) : null
    };

    const id = todoId.value;

    try {
        if (id) {
            await updateTodo(parseInt(id), todoData);
        } else {
            await createTodo(todoData);
        }
        closeTodoModal();
        updateView();
    } catch (error) {
        console.error('Error saving todo:', error);
    }
}

// ============================================
// Statistics Modal
// ============================================
async function openStatsModal() {
    try {
        const stats = await fetchStatistics(30);

        document.getElementById('statCompleted').textContent = stats.completedCount || 0;

        // Render simple chart
        const chartContainer = document.getElementById('statsChart');
        const dailyStats = stats.dailyStats || {};

        let chartHtml = '<div class="chart-bars">';
        const dates = Object.keys(dailyStats).sort().slice(-14); // Last 14 days
        const maxCount = Math.max(...Object.values(dailyStats), 1);

        dates.forEach(date => {
            const count = dailyStats[date] || 0;
            const height = (count / maxCount) * 100;
            const day = new Date(date).getDate();
            chartHtml += `
                <div class="chart-bar-wrapper">
                    <div class="chart-bar" style="height:${height}%" title="${count} công việc"></div>
                    <span class="chart-label">${day}</span>
                </div>
            `;
        });

        chartHtml += '</div>';
        chartContainer.innerHTML = chartHtml;

        statsModal.classList.remove('hidden');
    } catch (error) {
        console.error('Error loading stats:', error);
        showToast('Lỗi tải thống kê', 'error');
    }
}

function closeStatsModal() {
    statsModal.classList.add('hidden');
}

// ============================================
// Browser Notifications
// ============================================
function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

function sendNotification(title, body) {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body, icon: '📅' });
    }
}

async function checkDeadlines() {
    try {
        const today = formatDateISO(new Date());
        const todayTodos = await fetchDayTodos(today);
        const upcoming = todayTodos.filter(t => !t.completed && t.dueTime);

        upcoming.forEach(todo => {
            const dueTime = todo.dueTime.substring(0, 5);
            const now = new Date();
            const [hours, minutes] = dueTime.split(':');
            const dueDate = new Date();
            dueDate.setHours(parseInt(hours), parseInt(minutes), 0);

            const diff = dueDate - now;
            // Notify 15 minutes before
            if (diff > 0 && diff <= 15 * 60 * 1000) {
                sendNotification('⏰ Sắp đến hạn!', `${todo.title} - ${dueTime}`);
            }
        });

        // Check every 5 minutes
        setTimeout(checkDeadlines, 5 * 60 * 1000);
    } catch (error) {
        console.error('Error checking deadlines:', error);
    }
}

// ============================================
// API Functions
// ============================================
function getHeaders() {
    return {
        'Content-Type': 'application/json',
        ...Auth.getAuthHeaders()
    };
}

async function fetchAllTodos() {
    const response = await fetch(API_BASE_URL, { headers: getHeaders() });
    if (!response.ok) throw new Error('Failed to fetch');
    todos = await response.json();
    return todos;
}

async function fetchDayTodos(dateStr) {
    const response = await fetch(`${API_BASE_URL}/date/${dateStr}`, { headers: getHeaders() });
    if (!response.ok) throw new Error('Failed to fetch');
    return await response.json();
}

async function fetchWeekTodos(startDate) {
    const dateStr = formatDateISO(startDate);
    const response = await fetch(`${API_BASE_URL}/week?start=${dateStr}`, { headers: getHeaders() });
    if (!response.ok) throw new Error('Failed to fetch');
    return await response.json();
}

async function fetchCalendarCounts(year, month) {
    const response = await fetch(`${API_BASE_URL}/calendar-counts?year=${year}&month=${month}`, { headers: getHeaders() });
    if (!response.ok) throw new Error('Failed to fetch');
    return await response.json();
}

async function fetchOverdueTodos() {
    const response = await fetch(`${API_BASE_URL}/overdue`, { headers: getHeaders() });
    if (!response.ok) throw new Error('Failed to fetch');
    return await response.json();
}

async function fetchNoDateTodos() {
    const response = await fetch(`${API_BASE_URL}/no-date`, { headers: getHeaders() });
    if (!response.ok) throw new Error('Failed to fetch');
    return await response.json();
}

async function fetchStatistics(days) {
    const response = await fetch(`${API_BASE_URL}/statistics?days=${days}`, { headers: getHeaders() });
    if (!response.ok) throw new Error('Failed to fetch');
    return await response.json();
}

async function createTodo(todoData) {
    const response = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(todoData)
    });
    if (!response.ok) throw new Error('Failed to create');
    showToast('Đã thêm công việc!', 'success');
    return await response.json();
}

async function updateTodo(id, todoData) {
    const response = await fetch(`${API_BASE_URL}/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(todoData)
    });
    if (!response.ok) throw new Error('Failed to update');
    showToast('Đã cập nhật!', 'success');
    return await response.json();
}

async function toggleTodo(id) {
    const response = await fetch(`${API_BASE_URL}/${id}/toggle`, {
        method: 'PATCH',
        headers: getHeaders()
    });
    if (!response.ok) throw new Error('Failed to toggle');
    showToast('Đã cập nhật!', 'success');
    updateView();
}

async function deleteTodo(id) {
    const response = await fetch(`${API_BASE_URL}/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
    });
    if (!response.ok) throw new Error('Failed to delete');
    showToast('Đã xóa!', 'success');
    updateView();
}

async function reorderTodos(todoIds) {
    const response = await fetch(`${API_BASE_URL}/reorder`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(todoIds)
    });
    if (!response.ok) throw new Error('Failed to reorder');
}

async function updateTodoDueDate(id, newDate) {
    const response = await fetch(`${API_BASE_URL}/${id}/due-date?dueDate=${newDate}`, {
        method: 'PATCH',
        headers: getHeaders()
    });
    if (!response.ok) throw new Error('Failed to update');
    showToast('Đã di chuyển!', 'success');
}

// Tags API
async function fetchTags() {
    const response = await fetch(TAG_API_URL, { headers: getHeaders() });
    if (!response.ok) throw new Error('Failed to fetch');
    return await response.json();
}

async function createTag(tagData) {
    const response = await fetch(TAG_API_URL, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(tagData)
    });
    if (!response.ok) throw new Error('Failed to create');
    showToast('Đã tạo nhãn!', 'success');
    return await response.json();
}

async function deleteTag(id) {
    const response = await fetch(`${TAG_API_URL}/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
    });
    if (!response.ok) throw new Error('Failed to delete');
    showToast('Đã xóa nhãn!', 'success');
}

// ============================================
// Helper Functions
// ============================================
function formatDateISO(date) {
    // Use local timezone, not UTC
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatDate(date) {
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

function parseLocalDate(dateStr) {
    // Parse YYYY-MM-DD as local date (not UTC)
    if (!dateStr) return null;
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
}

function getStartOfWeek(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    d.setDate(d.getDate() - day);
    return d;
}

function isOverdue(todo) {
    if (!todo.dueDate || todo.completed) return false;
    const dueDate = parseLocalDate(todo.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dueDate < today;
}

function getPriorityLabel(priority) {
    switch (priority) {
        case 'HIGH': return '🔴';
        case 'LOW': return '🟢';
        default: return '🟡';
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showLoading() {
    loadingState.classList.remove('hidden');
}

function hideLoading() {
    loadingState.classList.add('hidden');
}

function showToast(message, type = 'success') {
    toast.querySelector('.toast-message').textContent = message;
    toast.className = `toast ${type} show`;
    setTimeout(() => toast.classList.remove('show'), 3000);
}
