'use client';

import { useEffect, useState, useCallback, ChangeEvent } from 'react';
import axios from 'axios';
import TopBar from '@/components/TopBar';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import 'react-datepicker/dist/react-datepicker.css';
import ChatWidget from '@/components/RealtimeChatSystem';

// --- INTERFACES ---
interface TaskDto {
  id: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  dueDate: Date | null;
  createdByUsername: string;
  assignedToUsername: string;
  approvedByUsername: string;
  isCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  projectId?: number;
  projectName?: string;
}

interface ProjectDto {
  id: number;
  name: string;
}

interface TaskHistoryDto {
    id: number;
    taskId: number;
    changedByUsername: string;
    action: string;
    details: any;
    timestamp: Date;
}

interface TimeLogDto {
    id: number;
    taskId: number;
    loggedByUsername: string;
    hours: number;
    description: string;
    createdAt: Date;
}

interface TaskAttachmentDto {
    id: number;
    fileName: string;
    fileUrl: string;
    uploaderUsername: string;
    uploadedAt: Date;
}


export default function ViewApprovalPage() {
  const { user, loading } = useAuthGuard();
  const [tasks, setTasks] = useState<TaskDto[]>([]);
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterProjectId, setFilterProjectId] = useState<number | undefined>();

  // --- MODAL STATES ---
  const [modal, setModal] = useState<{
    isOpen: boolean;
    type: 'success' | 'error';
    message: string;
  }>({ isOpen: false, type: 'success', message: '' });

  const [taskModal, setTaskModal] = useState<{
    isOpen: boolean;
    task: TaskDto | null;
    error: string | null;
  }>({ isOpen: false, task: null, error: null });

  const [attachmentModal, setAttachmentModal] = useState<{
    isOpen: boolean;
    taskId: number | null;
    taskTitle: string;
    attachments: TaskAttachmentDto[];
  }>({ isOpen: false, taskId: null, taskTitle: '', attachments: [] });

  const [historyModal, setHistoryModal] = useState<{
      isOpen: boolean;
      taskTitle: string;
      history: TaskHistoryDto[];
  }>({ isOpen: false, taskTitle: '', history: []});

  const [rejectionModal, setRejectionModal] = useState<{
      isOpen: boolean;
      taskId: number | null;
      taskTitle: string;
      reason: string;
  }>({ isOpen: false, taskId: null, taskTitle: '', reason: '' });

  const [timeLogModal, setTimeLogModal] = useState<{
    isOpen: boolean;
    taskTitle: string;
    logs: TimeLogDto[];
  }>({ isOpen: false, taskTitle: '', logs: [] });

  // State for the file to be uploaded
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);


  const fetchData = useCallback(async () => {
    if (!user || user.role?.name.toUpperCase() !== 'MANAGER') return;
    setIsLoading(true);
    setError(null);
    try {
      const [tasksRes, projectsRes] = await Promise.all([
        axios.get('http://localhost:3001/tasks/pending-approval', {
          withCredentials: true,
          params: { projectId: filterProjectId },
        }),
        axios.get('http://localhost:3001/tasks/projects', { withCredentials: true }),
      ]);
      setTasks(tasksRes.data);
      setProjects(projectsRes.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load tasks for approval.');
    } finally {
      setIsLoading(false);
    }
  }, [user, filterProjectId]);

  useEffect(() => {
    if (!loading && user) {
      fetchData();
    }
  }, [loading, user, fetchData]);

  const fetchTaskDetails = useCallback(async (taskId: number) => {
    setTaskModal({ isOpen: true, task: null, error: null });
    try {
      const res = await axios.get(`http://localhost:3001/tasks/task/${taskId}`, { withCredentials: true });
      setTaskModal({ isOpen: true, task: res.data, error: null });
    } catch (err: any) {
      setTaskModal({ isOpen: false, task: null, error: 'Failed to load task details.'});
    }
  }, []);

  const fetchTaskHistory = useCallback(async (taskId: number, taskTitle: string) => {
      try {
          const res = await axios.get(`http://localhost:3001/tasks/${taskId}/history`, { withCredentials: true });
          setHistoryModal({ isOpen: true, taskTitle, history: res.data });
      } catch (err: any) {
          setModal({ isOpen: true, type: 'error', message: 'Failed to load task history.' });
      }
  }, []);

  const fetchTimeLogs = useCallback(async (taskId: number, taskTitle:string) => {
    try {
        const res = await axios.get(`http://localhost:3001/tasks/${taskId}/time-logs`, { withCredentials: true });
        setTimeLogModal({ isOpen: true, taskTitle, logs: res.data });
    } catch (err) {
        setModal({ isOpen: true, type: 'error', message: 'Failed to load time logs.' });
    }
  }, []);

  const openAttachmentModal = useCallback(async (taskId: number, taskTitle: string) => {
    try {
        const res = await axios.get(`http://localhost:3001/tasks/${taskId}/attachments`, { withCredentials: true });
        setAttachmentModal({ isOpen: true, taskId, taskTitle, attachments: res.data });
    } catch (err: any) {
        setModal({ isOpen: true, type: 'error', message: 'Failed to load attachments.' });
    }
  }, []);


  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFileToUpload(e.target.files[0]);
    }
  };

  const handleFileUpload = async () => {
    if (!fileToUpload || !attachmentModal.taskId) return;

    const formData = new FormData();
    formData.append('file', fileToUpload);

    try {
      await axios.post(`http://localhost:3001/tasks/${attachmentModal.taskId}/attachments`, formData, {
        withCredentials: true,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setModal({ isOpen: true, type: 'success', message: 'File uploaded successfully!' });
      // Refresh the attachments list
      openAttachmentModal(attachmentModal.taskId, attachmentModal.taskTitle);
      setFileToUpload(null); // Reset the file input
    } catch (err: any) {
      setModal({ isOpen: true, type: 'error', message: err.response?.data?.message || 'Failed to upload file.' });
    }
  };


  const handleApproveTask = async (taskId: number) => {
    try {
      await axios.patch(`http://localhost:3001/tasks/${taskId}/status`, { status: 'APPROVED' }, { withCredentials: true });
      setModal({ isOpen: true, type: 'success', message: 'Task approved successfully!' });
      fetchData();
    } catch (err: any) {
      setModal({ isOpen: true, type: 'error', message: err.response?.data?.message || 'Failed to approve task.' });
    }
  };

  const handleConfirmRejection = async () => {
      if (!rejectionModal.taskId || !rejectionModal.reason) return;
      const { taskId, reason, taskTitle } = rejectionModal;
      try {
          await axios.post(`http://localhost:3001/tasks/${taskId}/comments`, { content: `Rejection Reason: ${reason}` }, { withCredentials: true });
          await axios.patch(`http://localhost:3001/tasks/${taskId}/reject`, {}, { withCredentials: true });
          setModal({ isOpen: true, type: 'success', message: `Task "${taskTitle}" rejected successfully.` });
          setRejectionModal({ isOpen: false, taskId: null, taskTitle: '', reason: '' });
          fetchData();
      } catch (err: any) {
          setModal({ isOpen: true, type: 'error', message: err.response?.data?.message || 'Failed to process rejection.' });
      }
  };

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center"><p>Authenticating...</p></div>;
  }

  if (user.role?.name.toUpperCase() !== 'MANAGER') {
    return <div className="min-h-screen flex items-center justify-center"><p>Access Denied. Manager role required.</p></div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-pink-50 dark:from-gray-900 p-6 md:p-10">
      <TopBar />
      {error && <div role="alert" className="alert alert-error mb-6">{error}</div>}

      <div className="card bg-white dark:bg-gray-800 shadow-2xl rounded-2xl p-6">
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 mb-6">Tasks Pending Approval</h1>

        <div className="mb-4">
          <label className="label"><span className="label-text text-gray-700 dark:text-gray-300">Filter by Project</span></label>
          <select
            className="select select-bordered w-full max-w-xs rounded-lg"
            value={filterProjectId || ''}
            onChange={(e) => setFilterProjectId(e.target.value ? parseInt(e.target.value) : undefined)}
          >
            <option value="">All Projects</option>
            {projects.map((project) => (<option key={project.id} value={project.id}>{project.name}</option>))}
          </select>
        </div>

        {isLoading ? (
          <div className="text-center p-10"><span className="loading loading-spinner loading-lg"></span></div>
        ) : tasks.length === 0 ? (
          <p className="text-lg italic text-gray-500 dark:text-gray-400">No tasks are currently pending approval.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table w-full table-zebra">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-100">
                  <th>Title</th>
                  <th>Assignee</th>
                  <th>Project</th>
                  <th>Priority</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-gray-50 dark:hover:bg-gray-600">
                    <td className="font-medium text-gray-900 dark:text-gray-100">{task.title}</td>
                    <td>{task.assignedToUsername || 'Unassigned'}</td>
                    <td>{task.projectName || 'N/A'}</td>
                    <td>
                      <span className={`badge ${task.priority === 'HIGH' ? 'badge-error' : task.priority === 'MEDIUM' ? 'badge-warning' : 'badge-info'}`}>
                        {task.priority}
                      </span>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => handleApproveTask(task.id)} className="btn btn-xs btn-success text-white">Approve</button>
                        <button onClick={() => setRejectionModal({isOpen: true, taskId: task.id, taskTitle: task.title, reason: ''})} className="btn btn-xs btn-error text-white">Reject</button>
                        <button onClick={() => openAttachmentModal(task.id, task.title)} className="btn btn-xs btn-info text-white">Attachments</button>
                        <button onClick={() => fetchTimeLogs(task.id, task.title)} className="btn btn-xs btn-accent text-white">Time Logs</button>
                        <button onClick={() => fetchTaskDetails(task.id)} className="btn btn-xs btn-outline">View</button>
                        <button onClick={() => fetchTaskHistory(task.id, task.title)} className="btn btn-xs btn-secondary">History</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- ALL MODALS --- */}

      {/* Attachment Modal */}
      {attachmentModal.isOpen && (
          <dialog className="modal modal-open">
              <div className="modal-box bg-white dark:bg-gray-800">
                  <h3 className="font-bold text-lg">Attachments for: {attachmentModal.taskTitle}</h3>
                  {/* --- UPLOAD SECTION --- */}
                  <div className="py-4 border-b border-gray-200 dark:border-gray-700">
                      <h4 className="font-semibold text-md mb-2">Upload New File</h4>
                      <div className="flex items-center gap-2">
                          <input type="file" onChange={handleFileSelect} className="file-input file-input-bordered file-input-sm w-full max-w-xs" />
                          <button onClick={handleFileUpload} className="btn btn-sm btn-primary" disabled={!fileToUpload}>Upload</button>
                      </div>
                  </div>
                  {/* --- DOWNLOAD SECTION --- */}
                  <div className="py-4 max-h-60 overflow-y-auto">
                       <h4 className="font-semibold text-md mb-2">Existing Files</h4>
                      {attachmentModal.attachments.length > 0 ? (
                          <ul className='space-y-2'>
                              {attachmentModal.attachments.map((att: TaskAttachmentDto) => (
                                  <li key={att.id} className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg flex justify-between items-center">
                                      <a href={`http://localhost:3001${att.fileUrl}`} target="_blank" rel="noopener noreferrer" className="link link-primary">
                                          {att.fileName}
                                      </a>
                                      <span className='text-xs text-gray-500'>by {att.uploaderUsername}</span>
                                  </li>
                              ))}
                          </ul>
                      ) : (<p className="text-sm italic text-gray-500">No attachments found.</p>)}
                  </div>
                  <div className="modal-action">
                      <button onClick={() => setAttachmentModal({ isOpen: false, taskId: null, taskTitle: '', attachments: [] })} className="btn">Close</button>
                  </div>
              </div>
          </dialog>
      )}

      {/* Rejection Modal */}
      {rejectionModal.isOpen && (
          <dialog className="modal modal-open">
              <div className="modal-box bg-white dark:bg-gray-800">
                  <h3 className="font-bold text-lg">Reject Task: {rejectionModal.taskTitle}</h3>
                  <div className="form-control py-4">
                      <textarea className="textarea textarea-bordered w-full" placeholder="Please provide a reason for rejection..." value={rejectionModal.reason} onChange={(e) => setRejectionModal(prev => ({ ...prev, reason: e.target.value }))}></textarea>
                  </div>
                  <div className="modal-action">
                      <button onClick={handleConfirmRejection} className="btn btn-error" disabled={!rejectionModal.reason}>Confirm Rejection</button>
                      <button onClick={() => setRejectionModal({isOpen: false, taskId: null, taskTitle: '', reason: ''})} className="btn">Cancel</button>
                  </div>
              </div>
          </dialog>
      )}

      {/* Task Details Modal */}
      {taskModal.isOpen && (
          <dialog className="modal modal-open">
            <div className="modal-box w-11/12 max-w-2xl bg-white dark:bg-gray-800">
              <h3 className="font-bold text-lg">{taskModal.task?.title || 'Loading...'}</h3>
              {taskModal.task ? (
                  <div className="py-4 space-y-2">
                      <p><strong>Description:</strong> {taskModal.task.description || 'N/A'}</p>
                      <p><strong>Status:</strong> {taskModal.task.status}</p>
                      <p><strong>Priority:</strong> {taskModal.task.priority}</p>
                      <p><strong>Assignee:</strong> {taskModal.task.assignedToUsername || 'Unassigned'}</p>
                      <p><strong>Due Date:</strong> {taskModal.task.dueDate ? new Date(taskModal.task.dueDate).toLocaleDateString() : 'N/A'}</p>
                  </div>
              ) : <div className="text-center p-4"><span className="loading loading-spinner"></span></div> }
              <div className="modal-action">
                  <button onClick={() => setTaskModal({ isOpen: false, task: null, error: null })} className="btn">Close</button>
              </div>
            </div>
          </dialog>
      )}

      {/* History Modal */}
      {historyModal.isOpen && (
          <dialog className="modal modal-open">
               <div className="modal-box w-11/12 max-w-2xl bg-white dark:bg-gray-800">
                  <h3 className="font-bold text-lg">History for: {historyModal.taskTitle}</h3>
                   <div className="py-4 max-h-96 overflow-y-auto">
                      {historyModal.history.length > 0 ? (
                          <ul className="timeline timeline-snap-icon max-md:timeline-compact timeline-vertical">
                              {historyModal.history.map((entry, index) => (
                                  <li key={entry.id}>
                                      <div className="timeline-middle"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.06 0l4.001-5.5a.75.75 0 00.078-.179z" clipRule="evenodd" /></svg></div>
                                      <div className={`timeline-end mb-10 ${index % 2 === 0 ? 'md:text-end' : ''}`}>
                                          <time className="font-mono italic text-sm">{new Date(entry.timestamp).toLocaleString()}</time>
                                          <div className="text-lg font-black">{entry.action}</div>
                                          <p className="text-sm">by {entry.changedByUsername}</p>
                                          <div className="text-xs mt-1 p-2 bg-gray-100 dark:bg-gray-700 rounded"><pre>{JSON.stringify(entry.details, null, 2)}</pre></div>
                                      </div>
                                      <hr/>
                                  </li>
                              ))}
                          </ul>
                      ) : (<p>No history found.</p>)}
                   </div>
                   <div className="modal-action">
                      <button onClick={() => setHistoryModal({ isOpen: false, taskTitle: '', history: [] })} className="btn">Close</button>
                  </div>
               </div>
          </dialog>
      )}

      {/* TimeLog Modal */}
      {timeLogModal.isOpen && (
          <dialog className="modal modal-open">
              <div className="modal-box w-11/12 max-w-lg bg-white dark:bg-gray-800">
                  <h3 className="font-bold text-lg">Time Logs for: {timeLogModal.taskTitle}</h3>
                  <div className="py-4 max-h-80 overflow-y-auto">
                      {timeLogModal.logs.length > 0 ? (
                          <table className="table table-sm">
                              <thead><tr><th>User</th><th>Hours</th><th>Description</th><th>Date</th></tr></thead>
                              <tbody>
                                  {timeLogModal.logs.map(log => (
                                      <tr key={log.id}>
                                          <td>{log.loggedByUsername}</td>
                                          <td>{log.hours.toFixed(2)}</td>
                                          <td>{log.description}</td>
                                          <td>{new Date(log.createdAt).toLocaleDateString()}</td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      ) : <p>No time has been logged for this task.</p>}
                  </div>
                  <div className="modal-action">
                      <button onClick={() => setTimeLogModal({isOpen: false, taskTitle: '', logs: []})} className="btn">Close</button>
                  </div>
              </div>
          </dialog>
      )}

      <ChatWidget />
    </div>
  );
}