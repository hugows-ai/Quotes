export type NoteType = 'text' | 'drawing' | 'workflow';

export interface Note {
  id: string;
  title: string;
  content: string;
  type: NoteType;
  folderId: string | null;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  linkedDate: Date | null;
  drawingData?: string;
  workflowData?: string;
  password?: string; // hashed password for locked notes
}

export interface Folder {
  id: string;
  name: string;
  color: string;
  parentId: string | null;
}

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  noteId: string | null;
  createdAt: Date;
}

export interface CalendarTask {
  id: string;
  text: string;
  completed: boolean;
  date: string; // YYYY-MM-DD format
  createdAt: Date;
  reminderTime?: string; // HH:mm format
  reminderNotified?: boolean;
}
