import { useCallback, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Note, Folder, Todo, CalendarTask } from '@/types/notes';
import { User } from '@supabase/supabase-js';
import { Customization } from './useCustomization';

export function useCloudSync(user: User | null) {
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const syncLock = useRef(false);

  const loadFromCloud = useCallback(async (): Promise<{
    notes: Note[];
    folders: Folder[];
    todos: Todo[];
    calendarTasks: CalendarTask[];
    customization?: Customization | null;
  } | null> => {
    if (!user) return null;

    try {
      const [notesRes, foldersRes, todosRes, tasksRes, customRes] = await Promise.all([
        supabase.from('notes').select('*').eq('user_id', user.id),
        supabase.from('folders').select('*').eq('user_id', user.id),
        supabase.from('todos').select('*').eq('user_id', user.id),
        supabase.from('calendar_tasks').select('*').eq('user_id', user.id),
        supabase.from('user_customizations').select('*').eq('user_id', user.id).maybeSingle(),
      ]);

      if (notesRes.error) throw notesRes.error;
      if (foldersRes.error) throw foldersRes.error;
      if (todosRes.error) throw todosRes.error;
      if (tasksRes.error) throw tasksRes.error;

      let customization: Customization | null = null;
      if (!customRes.error && customRes.data && customRes.data.customization_data) {
        try {
          customization = customRes.data.customization_data as unknown as Customization;
        } catch {}
      }

      return {
        notes: (notesRes.data || []).map((n: any) => ({
          id: n.id,
          title: n.title,
          content: n.content,
          type: n.type as Note['type'],
          folderId: n.folder_id,
          tags: n.tags || [],
          createdAt: new Date(n.created_at),
          updatedAt: new Date(n.updated_at),
          linkedDate: n.linked_date ? new Date(n.linked_date) : null,
          drawingData: n.drawing_data || undefined,
          workflowData: n.workflow_data || undefined,
          password: n.password || undefined,
        })),
        folders: (foldersRes.data || []).map((f: any) => ({
          id: f.id,
          name: f.name,
          color: f.color,
          parentId: f.parent_id,
        })),
        todos: (todosRes.data || []).map((t: any) => ({
          id: t.id,
          text: t.text,
          completed: t.completed,
          noteId: t.note_id,
          createdAt: new Date(t.created_at),
        })),
        calendarTasks: (tasksRes.data || []).map((t: any) => ({
          id: t.id,
          text: t.text,
          completed: t.completed,
          date: t.date,
          createdAt: new Date(t.created_at),
          reminderTime: t.reminder_time || undefined,
          reminderNotified: t.reminder_notified || false,
        })),
        customization,
      };
    } catch (err) {
      console.error('Cloud load error:', err);
      return null;
    }
  }, [user]);

  const saveToCloud = useCallback(async (
    notes: Note[],
    folders: Folder[],
    todos: Todo[],
    calendarTasks: CalendarTask[],
    customization?: Customization
  ) => {
    if (!user || syncLock.current) return;
    syncLock.current = true;
    setSyncing(true);

    try {
      // Get current cloud IDs for each table to detect deletions
      const [cloudNotes, cloudFolders, cloudTodos, cloudTasks] = await Promise.all([
        supabase.from('notes').select('id').eq('user_id', user.id),
        supabase.from('folders').select('id').eq('user_id', user.id),
        supabase.from('todos').select('id').eq('user_id', user.id),
        supabase.from('calendar_tasks').select('id').eq('user_id', user.id),
      ]);

      const localNoteIds = new Set(notes.map(n => n.id));
      const localFolderIds = new Set(folders.map(f => f.id));
      const localTodoIds = new Set(todos.map(t => t.id));
      const localTaskIds = new Set(calendarTasks.map(t => t.id));

      // Delete items removed locally
      const deletePromises: Promise<any>[] = [];
      const deletedNoteIds = (cloudNotes.data || []).filter(n => !localNoteIds.has(n.id)).map(n => n.id);
      const deletedFolderIds = (cloudFolders.data || []).filter(f => !localFolderIds.has(f.id)).map(f => f.id);
      const deletedTodoIds = (cloudTodos.data || []).filter(t => !localTodoIds.has(t.id)).map(t => t.id);
      const deletedTaskIds = (cloudTasks.data || []).filter(t => !localTaskIds.has(t.id)).map(t => t.id);

      if (deletedNoteIds.length > 0) deletePromises.push(supabase.from('notes').delete().in('id', deletedNoteIds).eq('user_id', user.id) as any);
      if (deletedFolderIds.length > 0) deletePromises.push(supabase.from('folders').delete().in('id', deletedFolderIds).eq('user_id', user.id) as any);
      if (deletedTodoIds.length > 0) deletePromises.push(supabase.from('todos').delete().in('id', deletedTodoIds).eq('user_id', user.id) as any);
      if (deletedTaskIds.length > 0) deletePromises.push(supabase.from('calendar_tasks').delete().in('id', deletedTaskIds).eq('user_id', user.id) as any);

      if (deletePromises.length > 0) await Promise.all(deletePromises);

      // Upsert current data
      const upsertPromises: Promise<any>[] = [];

      if (notes.length > 0) {
        upsertPromises.push(
          supabase.from('notes').upsert(
            notes.map(n => ({
              id: n.id,
              user_id: user.id,
              title: n.title,
              content: n.content,
              type: n.type,
              folder_id: n.folderId,
              tags: n.tags,
              created_at: n.createdAt.toISOString(),
              updated_at: n.updatedAt.toISOString(),
              linked_date: n.linkedDate?.toISOString() || null,
              drawing_data: n.drawingData || null,
              workflow_data: n.workflowData || null,
              password: n.password || null,
            })),
            { onConflict: 'id' }
          ) as any
        );
      }

      if (folders.length > 0) {
        upsertPromises.push(
          supabase.from('folders').upsert(
            folders.map(f => ({
              id: f.id,
              user_id: user.id,
              name: f.name,
              color: f.color,
              parent_id: f.parentId,
            })),
            { onConflict: 'id' }
          ) as any
        );
      }

      if (todos.length > 0) {
        upsertPromises.push(
          supabase.from('todos').upsert(
            todos.map(t => ({
              id: t.id,
              user_id: user.id,
              text: t.text,
              completed: t.completed,
              note_id: t.noteId,
              created_at: t.createdAt.toISOString(),
            })),
            { onConflict: 'id' }
          ) as any
        );
      }

      if (calendarTasks.length > 0) {
        upsertPromises.push(
          supabase.from('calendar_tasks').upsert(
            calendarTasks.map(t => ({
              id: t.id,
              user_id: user.id,
              text: t.text,
              completed: t.completed,
              date: t.date,
              created_at: t.createdAt.toISOString(),
              reminder_time: t.reminderTime || null,
              reminder_notified: t.reminderNotified || false,
            })),
            { onConflict: 'id' }
          ) as any
        );
      }

      if (customization) {
        upsertPromises.push(
          supabase.from('user_customizations').upsert({
            user_id: user.id,
            customization_data: customization as any,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' }) as any
        );
      }

      const results = await Promise.all(upsertPromises);
      const errors = results.filter((r: any) => r.error);
      if (errors.length > 0) {
        console.error('Cloud save errors:', errors.map((e: any) => e.error));
      } else {
        setLastSynced(new Date());
      }
    } catch (err) {
      console.error('Cloud save error:', err);
    } finally {
      setSyncing(false);
      syncLock.current = false;
    }
  }, [user]);

  return { loadFromCloud, saveToCloud, syncing, lastSynced };
}
