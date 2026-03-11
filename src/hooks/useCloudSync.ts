import { useCallback, useEffect, useRef, useState } from 'react';
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
      if (!customRes.error && customRes.data?.customization_data) {
        try {
          customization = customRes.data.customization_data as unknown as Customization;
        } catch {}
      }

      return {
        notes: (notesRes.data || []).map(n => ({
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
        folders: (foldersRes.data || []).map(f => ({
          id: f.id,
          name: f.name,
          color: f.color,
          parentId: f.parent_id,
        })),
        todos: (todosRes.data || []).map(t => ({
          id: t.id,
          text: t.text,
          completed: t.completed,
          noteId: t.note_id,
          createdAt: new Date(t.created_at),
        })),
        calendarTasks: (tasksRes.data || []).map(t => ({
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
      // Delete existing data first, then insert fresh
      await Promise.all([
        supabase.from('notes').delete().eq('user_id', user.id).select(),
        supabase.from('folders').delete().eq('user_id', user.id).select(),
        supabase.from('todos').delete().eq('user_id', user.id).select(),
        supabase.from('calendar_tasks').delete().eq('user_id', user.id).select(),
      ]);

      const insertPromises: any[] = [];

      if (notes.length > 0) {
        insertPromises.push(
          supabase.from('notes').insert(
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
            }))
          ).select()
        );
      }

      if (folders.length > 0) {
        insertPromises.push(
          supabase.from('folders').insert(
            folders.map(f => ({
              id: f.id,
              user_id: user.id,
              name: f.name,
              color: f.color,
              parent_id: f.parentId,
            }))
          ).select()
        );
      }

      if (todos.length > 0) {
        insertPromises.push(
          supabase.from('todos').insert(
            todos.map(t => ({
              id: t.id,
              user_id: user.id,
              text: t.text,
              completed: t.completed,
              note_id: t.noteId,
              created_at: t.createdAt.toISOString(),
            }))
          ).select()
        );
      }

      if (calendarTasks.length > 0) {
        insertPromises.push(
          supabase.from('calendar_tasks').insert(
            calendarTasks.map(t => ({
              id: t.id,
              user_id: user.id,
              text: t.text,
              completed: t.completed,
              date: t.date,
              created_at: t.createdAt.toISOString(),
              reminder_time: t.reminderTime || null,
              reminder_notified: t.reminderNotified || false,
            }))
          ).select()
        );
      }

      // Save customization
      if (customization) {
        insertPromises.push(
          supabase.from('user_customizations').upsert({
            user_id: user.id,
            customization_data: customization as any,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' }).select()
        );
      }

      const results = await Promise.all(insertPromises);
      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        console.error('Cloud save errors:', errors.map(e => e.error));
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
