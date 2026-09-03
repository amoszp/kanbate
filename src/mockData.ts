export const DEFAULT_BLOCKS = [
  {
    id: 1,
    name: 'Priority',
    createdAt: new Date().toISOString(),
    tags: [
      { id: 1, categoryId: 1, categoryName: 'Priority', name: 'Low', color: '#00f0ff', createdAt: new Date().toISOString() },
      { id: 2, categoryId: 1, categoryName: 'Priority', name: 'Medium', color: '#ffd700', createdAt: new Date().toISOString() },
      { id: 3, categoryId: 1, categoryName: 'Priority', name: 'High', color: '#ff2a6d', createdAt: new Date().toISOString() },
    ],
  },
  {
    id: 2,
    name: 'AI Tool',
    createdAt: new Date().toISOString(),
    tags: [
      { id: 4, categoryId: 2, categoryName: 'AI Tool', name: 'Claude', color: '#d97757', createdAt: new Date().toISOString() },
      { id: 5, categoryId: 2, categoryName: 'AI Tool', name: 'ChatGPT', color: '#10a37f', createdAt: new Date().toISOString() },
      { id: 6, categoryId: 2, categoryName: 'AI Tool', name: 'Gemini', color: '#4285f4', createdAt: new Date().toISOString() },
    ],
  },
];

export const INITIAL_PROJECTS = [
  {
    id: 1,
    name: 'Proyecto Demo',
    description: 'Kanban público de prueba',
    createdAt: new Date().toISOString(),
    created_at: new Date().toISOString(),
    tasks: [],
  },
];

export const INITIAL_TASKS = [
  {
    id: 1,
    projectId: 1,
    title: 'Probar mover esta tarjeta',
    description: 'Mueve las tareas entre las columnas',
    status: 'todo',
    tags: [
      { id: 2, categoryId: 1, categoryName: 'Priority', name: 'Medium', color: '#ffd700', createdAt: new Date().toISOString() }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    movedToResolvedAt: null,
    movedToInProgressAt: null,
  },
  {
    id: 2,
    projectId: 1,
    title: 'Proyecto desplegado en Vercel',
    description: 'Modo cliente activo sin backend',
    status: 'resolved',
    tags: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    movedToResolvedAt: new Date().toISOString(),
    movedToInProgressAt: null,
  },
];