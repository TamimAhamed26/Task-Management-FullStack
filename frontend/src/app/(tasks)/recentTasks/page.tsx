'use client';

import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import TopBar from '@/components/TopBar';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import Link from 'next/link';

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

export default function RecentTasksPage() {
  const { user, loading } = useAuthGuard();
  const [tasks, setTasks] = useState<TaskDto[]>([]);
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterProjectId, setFilterProjectId] = useState<number | undefined>();
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
  });

  const fetchData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    try {
      // Assumes backend is updated to accept pagination and return total count
      const [tasksRes, projectsRes] = await Promise.all([
        axios.get('http://localhost:3001/tasks/recent', {
          withCredentials: true,
          params: {
            projectId: filterProjectId,
            page: pagination.page,
            limit: pagination.limit,
           },
        }),
        axios.get('http://localhost:3001/tasks/projects', { withCredentials: true }),
      ]);
      // Assumes tasksRes.data is in the format { data: [], total: number }
      setTasks(tasksRes.data.data);
      setPagination(prev => ({ ...prev, total: tasksRes.data.total }));
      setProjects(projectsRes.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load recent tasks.');
    } finally {
      setIsLoading(false);
    }
  }, [user, filterProjectId, pagination.page, pagination.limit]);

  useEffect(() => {
    if (!loading && user) {
      fetchData();
    }
  }, [loading, user, fetchData]);

  // Reset page to 1 when filter changes
  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [filterProjectId]);

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };


  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center"><p>Loading...</p></div>;
  }

  const totalPages = Math.ceil(pagination.total / pagination.limit);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-200 dark:from-gray-900 p-6 md:p-10">
      <TopBar />
      <div className="card bg-white dark:bg-gray-800 shadow-2xl rounded-2xl p-6 mt-6">
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100">Recent Tasks</h1>
            <Link href="/dashboard" className="btn btn-sm btn-outline btn-primary rounded-full">
                &larr; Back to Dashboard
            </Link>
        </div>

        <div className="mb-4">
          <label className="label"><span className="label-text text-gray-700 dark:text-gray-300">Filter by Project</span></label>
          <select
            className="select select-bordered w-full max-w-xs rounded-lg"
            value={filterProjectId || ''}
            onChange={(e) => setFilterProjectId(e.target.value ? parseInt(e.target.value, 10) : undefined)}
          >
            <option value="">All Projects</option>
            {projects.map((project) => (<option key={project.id} value={project.id}>{project.name}</option>))}
          </select>
        </div>

        {isLoading ? (
          <div className="text-center p-10"><span className="loading loading-spinner loading-lg"></span></div>
        ) : error ? (
            <div role="alert" className="alert alert-error">{error}</div>
        ) : tasks.length === 0 ? (
          <p className="text-lg italic text-gray-500 dark:text-gray-400">No recent tasks found for the selected filter.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="table w-full table-zebra">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-100">
                    <th>Title</th>
                    <th>Project</th>
                    <th>Assignee</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Last Updated</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task) => (
                    <tr key={task.id} className="hover:bg-gray-50 dark:hover:bg-gray-600">
                      <td className="font-medium text-gray-900 dark:text-gray-100">{task.title}</td>
                      <td>{task.projectName || 'N/A'}</td>
                      <td>{task.assignedToUsername || 'Unassigned'}</td>
                      <td>
                        <span className={`badge ${task.priority === 'HIGH' ? 'badge-error' : task.priority === 'MEDIUM' ? 'badge-warning' : 'badge-info'}`}>
                          {task.priority}
                        </span>
                      </td>
                      <td><span className="badge badge-ghost">{task.status}</span></td>
                      <td>{new Date(task.updatedAt).toLocaleString()}</td>
                      <td>
                        <Link href={`/tasks/task/${task.id}`} className="btn btn-xs btn-outline btn-primary">
                            View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex justify-between items-center mt-6">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                    Showing {tasks.length} of {pagination.total} tasks
                </span>
                <div className="join">
                    <button
                        onClick={() => handlePageChange(pagination.page - 1)}
                        className="join-item btn"
                        disabled={pagination.page <= 1}
                    >
                        «
                    </button>
                    <button className="join-item btn">
                        Page {pagination.page} of {totalPages}
                    </button>
                    <button
                        onClick={() => handlePageChange(pagination.page + 1)}
                        className="join-item btn"
                        disabled={pagination.page >= totalPages}
                    >
                        »
                    </button>
                </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}