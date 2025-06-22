// app/projects/[projectId]/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useParams } from 'next/navigation';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import TopBar from '@/components/TopBar';
import Link from 'next/link';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);
interface TaskDto {
  id: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  dueDate: string;
  createdByUsername: string;
  assignedToUsername: string;
  approvedByUsername: string;
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
  projectId?: number;
  projectName?: string;
}

interface ProjectDto {
  id: number;
  name: string;
  description: string;
  ownerUsername: string;
  teamMembers: string[];
}

interface ManagerTeamOverviewDto {
  totalTasksForTeams?: number;
  overdueTasksForTeams?: number;
  teamStatusSummaries?: TeamStatusSummary[];
  teamTotalHoursLogged?: TeamTotalHoursLogged[];
  teamCompletionRates?: TeamCompletionRate[];
  message?: string;
}

interface TeamStatusSummary {
  teamId: number;
  teamName: string;
  status: string;
  count: number;
}

interface TeamTotalHoursLogged {
  teamId: number;
  teamName: string;
  totalHours: number;
}

interface TeamCompletionRate {
  teamId: number;
  teamName: string;
  completionRate: number;
  completedTasks: number;
  totalTasks: number;
}

interface CreateTaskDto {
  title: string;
  description?: string;
  deadline?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' ;
  assignedToId?: number;
  projectId: number;
}

interface TaskPrioritySummaryDto {
  priority: string;
  count: number;
}

interface CollaboratorDto {
  id: number;
  username: string;
}

interface TaskCompletionRateDto {
  completionRate: number;
  completedTasks: number;
  totalTasks: number;
}

export default function ProjectDetailPage() {
  const { user, loading, feedback } = useAuthGuard();
  const params = useParams();
  const projectId = params.projectId ? parseInt(params.projectId as string, 10) : null;

  const [project, setProject] = useState<ProjectDto | null>(null);
  const [projectTasks, setProjectTasks] = useState<TaskDto[]>([]);
  const [projectTasksTotal, setProjectTasksTotal] = useState(0);
  const [projectTasksPage, setProjectTasksPage] = useState(1);
  const [projectTasksLimit, setProjectTasksLimit] = useState(10);
  const [projectTeamOverview, setProjectTeamOverview] = useState<ManagerTeamOverviewDto | null>(null);
  const [projectPrioritySummary, setProjectPrioritySummary] = useState<TaskPrioritySummaryDto[]>([]);
  const [projectCompletionRate, setProjectCompletionRate] = useState<TaskCompletionRateDto | null>(null);
  const [projectOverdueTasks, setProjectOverdueTasks] = useState<TaskDto[]>([]); // Using TaskDto for simplicity
  const [projectOverdueTasksTotal, setProjectOverdueTasksTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // For Create New Task Modal
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [newTask, setNewTask] = useState<CreateTaskDto>({
    title: '',
    description: '',
    deadline: '',
    priority: 'MEDIUM',
    assignedToId: undefined,
    projectId: projectId || 0, // Pre-fill project ID
  });
  const [collaborators, setCollaborators] = useState<CollaboratorDto[]>([]);
  const [createTaskError, setCreateTaskError] = useState<string | null>(null);
  const [createTaskSuccess, setCreateTaskSuccess] = useState<string | null>(null);
  const [taskKeyword, setTaskKeyword] = useState<string>('');
  const [taskStatusFilter, setTaskStatusFilter] = useState<string>('');
  const [taskPriorityFilter, setTaskPriorityFilter] = useState<string>('');
  const [taskAssignedToFilter, setTaskAssignedToFilter] = useState<string | undefined>(undefined);
  const [applyFiltersTrigger, setApplyFiltersTrigger] = useState(0);

  const [modal, setModal] = useState<{
    isOpen: boolean;
    type: 'success' | 'error';
    message: string;
  }>({ isOpen: false, type: 'success', message: '' });

  const fetchProjectData = useCallback(async () => {
    if (!projectId || !user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    let fetchErrors: string[] = [];

    const fetchEndpoint = async (url: string, setData: (data: any) => void, errorMsg: string) => {
      try {
        const response = await axios.get(url, { withCredentials: true });
        setData(response.data);
      } catch (err: any) {
        console.error(`${errorMsg}:`, err);
        if (err.response?.status === 404) {
          setError('Project not found or you do not have access.');
        } else if (err.response?.status === 403) {
          setError('You do not have permission to view this project.');
        } else {
          fetchErrors.push(errorMsg);
        }
      }
    };

    // Fetch project details
    try {
      const response = await axios.get(`http://localhost:3001/tasks/projects?userId=${user.id}`, { withCredentials: true });
      const foundProject = response.data.find((p: ProjectDto) => p.id === projectId);
      if (foundProject) {
        setProject(foundProject);
      } else {
        setError('Project not found or you do not have access.');
        setIsLoading(false);
        return;
      }
    } catch (err: any) {
      console.error('Failed to load project details:', err);
      setError('Failed to load project details.');
      setIsLoading(false);
      return;
    }

    // Fetch project-specific tasks with filters
    let projectTasksUrl = `http://localhost:3001/tasks/projects/${projectId}/tasks?page=${projectTasksPage}&limit=${projectTasksLimit}`;
    if (taskKeyword) projectTasksUrl += `&keyword=${encodeURIComponent(taskKeyword)}`;
    if (taskStatusFilter) projectTasksUrl += `&status=${taskStatusFilter}`;
    if (taskPriorityFilter) projectTasksUrl += `&priority=${taskPriorityFilter}`;
    if (taskAssignedToFilter) projectTasksUrl += `&assignedToUsername=${encodeURIComponent(taskAssignedToFilter)}`;

    await Promise.all([
      fetchEndpoint(`http://localhost:3001/tasks/manager/team-overview?projectId=${projectId}`, setProjectTeamOverview, 'Failed to load project team overview'),
      fetchEndpoint(`http://localhost:3001/tasks/summary/by-priority?projectId=${projectId}`, setProjectPrioritySummary, 'Failed to load project priority summary'),
      fetchEndpoint(`http://localhost:3001/progress/task-completion-rate?projectId=${projectId}`, setProjectCompletionRate, 'Failed to load project completion rate'),
      fetchEndpoint(`http://localhost:3001/tasks/reports/overdue?projectId=${projectId}&page=1&limit=5`, (response) => {
        setProjectOverdueTasks(response.data || []);
        setProjectOverdueTasksTotal(response.total || 0);
      }, 'Failed to load project overdue tasks'),
      fetchEndpoint(projectTasksUrl, (data) => {
        setProjectTasks(data.data || []);
        setProjectTasksTotal(data.total || 0);
      }, 'Failed to load project tasks'),
      axios.get('http://localhost:3001/users/collaborators', { withCredentials: true })
        .then(response => setCollaborators(response.data))
        .catch(err => console.error('Failed to load collaborators for task creation:', err))
    ]);
    if (fetchErrors.length > 0) {
      setError(`Some project data could not be loaded: ${fetchErrors.join('; ')}. Please ensure your backend is running and all endpoints are accessible.`);
    }
    setIsLoading(false);
  }, [projectId, user, projectTasksPage, projectTasksLimit, applyFiltersTrigger]);

  useEffect(() => {
    if (!loading && user) {
      fetchProjectData();
    }
  }, [loading, user, fetchProjectData]); 

  const handleNewTaskChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewTask(prev => ({
      ...prev,
      [name]: name === 'assignedToId' ? (value ? parseInt(value, 10) : undefined) : value,
    }));
  }, []);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateTaskError(null);
    setCreateTaskSuccess(null);
    if (!newTask.title || !newTask.projectId) {
      setCreateTaskError('Task title and Project are required.');
      return;
    }

    try {
      await axios.post('http://localhost:3001/tasks', newTask, { withCredentials: true });
      setCreateTaskSuccess('Task created successfully!');
      setIsCreateTaskModalOpen(false);
      setNewTask(prev => ({
        ...prev,
        title: '',
        description: '',
        deadline: '',
        priority: 'MEDIUM',
        assignedToId: undefined,
      }));
      await fetchProjectData(); 
      setModal({
        isOpen: true,
        type: 'success',
        message: 'Task created successfully!',
      });
    } catch (err: any) {
      console.error('Failed to create task:', err);
      setModal({
        isOpen: true,
        type: 'error',
        message: err.response?.data?.message || 'Failed to create task. Please try again.',
      });
    }
  };

  const handleApproveTask = async (taskId: number) => {
    try {
      await axios.patch(`http://localhost:3001/tasks/${taskId}/status`, { status: 'COMPLETED' }, { withCredentials: true });
      await fetchProjectData();
      setModal({
        isOpen: true,
        type: 'success',
        message: 'Task approved and marked as completed!',
      });
    } catch (err: any) {
      console.error('Failed to approve task:', err);
      setModal({
        isOpen: true,
        type: 'error',
        message: err.response?.data?.message || 'Failed to approve task. Please try again.',
      });
    }
  };


  const priorityChartData = {
    labels: projectPrioritySummary.map(p => p.priority),
    datasets: [{
      data: projectPrioritySummary.map(p => p.count),
      backgroundColor: [
        'rgba(239, 68, 68, 0.7)', // HIGH
        'rgba(251, 191, 36, 0.7)', // MEDIUM
        'rgba(59, 130, 246, 0.7)', // LOW
      ],
      borderColor: [
        'rgba(239, 68, 68, 1)',
        'rgba(251, 191, 36, 1)',
        'rgba(59, 130, 246, 1)',
      ],
      borderWidth: 1,
    }],
  };
  const priorityChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          font: {
            size: 14,
            family: 'Inter, sans-serif'
          }
        }
      },
      title: {
        display: true,
        text: `Task Priority Breakdown for ${project?.name || 'Project'}`,
        font: {
          size: 20,
          family: 'Inter, sans-serif'
        }
      },
      tooltip: {
        backgroundColor: 'rgba(55, 48, 163, 0.9)',
        titleFont: { size: 14 },
        bodyFont: { size: 12 },
      },
    },
  };

  const teamOverviewData = projectTeamOverview; // Using a shorter variable name

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
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current flex-shrink-0 h-8 w-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="ml-2 text-lg font-bold text-red-800 dark:text-red-100">Access Denied</span>
          </div>
        </div>
        <h2 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 mt-6">Manager Dashboard Access Only</h2>
        <p className="text-gray-600 dark:text-gray-300 mt-2">This page is exclusively for users with manager privileges.</p>
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-gray-800 rounded-2xl shadow-xl min-h-[400px]">
        <span className="loading loading-dots loading-lg text-indigo-600 dark:text-indigo-400"></span>
        <p className="mt-6 text-gray-600 dark:text-gray-100 text-lg font-medium">Loading project details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-red-50 dark:bg-red-900 p-6">
        <div role="alert" className="alert alert-error shadow-2xl w-full max-w-lg rounded-xl">
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current flex-shrink-0 h-8 w-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="ml-2 text-lg font-bold text-red-800 dark:text-red-100">Error!</span>
          </div>
          <span className="text-red-800 dark:text-red-100 font-medium">{error}</span>
        </div>
        <Link href="/dashboard" className="btn btn-primary mt-6">Go to Dashboard</Link>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-6">
        <h2 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 mt-6">Project Not Found</h2>
        <p className="text-gray-600 dark:text-gray-300 mt-2">The project you are looking for does not exist or you do not have access.</p>
        <Link href="/dashboard" className="btn btn-primary mt-6">Go to Dashboard</Link>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-700 p-6 md:p-10 font-sans antialiased">
      <TopBar />

      {feedback && (
        <div role="alert" className={`alert alert-success mb-6 rounded-xl shadow-md animate-fade-in`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-green-800 dark:text-green-100 font-medium">{feedback}</span>
        </div>
      )}

      {/* Project Overview */}
      <div className="card bg-white dark:bg-gray-800 shadow-2xl rounded-2xl p-6 mb-8">
        <h1 className="card-title text-4xl font-extrabold text-gray-900 dark:text-gray-100 mb-4">{project.name}</h1>
        <p className="text-lg text-gray-700 dark:text-gray-300 mb-2">{project.description}</p>
        <p className="text-md text-gray-600 dark:text-gray-400">Owner: <span className="font-semibold">{project.ownerUsername}</span></p>
        <p className="text-md text-gray-600 dark:text-gray-400">Team Members: <span className="font-semibold">{project.teamMembers.join(', ') || 'None'}</span></p>

        {/* Project-specific quick stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <div className="stat bg-blue-50 dark:bg-blue-900 rounded-xl p-4">
            <div className="stat-figure text-blue-600 dark:text-blue-400">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-8 h-8 stroke-current"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7m-4 0V5a2 2 0 00-2-2H9a2 2 0 00-2 2v2m-4 0h18"></path></svg>
            </div>
            <div className="stat-title text-gray-700 dark:text-gray-300">Total Project Tasks</div>
            <div className="stat-value text-blue-800 dark:text-blue-100">{projectTasksTotal}</div>
          </div>
          <div className="stat bg-red-50 dark:bg-red-900 rounded-xl p-4">
            <div className="stat-figure text-red-600 dark:text-red-400">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-8 h-8 stroke-current"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </div>
            <div className="stat-title text-gray-700 dark:text-gray-300">Overdue Tasks</div>
            <div className="stat-value text-red-800 dark:text-red-100">{projectOverdueTasksTotal}</div>
          </div>
          <div className="stat bg-green-50 dark:bg-green-900 rounded-xl p-4">
            <div className="stat-figure text-green-600 dark:text-green-400">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-8 h-8 stroke-current"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </div>
            <div className="stat-title text-gray-700 dark:text-gray-300">Completion Rate</div>
            <div className="stat-value text-green-800 dark:text-green-100">{projectCompletionRate?.completionRate.toFixed(2) || 0}%</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Project Team Overview */}
        <div className="card bg-gradient-to-br from-blue-600 to-blue-800 text-white dark:text-gray-100 shadow-2xl rounded-2xl p-6">
            <h2 className="card-title text-2xl font-extrabold mb-4">
            Project {project?.name || ''} Team Overview
            </h2>
          {teamOverviewData?.message ? (
            <p className="text-lg italic mt-4">{teamOverviewData.message}</p>
          ) : (
            <>
              <p className="text-xl">Total Tasks for Project Teams: <span className="font-extrabold text-3xl">{teamOverviewData?.totalTasksForTeams || 0}</span></p>
              <p className="text-xl">Overdue Tasks for Project Teams: <span className="font-extrabold text-3xl text-rose-300">{teamOverviewData?.overdueTasksForTeams || 0}</span></p>

              <div className="mt-4">
                <h3 className="text-lg font-bold">Team Status Summaries:</h3>
                {teamOverviewData?.teamStatusSummaries && teamOverviewData.teamStatusSummaries.length > 0 ? (
                  <ul className="list-disc list-inside text-lg">
                    {teamOverviewData.teamStatusSummaries.map((summary, idx) => (
                      <li key={idx}>Team: {summary.teamName || 'N/A'} - {summary.status}: {summary.count}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="italic text-gray-200">No status summaries available for this project's teams.</p>
                )}
              </div>

              <div className="mt-4">
                <h3 className="text-lg font-bold">Team Total Hours Logged:</h3>
                {teamOverviewData?.teamTotalHoursLogged && teamOverviewData.teamTotalHoursLogged.length > 0 ? (
                  <ul className="list-disc list-inside text-lg">
                    {teamOverviewData.teamTotalHoursLogged.map((log, idx) => (
                      <li key={idx}>Team: {log.teamName || 'N/A'} - {log.totalHours} hours</li>
                    ))}
                  </ul>
                ) : (
                  <p className="italic text-gray-200">No time logs available for this project's teams.</p>
                )}
              </div>

              <div className="mt-4">
                <h3 className="text-lg font-bold">Team Completion Rates:</h3>
                {teamOverviewData?.teamCompletionRates && teamOverviewData.teamCompletionRates.length > 0 ? (
                  <ul className="list-disc list-inside text-lg">
                    {teamOverviewData.teamCompletionRates.map((rate, idx) => (
                      <li key={idx}>Team: {rate.teamName || 'N/A'} - {rate.completionRate}% ({rate.completedTasks}/{rate.totalTasks})</li>
                    ))}
                  </ul>
                ) : (
                  <p className="italic text-gray-200">No completion rates available for this project's teams.</p>
                )}
              </div>
            </>
          )}
          <div className="card-actions justify-end mt-6">
            <Link href={`/projects/${projectId}/manage-team`} className="btn btn-outline btn-primary text-white dark:text-gray-100 border-white/80 hover:bg-white hover:text-blue-600 rounded-full">
              Manage Team
            </Link>
          </div>
        </div>

        {/* Task Priority Breakdown for Project */}
        <div className="card bg-white dark:bg-gray-800 shadow-2xl rounded-2xl p-6">
          <div className="card-body">
            <h2 className="card-title text-2xl font-extrabold text-gray-900 dark:text-gray-100 mb-4">Task Priority Breakdown</h2>
            {projectPrioritySummary.length === 0 ? (
              <p className="text-lg italic text-gray-500 dark:text-gray-400 mt-4">No priority data available for this project.</p>
            ) : (
              <div className="h-64 w-full flex justify-center">
                <Pie data={priorityChartData} options={priorityChartOptions} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create New Task Button (Project-Specific) */}
      <div className="flex justify-center mt-10 mb-8">
        <button
          onClick={() => setIsCreateTaskModalOpen(true)}
          className="btn btn-lg btn-accent bg-gradient-to-r from-purple-500 to-pink-500 text-white dark:text-gray-100 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 rounded-full"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6 mr-2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Create New Task for {project.name}
        </button>
      </div>

      {/* Task List for Project */}
      <div className="card bg-white dark:bg-gray-800 shadow-2xl rounded-2xl p-6">
        <h2 className="card-title text-2xl font-extrabold text-gray-900 dark:text-gray-100 mb-4">Tasks in {project.name}</h2>
        {/* Task Search/Filter/Sort */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <input
            type="text"
            placeholder="Search by keyword"
            className="input input-bordered w-full rounded-lg text-gray-900 dark:text-gray-100 dark:bg-gray-700"
            value={taskKeyword}
            onChange={(e) => setTaskKeyword(e.target.value)}
          />
          <select
            className="select select-bordered w-full rounded-lg text-gray-900 dark:text-gray-100 dark:bg-gray-700"
            value={taskStatusFilter}
            onChange={(e) => setTaskStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="PENDING_APPROVAL">Pending Approval</option>
            <option value="COMPLETED">Completed</option>
            <option value="REJECTED">Rejected</option>
          </select>
          <select
            className="select select-bordered w-full rounded-lg text-gray-900 dark:text-gray-100 dark:bg-gray-700"
            value={taskPriorityFilter}
            onChange={(e) => setTaskPriorityFilter(e.target.value)}
          >
            <option value="">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
          <select
            className="select select-bordered w-full rounded-lg text-gray-900 dark:text-gray-100 dark:bg-gray-700"
            value={taskAssignedToFilter || ''}
            onChange={(e) => setTaskAssignedToFilter(e.target.value || undefined)}
          >
            <option value="">All Assignees</option>
            {collaborators.map(c => (
              <option key={c.id} value={c.username}>
                {c.username}
              </option>
            ))}
          </select>
           <button onClick={() => setApplyFiltersTrigger(prev => prev + 1)} className="btn btn-primary rounded-full md:col-span-1">Apply Filters</button>
        </div>


        {projectTasks.length === 0 ? (
          <p className="text-lg italic text-gray-500 dark:text-gray-400 mt-4">No tasks found for this project with the selected filters.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="table w-full table-zebra rounded-lg">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-100">
                    <th className="text-left">Title</th>
                    <th className="text-left">Status</th>
                    <th className="text-left">Priority</th>
                    <th className="text-left">Assignee</th>
                    <th className="text-left">Due Date</th>
                    <th className="text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {projectTasks.map(task => (
                    <tr key={task.id} className="hover:bg-gray-50 dark:hover:bg-gray-600">
                      <td className="font-medium text-gray-900 dark:text-gray-100">{task.title}</td>
                      <td><span className={`badge ${
                        task.status === 'COMPLETED' ? 'badge-success' :
                        task.status === 'PENDING_APPROVAL' ? 'badge-info' :
                        task.status === 'REJECTED' ? 'badge-error' :
                        'badge-warning'
                      }`}>{task.status}</span></td>
                      <td>{task.priority}</td>
                      <td>{task.assignedToUsername || 'N/A'}</td>
                      <td>{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'N/A'}</td>
                      <td>
                        <Link href={`/tasks/${task.id}`} className="btn btn-ghost btn-xs">Details</Link>
                        {task.status === 'PENDING_APPROVAL' && user.role?.name.toUpperCase() === 'MANAGER' && (
                          <button
                            onClick={() => handleApproveTask(task.id)}
                            className="btn btn-sm btn-success text-white rounded-full ml-2"
                          >
                            Approve
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {projectTasksTotal > projectTasksLimit && (
              <div className="flex justify-center mt-4">
                <div className="join">
                  <button
                    className="join-item btn"
                    onClick={() => setProjectTasksPage(prev => Math.max(1, prev - 1))}
                    disabled={projectTasksPage === 1}
                  >
                    «
                  </button>
                  <button className="join-item btn">Page {projectTasksPage}</button>
                  <button
                    className="join-item btn"
                    onClick={() => setProjectTasksPage(prev => prev + 1)}
                    disabled={projectTasksPage * projectTasksLimit >= projectTasksTotal}
                  >
                    »
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Task Modal */}
      {isCreateTaskModalOpen && (
        <dialog id="create_task_modal" className="modal modal-open">
          <div className="modal-box bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-lg">
            <h3 className="font-extrabold text-3xl text-gray-900 dark:text-gray-100 mb-6">Create New Task for {project?.name}</h3>
            <form onSubmit={handleCreateTask} className="space-y-6">
              <div>
                <label className="label">
                  <span className="label-text font-medium text-gray-700 dark:text-gray-300">Title</span>
                </label>
                <input
                  type="text"
                  name="title"
                  placeholder="Task Title"
                  className="input input-bordered w-full rounded-lg focus:ring-2 focus:ring-indigo-500"
                  value={newTask.title}
                  onChange={handleNewTaskChange}
                  required
                />
              </div>
              <div>
                <label className="label">
                  <span className="label-text font-medium text-gray-700 dark:text-gray-300">Description (Optional)</span>
                </label>
                <textarea
                  name="description"
                  placeholder="Task Description"
                  className="textarea textarea-bordered w-full rounded-lg focus:ring-2 focus:ring-indigo-500"
                  value={newTask.description}
                  onChange={handleNewTaskChange}
                ></textarea>
              </div>
              <div>
                <label className="label">
                  <span className="label-text font-medium text-gray-700 dark:text-gray-300">Deadline (Optional)</span>
                </label>
                <input
                  type="date"
                  name="deadline"
                  className="input input-bordered w-full rounded-lg focus:ring-2 focus:ring-indigo-500"
                  value={newTask.deadline}
                  onChange={handleNewTaskChange}
                />
              </div>
              <div>
                <label className="label">
                  <span className="label-text font-medium text-gray-700 dark:text-gray-300">Priority (Optional)</span>
                </label>
                <select
                  name="priority"
                  className="select select-bordered w-full rounded-lg focus:ring-2 focus:ring-indigo-500"
                  value={newTask.priority}
                  onChange={handleNewTaskChange}
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
              <div>
                <label className="label">
                  <span className="label-text font-medium text-gray-700 dark:text-gray-300">Assign To (Optional)</span>
                </label>
                <select
                  name="assignedToId"
                  className="select select-bordered w-full rounded-lg focus:ring-2 focus:ring-indigo-500"
                  value={newTask.assignedToId || ''}
                  onChange={handleNewTaskChange}
                >
                  <option value="">Unassigned</option>
                  {collaborators.map(collaborator => (
                    <option key={collaborator.id} value={collaborator.id}>
                      {collaborator.username}
                    </option>
                  ))}
                </select>
              </div>
              <input type="hidden" name="projectId" value={newTask.projectId} />

              {createTaskError && (
                <div role="alert" className="alert alert-error rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-red-800 dark:text-red-100">{createTaskError}</span>
                </div>
              )}
              {createTaskSuccess && (
                <div role="alert" className="alert alert-success rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-green-800 dark:text-green-100">{createTaskSuccess}</span>
                </div>
              )}

              <div className="modal-action flex justify-end gap-4">
                <button type="submit" className="btn btn-primary rounded-full shadow-md hover:shadow-lg">
                  Create Task
                </button>
                <button
                  type="button"
                  className="btn btn-outline rounded-full"
                  onClick={() => {
                    setIsCreateTaskModalOpen(false);
                    setCreateTaskError(null);
                    setCreateTaskSuccess(null);
                    setNewTask(prev => ({
                      ...prev,
                      title: '',
                      description: '',
                      deadline: '',
                      priority: 'MEDIUM',
                      assignedToId: undefined,
                    }));
                  }}
                >
                  Close
                </button>
              </div>
            </form>
          </div>
        </dialog>
      )}

      {/* Feedback Modal */}
      {modal.isOpen && (
        <dialog className="modal modal-open">
          <div className="modal-box bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl text-center">
            <h3 className={`font-bold text-lg ${modal.type === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
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