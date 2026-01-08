// API Configuration
const API_BASE_URL = '/api/todos';

// Check authentication
if (!Auth.requireAuth()) {
    // Will redirect to login
}

// State
let todos = [];
let currentDate = new Date();
let currentView = 'month'; // day, week, month, list
let selectedDate = null;

// DOM Elements
const usernameDisplay = document.getElementById('usernameDisplay');
const logoutBtn = document.getElementById('logoutBtn');
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

// Modal Elements
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
const closeModal = document.getElementById('closeModal');
const cancelTodo = document.getElementById('cancelTodo');

const loadingState = document.getElementById('loadingState');
const emptyState = document.getElementById('emptyState');
const toast = document.getElementById('toast');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (usernameDisplay) {
        usernameDisplay.textContent = Auth.getUsername() || 'User';
    }

    setupEventListeners();
    updateView();
});

// Event Listeners
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
    addTodoBtn.addEventListener('click', () => openModal());

    // Modal
    closeModal.addEventListener('click', closeModalHandler);
    cancelTodo.addEventListener('click', closeModalHandler);
    todoModal.querySelector('.modal-overlay').addEventListener('click', closeModalHandler);
    todoForm.addEventListener('submit', handleSaveTodo);

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

    // Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => Auth.logout());
    }

    // Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !todoModal.classList.contains('hidden')) {
            closeModalHandler();
        }
    });
}

// Navigation
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

// Update View
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

// Month View
async function renderMonthView() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Fetch todo counts for this month
    const counts = await fetchCalendarCounts(year, month + 1);

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let html = '';

    // Empty cells before first day
    for (let i = 0; i < startDay; i++) {
        html += '<div class="calendar-day empty"></div>';
    }

    // Days of month
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dateStr = formatDateISO(date);
        const count = counts[dateStr] || 0;
        const isToday = date.getTime() === today.getTime();
        const isPast = date < today;

        html += `
            <div class="calendar-day ${isToday ? 'today' : ''} ${isPast ? 'past' : ''}" 
                 data-date="${dateStr}">
                <span class="day-number">${day}</span>
                ${count > 0 ? `<span class="todo-count">${count}</span>` : ''}
            </div>
        `;
    }

    calendarGrid.innerHTML = html;

    // Add click handlers
    calendarGrid.querySelectorAll('.calendar-day:not(.empty)').forEach(dayEl => {
        dayEl.addEventListener('click', () => showDayTodos(dayEl.dataset.date));
    });
}

// Week View
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
        const dayTodos = todos.filter(t => t.dueDate === dateStr);
        const isToday = date.getTime() === today.getTime();

        html += `<div class="week-day-column ${isToday ? 'today' : ''}" data-date="${dateStr}">`;
        dayTodos.forEach(todo => {
            html += createTodoHTML(todo, true);
        });
        html += '</div>';
    }
    html += '</div>';

    document.getElementById('weekGrid').innerHTML = html;
    attachTodoListeners(document.getElementById('weekGrid'));
}

// Day View
async function renderDayView() {
    const dateStr = formatDateISO(currentDate);
    const todos = await fetchDayTodos(dateStr);

    const container = document.getElementById('dayTodoList');

    if (todos.length === 0) {
        container.innerHTML = '<div class="empty-day">Không có công việc nào</div>';
    } else {
        container.innerHTML = todos.map(todo => createTodoHTML(todo)).join('');
        attachTodoListeners(container);
    }
}

// List View
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
            const end = new Date();
            end.setDate(end.getDate() + 7);
            todos = await fetchDateRangeTodos(start, end);
        } else if (filter === 'no-date') {
            todos = await fetchNoDateTodos();
        } else {
            todos = await fetchAllTodos();
        }

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

// Show day todos (when clicking on calendar day)
async function showDayTodos(dateStr) {
    selectedDate = dateStr;
    const todos = await fetchDayTodos(dateStr);

    const date = new Date(dateStr);
    document.getElementById('selectedDayTitle').textContent = date.toLocaleDateString('vi-VN', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    const container = document.getElementById('selectedDayTodos');
    if (todos.length === 0) {
        container.innerHTML = '<div class="empty-day">Không có công việc</div>';
    } else {
        container.innerHTML = todos.map(todo => createTodoHTML(todo)).join('');
        attachTodoListeners(container);
    }

    selectedDaySection.classList.remove('hidden');
}

// Create Todo HTML
function createTodoHTML(todo, compact = false) {
    const priorityClass = `priority-${todo.priority?.toLowerCase() || 'medium'}`;
    const overdueClass = isOverdue(todo) ? 'overdue' : '';
    const completedClass = todo.completed ? 'completed' : '';

    const dueInfo = todo.dueDate
        ? `${formatDate(new Date(todo.dueDate))}${todo.dueTime ? ' ' + todo.dueTime.substring(0, 5) : ''}`
        : '';

    if (compact) {
        return `
            <div class="todo-item compact ${priorityClass} ${overdueClass} ${completedClass}" data-id="${todo.id}">
                <label class="todo-checkbox">
                    <input type="checkbox" ${todo.completed ? 'checked' : ''}>
                    <span class="checkmark"></span>
                </label>
                <span class="todo-title">${escapeHtml(todo.title)}</span>
            </div>
        `;
    }

    return `
        <div class="todo-item ${priorityClass} ${overdueClass} ${completedClass}" data-id="${todo.id}">
            <label class="todo-checkbox">
                <input type="checkbox" ${todo.completed ? 'checked' : ''}>
                <span class="checkmark"></span>
            </label>
            <div class="todo-content">
                <h3 class="todo-title">${escapeHtml(todo.title)}</h3>
                ${todo.description ? `<p class="todo-description">${escapeHtml(todo.description)}</p>` : ''}
                <div class="todo-meta">
                    ${dueInfo ? `<span class="due-date">${dueInfo}</span>` : ''}
                    <span class="priority-badge">${getPriorityLabel(todo.priority)}</span>
                </div>
            </div>
            <div class="todo-actions">
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
        editBtn?.addEventListener('click', () => openModal(id));

        const deleteBtn = item.querySelector('.delete-btn');
        deleteBtn?.addEventListener('click', () => {
            if (confirm('Bạn có chắc muốn xóa công việc này?')) {
                deleteTodo(id);
            }
        });
    });
}

// Modal Functions
function openModal(id = null) {
    if (id) {
        // Edit mode
        const todo = todos.find(t => t.id === id) || fetchTodoById(id);
        if (todo) {
            modalTitle.textContent = 'Chỉnh sửa công việc';
            todoId.value = todo.id;
            todoTitle.value = todo.title;
            todoDescription.value = todo.description || '';
            todoDueDate.value = todo.dueDate || '';
            todoDueTime.value = todo.dueTime || '';
            todoPriority.value = todo.priority || 'MEDIUM';
            todoCompleted.checked = todo.completed;
            completedGroup.style.display = 'block';
        }
    } else {
        // Add mode
        modalTitle.textContent = 'Thêm công việc';
        todoForm.reset();
        todoId.value = '';
        // Set default date to selected date or today
        todoDueDate.value = selectedDate || formatDateISO(new Date());
        todoPriority.value = 'MEDIUM';
        completedGroup.style.display = 'none';
    }

    todoModal.classList.remove('hidden');
    todoTitle.focus();
}

function closeModalHandler() {
    todoModal.classList.add('hidden');
    todoForm.reset();
}

async function handleSaveTodo(e) {
    e.preventDefault();

    const todoData = {
        title: todoTitle.value.trim(),
        description: todoDescription.value.trim(),
        dueDate: todoDueDate.value || null,
        dueTime: todoDueTime.value || null,
        priority: todoPriority.value,
        completed: todoCompleted.checked
    };

    const id = todoId.value;

    try {
        if (id) {
            await updateTodo(parseInt(id), todoData);
        } else {
            await createTodo(todoData);
        }
        closeModalHandler();
        updateView();
    } catch (error) {
        console.error('Error saving todo:', error);
    }
}

// API Functions
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

async function fetchDateRangeTodos(start, end) {
    const response = await fetch(`${API_BASE_URL}/week?start=${formatDateISO(start)}`, { headers: getHeaders() });
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

// Helper Functions
function formatDateISO(date) {
    return date.toISOString().split('T')[0];
}

function formatDate(date) {
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

function getStartOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay();
    d.setDate(d.getDate() - day);
    return d;
}

function isOverdue(todo) {
    if (!todo.dueDate || todo.completed) return false;
    const dueDate = new Date(todo.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dueDate < today;
}

function getPriorityLabel(priority) {
    switch (priority) {
        case 'HIGH': return '🔴 Cao';
        case 'LOW': return '🟢 Thấp';
        default: return '🟡 TB';
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
