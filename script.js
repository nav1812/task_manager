const taskForm = document.getElementById('task-form');
const taskInput = document.getElementById('task-input');
const dueDateInput = document.getElementById('due-date');
const prioritySelect = document.getElementById('priority');
const taskList = document.getElementById('task-list');
const filters = document.querySelectorAll('.filter-btn');
const tasksLeftSpan = document.getElementById('tasks-left');
const clearCompletedBtn = document.getElementById('clear-completed');

let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
let currentFilter = 'all';

// Save tasks to localStorage
function saveTasks() {
  localStorage.setItem('tasks', JSON.stringify(tasks));
}

// Calculate tasks left (not done)
function updateTasksLeft() {
  const count = tasks.filter(task => !task.done).length;
  tasksLeftSpan.textContent = `${count} task${count !== 1 ? 's' : ''} left`;
}

// Check if date is overdue
function isOverdue(dateStr) {
  if (!dateStr) return false;
  const today = new Date();
  const due = new Date(dateStr + 'T23:59:59');
  return due < today;
}

// Render tasks with filters
function renderTasks() {
  taskList.innerHTML = '';

  let filteredTasks = [];
  if (currentFilter === 'all') filteredTasks = tasks;
  else if (currentFilter === 'active') filteredTasks = tasks.filter(t => !t.done);
  else filteredTasks = tasks.filter(t => t.done);

  filteredTasks.forEach((task, index) => {
    // li element, draggable
    const li = document.createElement('li');
    li.classList.toggle('done', task.done);
    li.draggable = true;
    li.dataset.index = index;

    // Drag events
    li.addEventListener('dragstart', dragStart);
    li.addEventListener('dragover', dragOver);
    li.addEventListener('drop', dragDrop);
    li.addEventListener('dragend', dragEnd);

    // Task text container
    const taskText = document.createElement('span');
    taskText.className = 'task-text';

    // Main row: priority dot + task text
    const taskMain = document.createElement('div');
    taskMain.className = 'task-main';

    const priorityDot = document.createElement('span');
    priorityDot.className = 'priority-indicator';
    priorityDot.classList.add(`priority-${task.priority}`);

    const taskTitle = document.createElement('span');
    taskTitle.textContent = task.text;

    taskMain.appendChild(priorityDot);
    taskMain.appendChild(taskTitle);

    taskText.appendChild(taskMain);

    // Due date display
    if(task.dueDate){
      const dueDateSpan = document.createElement('span');
      dueDateSpan.className = 'due-date';
      if(isOverdue(task.dueDate) && !task.done){
        dueDateSpan.classList.add('overdue');
      }
      // Format date nicely: yyyy-mm-dd to readable
      const dateObj = new Date(task.dueDate);
      const options = { year: 'numeric', month: 'short', day: 'numeric' };
      dueDateSpan.textContent = `Due: ${dateObj.toLocaleDateString(undefined, options)}`;
      taskText.appendChild(dueDateSpan);
    }

    // Toggle done on task text click
    taskText.addEventListener('click', () => {
      // Find actual task index in tasks array (because of filtering)
      const actualIndex = tasks.findIndex(t => t === filteredTasks[index]);
      if(actualIndex !== -1){
        tasks[actualIndex].done = !tasks[actualIndex].done;
        saveTasks();
        renderTasks();
        updateTasksLeft();
      }
    });

    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-delete';
    deleteBtn.innerHTML = '&times;';
    deleteBtn.title = 'Delete task';
    deleteBtn.setAttribute('aria-label', `Delete task: ${task.text}`);

    deleteBtn.addEventListener('click', () => {
      const actualIndex = tasks.findIndex(t => t === filteredTasks[index]);
      if(actualIndex !== -1){
        tasks.splice(actualIndex, 1);
        saveTasks();
        renderTasks();
        updateTasksLeft();
      }
    });

    li.appendChild(taskText);
    li.appendChild(deleteBtn);

    taskList.appendChild(li);
  });

  updateTasksLeft();
}

// Handle form submit
taskForm.addEventListener('submit', e => {
  e.preventDefault();
  const text = taskInput.value.trim();
  if (text === '') return;

  const newTask = {
    text,
    done: false,
    dueDate: dueDateInput.value || null,
    priority: prioritySelect.value
  };

  tasks.push(newTask);
  saveTasks();
  renderTasks();

  taskInput.value = '';
  dueDateInput.value = '';
  prioritySelect.value = 'low';
  taskInput.focus();
});

// Filter buttons event listeners
filters.forEach(btn => {
  btn.addEventListener('click', () => {
    filters.forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-pressed', 'false');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-pressed', 'true');
    currentFilter = btn.dataset.filter;
    renderTasks();
  });
});

// Clear completed tasks
clearCompletedBtn.addEventListener('click', () => {
  tasks = tasks.filter(t => !t.done);
  saveTasks();
  renderTasks();
  updateTasksLeft();
});

// Drag and Drop logic variables
let dragSrcEl = null;

function dragStart(e) {
  dragSrcEl = this;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/html', this.innerHTML);
  this.style.opacity = '0.4';
}

function dragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  return false;
}

function dragDrop(e) {
  e.stopPropagation();
  if (dragSrcEl !== this) {
    // Find indexes in the main tasks array
    const fromIndex = Number(dragSrcEl.dataset.index);
    const toIndex = Number(this.dataset.index);

    // Swap tasks in tasks array (because of filtering, careful!)
    // We will reorder the main tasks array according to displayed order

    // To reorder the full tasks array, we first need to map filtered indexes back to original indexes
    // But drag and drop is done on filteredTasks view, so must reorder tasks carefully

    // We'll reorder the *tasks* array by:
    // - Remove dragged task from tasks
    // - Insert dragged task before the drop target task

    // Get filtered tasks as per currentFilter:
    let filteredTasks = [];
    if (currentFilter === 'all') filteredTasks = tasks;
    else if (currentFilter === 'active') filteredTasks = tasks.filter(t => !t.done);
    else filteredTasks = tasks.filter(t => t.done);

    const draggedTask = filteredTasks[fromIndex];
    const targetTask = filteredTasks[toIndex];

    // Find indexes in main tasks array
    const draggedIndex = tasks.indexOf(draggedTask);
    const targetIndex = tasks.indexOf(targetTask);

    if(draggedIndex === -1 || targetIndex === -1) return;

    // Remove dragged task
    tasks.splice(draggedIndex, 1);

    // Insert dragged task at targetIndex (if dragged from below, adjust index)
    let insertIndex = targetIndex;
    if(draggedIndex < targetIndex){
      insertIndex = targetIndex - 1;
    }

    tasks.splice(insertIndex, 0, draggedTask);

    saveTasks();
    renderTasks();
  }
  return false;
}

function dragEnd() {
  this.style.opacity = '1';
}

// Initial render
renderTasks();