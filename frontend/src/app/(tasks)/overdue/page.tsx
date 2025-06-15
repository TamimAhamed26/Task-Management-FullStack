'use client';
import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import TopBar from '@/components/TopBar';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import Link from 'next/link';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

interface OverdueTaskDto {
  id: number;
  title: string;
  assigneeUsername: string;
  dueDate: string;
  priority: string;
  status: string;
  projectName?: string;
  projectId?: number;
  daysOverdue: number;
}

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
}

interface ProjectDto {
  id: number;
  name: string;
  description: string;
  ownerUsername: string;
  teamMembers: string[];
}

interface Collaborator {
  id: number;
  username: string;
}

export default function OverdueTasksPage() {
  const { user, loading, feedback } = useAuthGuard();
  const [overdueTasks, setOverdueTasks] = useState<OverdueTaskDto[]>([]);
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<{
    projectId?: number;
    priority?: string;
    status?: string;
    dueDateRange: [Date | null, Date | null];
  }>({
    projectId: undefined,
    priority: undefined,
    status: undefined,
    dueDateRange: [null, null],
  });
  const [sort, setSort] = useState<{ field: string; order: 'ASC' | 'DESC' }>({ field: 'daysOverdue', order: 'DESC' });
  const [pagination, setPagination] = useState<{ page: number; limit: number; total: number }>({
    page: 1,
    limit: 10,
    total: 0,
  });
  const [modal, setModal] = useState<{
    isOpen: boolean;
    type: 'success' | 'error';
    message: string;
  }>({ isOpen: false, type: 'success', message: '' });
  const [reassignModal, setReassignModal] = useState<{
    isOpen: boolean;
    taskId: number | null;
    taskTitle: string;
    collaboratorId?: number;
  }>({ isOpen: false, taskId: null, taskTitle: '', collaboratorId: undefined });
  const [taskModal, setTaskModal] = useState<{
    isOpen: boolean;
    task: TaskDto | null;
    error: string | null;
  }>({ isOpen: false, task: null, error: null });

  const [quickEditModal, setQuickEditModal] = useState<{
    isOpen: boolean;
    taskId: number | null;
    taskTitle: string;
    dueDate: string;
    priority: string;
  }>({ isOpen: false, taskId: null, taskTitle: '', dueDate: '', priority: 'MEDIUM' });

  const [commentModal, setCommentModal] = useState<{
    isOpen: boolean;
    taskId: number | null;
    taskTitle: string;
    comment: string;
  }>({ isOpen: false, taskId: null, taskTitle: '', comment: '' });

  const limitOptions = [10, 20, 50];

  const fetchData = useCallback(async () => {
    if (!user || user.role?.name.toUpperCase() !== 'MANAGER') return;
    setIsLoading(true);
    setError(null);

    try {
      const [tasksRes, projectsRes, collaboratorsRes] = await Promise.all([
        axios.get('http://localhost:3001/tasks/reports/overdue', {
          withCredentials: true,
          params: {
            projectId: filters.projectId,
            priority: filters.priority,
            status: filters.status,
            dueDateStart: filters.dueDateRange[0]?.toISOString().split('T')[0],
            dueDateEnd: filters.dueDateRange[1]?.toISOString().split('T')[0],
            sortField: sort.field,
            sortOrder: sort.order,
            page: pagination.page,
            limit: pagination.limit,
          },
        }),
        axios.get('http://localhost:3001/tasks/projects', { withCredentials: true }),
        axios.get('http://localhost:3001/users/collaborators', { withCredentials: true }),
      ]);
      setOverdueTasks(tasksRes.data.data);
      setPagination((prev) => ({ ...prev, total: tasksRes.data.total }));
      setProjects(projectsRes.data);
      setCollaborators(collaboratorsRes.data);
    } catch (err: any) {
      console.error('Failed to fetch data:', err);
      setError(err.response?.data?.message || 'Failed to load overdue tasks. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [user, filters, sort, pagination.page, pagination.limit]);

  const fetchTaskDetails = useCallback(async (taskId: number) => {
    setTaskModal((prev) => ({ ...prev, isOpen: true, task: null, error: null }));
    try {
      const res = await axios.get(`http://localhost:3001/tasks/task/${taskId}`, {
        withCredentials: true,
      });
      setTaskModal((prev) => ({ ...prev, task: res.data }));
    } catch (err: any) {
      console.error('Failed to fetch task details:', err);
      setTaskModal((prev) => ({
        ...prev,
        error: err.response?.data?.message || 'Failed to load task details.',
      }));
    }
  }, []);

  useEffect(() => {
    if (!loading && user && user.role?.name.toUpperCase() === 'MANAGER') {
      fetchData();
    }
  }, [loading, user, fetchData]);

  const handleFilterChange = (
    e: React.ChangeEvent<HTMLSelectElement> | [Date | null, Date | null],
    field: keyof typeof filters
  ) => {
    setPagination((prev) => ({ ...prev, page: 1 }));
    if (Array.isArray(e)) {
      setFilters((prev) => ({ ...prev, dueDateRange: e }));
    } else {
      const value = e.target.value;
      setFilters((prev) => ({
        ...prev,
        [field]: value ? (field === 'projectId' ? parseInt(value, 10) : value) : undefined,
      }));
    }
  };

  const handleSortChange = (field: string) => {
    setPagination((prev) => ({ ...prev, page: 1 }));
    setSort((prev) => ({
      field,
      order: prev.field === field && prev.order === 'ASC' ? 'DESC' : 'ASC',
    }));
  };

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const handleLimitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLimit = parseInt(e.target.value, 10);
    setPagination((prev) => ({ ...prev, page: 1, limit: newLimit }));
  };

  const handleApproveTask = async (taskId: number) => {
    try {
      await axios.patch(
        `http://localhost:3001/tasks/${taskId}/status`,
        { status: 'COMPLETED' },
        { withCredentials: true }
      );
      setModal({
        isOpen: true,
        type: 'success',
        message: 'Task approved and marked as completed!',
      });
      fetchData();
    } catch (err: any) {
      setModal({
        isOpen: true,
        type: 'error',
        message: err.response?.data?.message || 'Failed to approve task.',
      });
    }
  };

  const handleReassignTask = async () => {
    if (!reassignModal.taskId || !reassignModal.collaboratorId) return;
    try {
      await axios.patch(
        `http://localhost:3001/tasks/${reassignModal.taskId}/assign`,
        { collaboratorId: reassignModal.collaboratorId },
        { withCredentials: true }
      );
      setModal({
        isOpen: true,
        type: 'success',
        message: `Task "${reassignModal.taskTitle}" reassigned successfully!`,
      });
      setReassignModal({ isOpen: false, taskId: null, taskTitle: '', collaboratorId: undefined });
      fetchData();
    } catch (err: any) {
      setModal({
        isOpen: true,
        type: 'error',
        message: err.response?.data?.message || 'Failed to reassign task.',
      });
    }
  };
  
  const handleQuickEdit = async () => {
    if (!quickEditModal.taskId) return;
    try {
      await axios.patch(
        `http://localhost:3001/tasks/${quickEditModal.taskId}/set-deadline-priority`,
        { dueDate: quickEditModal.dueDate, priority: quickEditModal.priority },
        { withCredentials: true }
      );
      setModal({
        isOpen: true,
        type: 'success',
        message: 'Task updated successfully!',
      });
      setQuickEditModal({ isOpen: false, taskId: null, taskTitle: '', dueDate: '', priority: 'MEDIUM' });
      fetchData();
    } catch (err: any) {
      setModal({
        isOpen: true,
        type: 'error',
        message: err.response?.data?.message || 'Failed to update task.',
      });
    }
  };

  const handleAddComment = async () => {
    if (!commentModal.taskId || !commentModal.comment) return;
    try {
      await axios.post(
        `http://localhost:3001/tasks/${commentModal.taskId}/comments`,
        { content: commentModal.comment },
        { withCredentials: true }
      );
      setModal({
        isOpen: true,
        type: 'success',
        message: 'Comment added successfully!',
      });
      setCommentModal({ isOpen: false, taskId: null, taskTitle: '', comment: '' });
    } catch (err: any) {
      setModal({
        isOpen: true,
        type: 'error',
        message: err.response?.data?.message || 'Failed to add comment.',
      });
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900">
        <span className="loading loading-spinner loading-lg text-indigo-600 dark:text-indigo-400"></span>
        <p className="ml-4 text-gray-800 dark:text-gray-100 text-lg font-medium">Authenticating...</p>
      </div>
    );
  }

  if (user.role?.name.toUpperCase() !== 'MANAGER') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900 dark:to-red-800 p-6">
        <div className="alert alert-error shadow-2xl w-full max-w-lg rounded-xl">
          <div className="flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="stroke-current flex-shrink-0 h-8 w-8 text-red-600 dark:text-red-400"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="ml-2 text-lg font-bold text-red-800 dark:text-red-100">Access Denied</span>
          </div>
        </div>
        <h2 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 mt-6">
          Manager Dashboard Access Only
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mt-2">
          This page is exclusively for users with manager privileges.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-4">
          <Link href="/profile" className="btn btn-primary btn-lg rounded-full shadow-lg hover:shadow-xl transition-all duration-300">
            View Profile
          </Link>
          <button
            className="btn btn-outline btn-lg rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
            onClick={async () => {
              await fetch('http://localhost:3001/auth/logout', {
                method: 'POST',
                credentials: 'include',
              });
              window.location.href = '/login';
            }}
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-700 p-6 md:p-10 font-sans antialiased">
      <TopBar />

      {feedback && (
        <div role="alert" className="alert alert-success mb-6 rounded-xl shadow-md animate-fade-in">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="stroke-current shrink-0 h-6 w-6 text-green-600 dark:text-green-400"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="text-green-800 dark:text-green-100 font-medium">{feedback}</span>
        </div>
      )}

      {error && (
        <div role="alert" className="alert alert-error mb-6 rounded-xl shadow-md animate-fade-in">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="stroke-current shrink-0 h-6 w-6 text-red-600 dark:text-red-400"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="text-red-800 dark:text-red-100 font-medium">{error}</span>
        </div>
      )}

      <div className="card bg-white dark:bg-gray-800 shadow-2xl rounded-2xl p-6 hover:shadow-3xl transition-all duration-300">
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 mb-6">Overdue Tasks</h1>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="label">
              <span className="label-text text-gray-700 dark:text-gray-300">Project</span>
            </label>
            <select
              className="select select-bordered w-full rounded-lg"
              value={filters.projectId || ''}
              onChange={(e) => handleFilterChange(e, 'projectId')}
            >
              <option value="">All Projects</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">
              <span className="label-text text-gray-700 dark:text-gray-300">Priority</span>
            </label>
            <select
              className="select select-bordered w-full rounded-lg"
              value={filters.priority || ''}
              onChange={(e) => handleFilterChange(e, 'priority')}
            >
              <option value="">All Priorities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </div>
          <div>
            <label className="label">
              <span className="label-text text-gray-700 dark:text-gray-300">Status</span>
            </label>
            <select
              className="select select-bordered w-full rounded-lg"
              value={filters.status || ''}
              onChange={(e) => handleFilterChange(e, 'status')}
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="PENDING_APPROVAL">Pending Approval</option>
            </select>
          </div>
          <div>
            <label className="label">
              <span className="label-text text-gray-700 dark:text-gray-300">Due Date Range</span>
            </label>
            <DatePicker
              selectsRange
              startDate={filters.dueDateRange[0]}
              endDate={filters.dueDateRange[1]}
              onChange={(update) => handleFilterChange(update, 'dueDateRange')}
              isClearable
              maxDate={new Date()}
              className="input input-bordered w-full rounded-lg text-gray-900 dark:text-gray-100"
              placeholderText="Select date range"
            />
          </div>
        </div>

        {/* Pagination Limit Selector */}
        <div className="flex justify-end mb-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text text-gray-700 dark:text-gray-300">Tasks per page</span>
            </label>
            <select
              className="select select-bordered rounded-lg"
              value={pagination.limit}
              onChange={handleLimitChange}
            >
              {limitOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-10">
            <span className="loading loading-dots loading-lg text-indigo-600 dark:text-indigo-400"></span>
            <p className="mt-6 text-gray-600 dark:text-gray-100 text-lg font-medium">Loading overdue tasks...</p>
          </div>
        ) : overdueTasks.length === 0 ? (
          <p className="text-lg italic text-gray-500 dark:text-gray-400">No overdue tasks match your filters.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="table w-full table-zebra rounded-lg">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-100">
                    <th onClick={() => handleSortChange('title')} className="cursor-pointer">
                      Title {sort.field === 'title' && (sort.order === 'ASC' ? '↑' : '↓')}
                    </th>
                    <th onClick={() => handleSortChange('assigneeUsername')} className="cursor-pointer">
                      Assignee {sort.field === 'assigneeUsername' && (sort.order === 'ASC' ? '↑' : '↓')}
                    </th>
                    <th onClick={() => handleSortChange('dueDate')} className="cursor-pointer">
                      Due Date {sort.field === 'dueDate' && (sort.order === 'ASC' ? '↑' : '↓')}
                    </th>
                    <th onClick={() => handleSortChange('daysOverdue')} className="cursor-pointer">
                      Days Overdue {sort.field === 'daysOverdue' && (sort.order === 'ASC' ? '↑' : '↓')}
                    </th>
                    <th onClick={() => handleSortChange('priority')} className="cursor-pointer">
                      Priority {sort.field === 'priority' && (sort.order === 'ASC' ? '↑' : '↓')}
                    </th>
                    <th onClick={() => handleSortChange('status')} className="cursor-pointer">
                      Status {sort.field === 'status' && (sort.order === 'ASC' ? '↑' : '↓')}
                    </th>
                    <th onClick={() => handleSortChange('projectName')} className="cursor-pointer">
                      Project {sort.field === 'projectName' && (sort.order === 'ASC' ? '↑' : '↓')}
                    </th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {overdueTasks.map((task) => (
                    <tr key={task.id} className="hover:bg-gray-50 dark:hover:bg-gray-600">
                      <td className="font-medium text-gray-900 dark:text-gray-100">
                        <Link href={`/tasks/task/${task.id}`} className="hover:underline">
                          {task.title}
                        </Link>
                      </td>
                      <td className="text-gray-900 dark:text-gray-100">{task.assigneeUsername || 'Unassigned'}</td>
                      <td className="text-gray-900 dark:text-gray-100">
                        {new Date(task.dueDate).toLocaleDateString()}
                      </td>
                      <td className={`text-center font-bold ${task.daysOverdue > 7 ? 'text-red-500' : 'text-gray-900 dark:text-gray-100'}`}>
                        {task.daysOverdue}
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            task.priority === 'HIGH'
                              ? 'badge-error'
                              : task.priority === 'MEDIUM'
                              ? 'badge-warning'
                              : 'badge-info'
                          } badge-lg`}
                        >
                          {task.priority}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            task.status === 'PENDING_APPROVAL' ? 'badge-warning' : 'badge-info'
                          } badge-lg`}
                        >
                          {task.status}
                        </span>
                      </td>
                      <td className="text-gray-900 dark:text-gray-100">{task.projectName || 'N/A'}</td>
                      <td>
                        <div className="flex flex-wrap gap-2">
                          {task.status === 'PENDING_APPROVAL' && (
                            <button
                              onClick={() => handleApproveTask(task.id)}
                              className="btn btn-xs btn-success text-white rounded-full"
                            >
                              Approve
                            </button>
                          )}
                          <button
                            onClick={() =>
                              setQuickEditModal({
                                isOpen: true,
                                taskId: task.id,
                                taskTitle: task.title,
                                dueDate: new Date(task.dueDate).toISOString().split('T')[0],
                                priority: task.priority,
                              })
                            }
                            className="btn btn-xs btn-info text-white rounded-full"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() =>
                              setCommentModal({
                                isOpen: true,
                                taskId: task.id,
                                taskTitle: task.title,
                                comment: '',
                              })
                            }
                            className="btn btn-xs btn-secondary rounded-full"
                          >
                            Comment
                          </button>
                          <button
                            onClick={() =>
                              setReassignModal({
                                isOpen: true,
                                taskId: task.id,
                                taskTitle: task.title,
                                collaboratorId: undefined,
                              })
                            }
                            className="btn btn-xs btn-primary rounded-full"
                          >
                            Reassign
                          </button>
                          <button
                            onClick={() => fetchTaskDetails(task.id)}
                            className="btn btn-xs btn-outline rounded-full"
                          >
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination Controls */}
            <div className="flex justify-between items-center mt-4">
              <button
                disabled={pagination.page <= 1}
                onClick={() => handlePageChange(pagination.page - 1)}
                className="btn btn-sm btn-primary rounded-full"
              >
                Previous
              </button>
              <span className="text-gray-700 dark:text-gray-300">
                Page {pagination.page} of {Math.ceil(pagination.total / pagination.limit)}
              </span>
              <button
                disabled={pagination.page * pagination.limit >= pagination.total}
                onClick={() => handlePageChange(pagination.page + 1)}
                className="btn btn-sm btn-primary rounded-full"
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>

      {/* Quick Edit Modal */}
      {quickEditModal.isOpen && (
        <dialog id="quick_edit_modal" className="modal modal-open">
          <div className="modal-box bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-md">
            <h3 className="font-extrabold text-2xl text-gray-900 dark:text-gray-100 mb-6">
              Quick Edit: {quickEditModal.taskTitle}
            </h3>
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium text-gray-700 dark:text-gray-300">Due Date</span>
              </label>
              <input
                type="date"
                className="input input-bordered w-full rounded-lg"
                value={quickEditModal.dueDate}
                onChange={(e) => setQuickEditModal(prev => ({ ...prev, dueDate: e.target.value }))}
              />
            </div>
            <div className="form-control mt-4">
              <label className="label">
                <span className="label-text font-medium text-gray-700 dark:text-gray-300">Priority</span>
              </label>
              <select
                className="select select-bordered w-full rounded-lg"
                value={quickEditModal.priority}
                onChange={(e) => setQuickEditModal(prev => ({ ...prev, priority: e.target.value }))}
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>
            <div className="modal-action flex justify-end gap-4 mt-6">
              <button onClick={handleQuickEdit} className="btn btn-primary rounded-full">
                Save Changes
              </button>
              <button
                onClick={() => setQuickEditModal({ isOpen: false, taskId: null, taskTitle: '', dueDate: '', priority: 'MEDIUM' })}
                className="btn btn-outline rounded-full"
              >
                Cancel
              </button>
            </div>
          </div>
        </dialog>
      )}

      {/* Comment Modal */}
      {commentModal.isOpen && (
        <dialog id="comment_modal" className="modal modal-open">
          <div className="modal-box bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-md">
            <h3 className="font-extrabold text-2xl text-gray-900 dark:text-gray-100 mb-6">
              Add Comment to: {commentModal.taskTitle}
            </h3>
            <div className="form-control">
              <textarea
                className="textarea textarea-bordered w-full rounded-lg"
                rows={4}
                placeholder="Type your status update request or comment..."
                value={commentModal.comment}
                onChange={(e) => setCommentModal(prev => ({ ...prev, comment: e.target.value }))}
              ></textarea>
            </div>
            <div className="modal-action flex justify-end gap-4 mt-6">
              <button onClick={handleAddComment} className="btn btn-primary rounded-full" disabled={!commentModal.comment}>
                Add Comment
              </button>
              <button
                onClick={() => setCommentModal({ isOpen: false, taskId: null, taskTitle: '', comment: '' })}
                className="btn btn-outline rounded-full"
              >
                Cancel
              </button>
            </div>
          </div>
        </dialog>
      )}

      {/* Reassign Modal */}
      {reassignModal.isOpen && (
        <dialog id="reassign_modal" className="modal modal-open">
          <div className="modal-box bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-md">
            <h3 className="font-extrabold text-2xl text-gray-900 dark:text-gray-100 mb-6">
              Reassign Task: {reassignModal.taskTitle}
            </h3>
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium text-gray-700 dark:text-gray-300">
                  Select Collaborator
                </span>
              </label>
              <select
                className="select select-bordered w-full rounded-lg"
                value={reassignModal.collaboratorId || ''}
                onChange={(e) =>
                  setReassignModal((prev) => ({
                    ...prev,
                    collaboratorId: e.target.value ? parseInt(e.target.value, 10) : undefined,
                  }))
                }
              >
                <option value="">Select a collaborator</option>
                {collaborators.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.username} (ID: {c.id})
                  </option>
                ))}
              </select>
            </div>
            <div className="modal-action flex justify-end gap-4 mt-6">
              <button
                onClick={handleReassignTask}
                className="btn btn-primary rounded-full"
                disabled={!reassignModal.collaboratorId}
              >
                Reassign
              </button>
              <button
                onClick={() =>
                  setReassignModal({
                    isOpen: false,
                    taskId: null,
                    taskTitle: '',
                    collaboratorId: undefined,
                  })
                }
                className="btn btn-outline rounded-full"
              >
                Cancel
              </button>
            </div>
          </div>
        </dialog>
      )}

      {/* Task Details Modal */}
      {taskModal.isOpen && (
        <dialog id="task_modal" className="modal modal-open">
          <div className="modal-box bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-lg">
            <h3 className="font-extrabold text-2xl text-gray-900 dark:text-gray-100 mb-6">
              Task Details
            </h3>
            {taskModal.error ? (
              <div className="alert alert-error mb-4 rounded-lg">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="stroke-current shrink-0 h-6 w-6 text-red-600"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>{taskModal.error}</span>
              </div>
            ) : taskModal.task ? (
              <div className="space-y-4">
                <div>
                  <label className="label-text font-medium text-gray-700 dark:text-gray-300">
                    Title
                  </label>
                  <p className="text-gray-900 dark:text-gray-100">{taskModal.task.title}</p>
                </div>
                <div>
                  <label className="label-text font-medium text-gray-700 dark:text-gray-300">
                    Description
                  </label>
                  <p className="text-gray-900 dark:text-gray-100">
                    {taskModal.task.description || 'No description provided.'}
                  </p>
                </div>
                <div>
                  <label className="label-text font-medium text-gray-700 dark:text-gray-300">
                    Assignee
                  </label>
                  <p className="text-gray-900 dark:text-gray-100">
                    {taskModal.task.assignedToUsername || 'Unassigned'}
                  </p>
                </div>
                <div>
                  <label className="label-text font-medium text-gray-700 dark:text-gray-300">
                    Due Date
                  </label>
                  <p className="text-gray-900 dark:text-gray-100">
                    {taskModal.task.dueDate
                      ? new Date(taskModal.task.dueDate).toLocaleDateString()
                      : 'No due date'}
                  </p>
                </div>
                <div>
                  <label className="label-text font-medium text-gray-700 dark:text-gray-300">
                    Priority
                  </label>
                  <p className="text-gray-900 dark:text-gray-100">{taskModal.task.priority}</p>
                </div>
                <div>
                  <label className="label-text font-medium text-gray-700 dark:text-gray-300">
                    Status
                  </label>
                  <p className="text-gray-900 dark:text-gray-100">{taskModal.task.status}</p>
                </div>
                <div>
                  <label className="label-text font-medium text-gray-700 dark:text-gray-300">
                    Created By
                  </label>
                  <p className="text-gray-900 dark:text-gray-100">
                    {taskModal.task.createdByUsername || 'Unknown'}
                  </p>
                </div>
                <div>
                  <label className="label-text font-medium text-gray-700 dark:text-gray-300">
                    Approved By
                  </label>
                  <p className="text-gray-900 dark:text-gray-100">
                    {taskModal.task.approvedByUsername || 'Not approved'}
                  </p>
                </div>
                <div>
                  <label className="label-text font-medium text-gray-700 dark:text-gray-300">
                    Category
                  </label>
                  <p className="text-gray-900 dark:text-gray-100">
                    {taskModal.task.category || 'No category'}
                  </p>
                </div>
                <div>
                  <label className="label-text font-medium text-gray-700 dark:text-gray-300">
                    Completed
                  </label>
                  <p className="text-gray-900 dark:text-gray-100">
                    {taskModal.task.isCompleted ? 'Yes' : 'No'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex justify-center">
                <span className="loading loading-spinner text-indigo-600 dark:text-indigo-400"></span>
              </div>
            )}
            <div className="modal-action flex justify-end mt-6">
              <button
                onClick={() => setTaskModal({ isOpen: false, task: null, error: null })}
                className="btn btn-outline rounded-full"
              >
                Close
              </button>
            </div>
          </div>
        </dialog>
      )}

      {/* Feedback Modal */}
      {modal.isOpen && (
        <dialog className="modal modal-open">
          <div className="modal-box bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl text-center">
            <h3
              className={`font-bold text-lg ${
                modal.type === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              }`}
            >
              {modal.type === 'success' ? 'Success!' : 'Error!'}
            </h3>
            <p className="py-4 text-gray-900 dark:text-gray-100">{modal.message}</p>
            <div className="modal-action flex justify-center">
              <button
                className={`btn ${modal.type === 'success' ? 'btn-success' : 'btn-error'}`}
                onClick={() => setModal({ isOpen: false, type: 'success', message: '' })}
              >
                OK
              </button>
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
}