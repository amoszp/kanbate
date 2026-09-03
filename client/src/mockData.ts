export const DEFAULT_BLOCKS = [
  {
    name: 'Priority',
    tags: [
      { id: 1, name: 'Low', color: '#00f0ff' },
      { id: 2, name: 'Medium', color: '#ffd700' },
      { id: 3, name: 'High', color: '#ff2a6d' },
    ],
  },
  {
    name: 'AI Tool',
    tags: [
      { id: 4, name: 'Claude', color: '#d97757' },
      { id: 5, name: 'ChatGPT', color: '#10a37f' },
      { id: 6, name: 'Gemini', color: '#4285f4' },
    ],
  },
];

export const INITIAL_PROJECTS = [
  { id: 1, name: 'Proyecto Demo', description: 'Kanban público de prueba' },
];

export const INITIAL_TASKS = [
  { id: 1, projectId: 1, title: 'Probar mover esta tarjeta', status: 'todo' },
  { id: 2, projectId: 1, title: 'Proyecto desplegado en Vercel', status: 'done' },
];