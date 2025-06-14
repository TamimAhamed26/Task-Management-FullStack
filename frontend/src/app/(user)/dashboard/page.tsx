'use client';
import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { Bar, Pie } from 'react-chartjs-2';
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
import TopBar from '@/components/TopBar';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { Responsive, WidthProvider } from 'react-grid-layout';
import '/node_modules/react-grid-layout/css/styles.css';
import '/node_modules/react-resizable/css/styles.css';
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

interface ManagerOverviewDto {
  totalTasks: number;
  statusSummary: { status: string; count: number }[];
  assigneeSummary: { username: string; taskCount: number }[];
}

interface OverdueTaskDto {
  id: number;
  title: string;
  assigneeUsername: string;
  dueDate: string;
  priority: string;
  status: string;
}

interface ProjectDto {
  id: number;
  name: string;
  description: string;
  ownerUsername: string;
  teamMembers: string[];
}

interface ProgressReportDto {
  completedTasks: number;
  pendingTasks: number;
  completionPercentage: number;
  weeklyGraphData: { date: string; completed: number }[];
}

interface WorkloadDistributionDto {
  username: string;
  taskCount: number;
  statusBreakdown: { [key: string]: number };
}

interface TotalHoursPerUserDto {
  username: string;
  totalHours: number;
}

interface CreateTaskDto {
  title: string;
  description?: string;
  deadline?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  assignedToId?: number;
  projectId: number;
}

interface TaskCompletionRateDto {
  completionRate: number;
  completedTasks: number;
  totalTasks: number;
}

interface PrioritySummaryDto {
  priority: string;
  count: number;
}

export default function DashboardPage() {
  const { user, tokenStatus, loading, feedback } = useAuthGuard();
  const [overview, setOverview] = useState<ManagerOverviewDto | null>(null);
  const [overdueTasks, setOverdueTasks] = useState<OverdueTaskDto[]>([]);
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [currentReport, setCurrentReport] = useState<ProgressReportDto | null>(null);
  const [workloadDistribution, setWorkloadDistribution] = useState<WorkloadDistributionDto[]>([]);
  const [totalHoursPerUser, setTotalHoursPerUser] = useState<TotalHoursPerUserDto[]>([]);
  const [recentTasks, setRecentTasks] = useState<TaskDto[]>([]);
  const [pendingApprovalTasks, setPendingApprovalTasks] = useState<TaskDto[]>([]);
  const [overallCompletion, setOverallCompletion] = useState<TaskCompletionRateDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [collaborators, setCollaborators] = useState<{ id: number; username: string }[]>([]);

  const [newTask, setNewTask] = useState<CreateTaskDto>({
    title: '',
    description: '',
    deadline: '',
    priority: 'MEDIUM',
    assignedToId: undefined,
    projectId: 0,
  });
  const [createTaskError, setCreateTaskError] = useState<string | null>(null);
  const [createTaskSuccess, setCreateTaskSuccess] = useState<string | null>(null);
  const [recentTasksProjectId, setRecentTasksProjectId] = useState<number | undefined>(undefined);
  const [pendingTasksFilterProjectId, setPendingTasksFilterProjectId] = useState<number | undefined>(undefined);
  const [pendingTasksFilterProjectName, setPendingTasksFilterProjectName] = useState<string | undefined>(undefined);
  const [workloadFilterUsername, setWorkloadFilterUsername] = useState<string | undefined>(undefined);
  const [workloadFilterUserId, setWorkloadFilterUserId] = useState<number | undefined>(undefined);
  const [workloadDateRange, setWorkloadDateRange] = useState<{ startDate: Date | null; endDate: Date | null }>({ startDate: null, endDate: null });
  const [hoursDateRange, setHoursDateRange] = useState<{ startDate: Date | null; endDate: Date | null }>({ startDate: null, endDate: null });
  const [hoursFilterUsername, setHoursFilterUsername] = useState<string | undefined>(undefined);
  const [hoursFilterUserId, setHoursFilterUserId] = useState<number | undefined>(undefined);
  const [prioritySummary, setPrioritySummary] = useState<PrioritySummaryDto[]>([]);
  const [priorityFilterProjectId, setPriorityFilterProjectId] = useState<number | undefined>(undefined);
  const [reportDatePreset, setReportDatePreset] = useState<string>('last7');
  const [reportStartDate, setReportStartDate] = useState<Date | null>(new Date());
  const [reportEndDate, setReportEndDate] = useState<Date | null>(new Date());
  const [customReportRange, setCustomReportRange] = useState<[Date | null, Date | null]>([null, null]);

  // New state for feedback modal
  const [modal, setModal] = useState<{
    isOpen: boolean;
    type: 'success' | 'error';
    message: string;
  }>({ isOpen: false, type: 'success', message: '' });

  useEffect(() => {
    console.log("User object in DashboardPage:", user);
    console.log("User role type:", typeof user?.role);
    if (user && typeof user.role === 'object' && user.role !== null) {
      console.log("User role name:", user.role.name);
    }
  }, [user]);

  // Add this new useEffect hook
useEffect(() => {
  const fetchCollaborators = async () => {
    try {
      const response = await axios.get('http://localhost:3001/users/collaborators', { withCredentials: true });
      setCollaborators(response.data);
    } catch (err) {
      console.error('Failed to load collaborators list:', err);
    }
  };

  if (!loading && user && user.role?.name?.toUpperCase() === 'MANAGER') {
    fetchCollaborators();
  }
}, [loading, user]); // Runs only when user auth state is confirmed

  const getPresetDates = (preset: string) => {
    const end = new Date();
    const start = new Date();
    switch (preset) {
      case 'last7':
        start.setDate(end.getDate() - 7);
        break;
      case 'last30':
        start.setDate(end.getDate() - 30);
        break;
      case 'thisMonth':
        start.setDate(1);
        break;
      case 'lastMonth':
        start.setMonth(start.getMonth() - 1, 1);
        end.setDate(0);
        break;
      case 'thisQuarter':
        const quarter = Math.floor(start.getMonth() / 3);
        start.setMonth(quarter * 3, 1);
        end.setMonth(quarter * 3 + 3, 0);
        break;
      default:
        start.setDate(end.getDate() - 7);
    }
    return { start, end };
  };

  useEffect(() => {
    if (reportDatePreset !== 'custom') {
      const { start, end } = getPresetDates(reportDatePreset);
      setReportStartDate(start);
      setReportEndDate(end);
    } else {
      const [start, end] = customReportRange;
      setReportStartDate(start);
      setReportEndDate(end);
    }
  }, [reportDatePreset, customReportRange]);

  const fetchData = useCallback(async () => {
    if (!reportStartDate || !reportEndDate) {
      return;
    }
    setIsLoadingData(true);
    setError(null);
    let fetchErrors: string[] = [];

    const fetchEndpoint = async (url: string, setData: (data: any) => void, errorMsg: string) => {
      try {
        const response = await axios.get(url, { withCredentials: true });
        setData(response.data);
      } catch (err: any) {
        console.error(`${errorMsg}:`, err);
        fetchErrors.push(errorMsg);
      }
    };

    const recentTasksUrl = recentTasksProjectId
      ? `http://localhost:3001/tasks/recent?projectId=${recentTasksProjectId}`
      : 'http://localhost:3001/tasks/recent';

    let pendingTasksUrl = 'http://localhost:3001/tasks/pending';
    if (pendingTasksFilterProjectId) {
      pendingTasksUrl += `?projectId=${pendingTasksFilterProjectId}`;
    } else if (pendingTasksFilterProjectName) {
      pendingTasksUrl += `?projectName=${encodeURIComponent(pendingTasksFilterProjectName)}`;
    }

    let workloadUrl = 'http://localhost:3001/progress/workload-distribution';
    const workloadParams = new URLSearchParams();
    if (workloadFilterUsername) workloadParams.append('username', workloadFilterUsername);
    if (workloadFilterUserId) workloadParams.append('userId', workloadFilterUserId.toString());
    if (workloadDateRange.startDate && workloadDateRange.endDate) {
      workloadParams.append('startDate', workloadDateRange.startDate.toISOString().split('T')[0]);
      workloadParams.append('endDate', workloadDateRange.endDate.toISOString().split('T')[0]);
    }
    if (workloadParams.toString()) {
      workloadUrl += `?${workloadParams.toString()}`;
    }

    let totalHoursUrl = 'http://localhost:3001/progress/total-hours/user';
    const totalHoursParams = new URLSearchParams();
    if (hoursFilterUsername) totalHoursParams.append('username', hoursFilterUsername);
    if (hoursFilterUserId) totalHoursParams.append('userId', hoursFilterUserId.toString());
    if (hoursDateRange.startDate && hoursDateRange.endDate) {
      totalHoursParams.append('startDate', hoursDateRange.startDate.toISOString().split('T')[0]);
      totalHoursParams.append('endDate', hoursDateRange.endDate.toISOString().split('T')[0]);
    }
    if (totalHoursParams.toString()) {
      totalHoursUrl += `?${totalHoursParams.toString()}`;
    }

    let prioritySummaryUrl = 'http://localhost:3001/tasks/summary/by-priority';
    if (priorityFilterProjectId) {
      prioritySummaryUrl += `?projectId=${priorityFilterProjectId}`;
    }

    const reportUrl = `http://localhost:3001/progress/custom-report?startDate=${reportStartDate.toISOString().split('T')[0]}&endDate=${reportEndDate.toISOString().split('T')[0]}`;

    await Promise.all([
      fetchEndpoint('http://localhost:3001/tasks/overview', setOverview, 'Failed to load task overview'),
      fetchEndpoint('http://localhost:3001/tasks/reports/overdue', setOverdueTasks, 'Failed to load overdue tasks'),
      fetchEndpoint('http://localhost:3001/tasks/projects', setProjects, 'Failed to load projects'),
      fetchEndpoint(reportUrl, setCurrentReport, 'Failed to load report'),
      fetchEndpoint(workloadUrl, setWorkloadDistribution, 'Failed to load workload distribution'),
      fetchEndpoint(totalHoursUrl, setTotalHoursPerUser, 'Failed to load total hours per user'),
      fetchEndpoint(recentTasksUrl, setRecentTasks, 'Failed to load recent tasks'),
      fetchEndpoint(pendingTasksUrl, setPendingApprovalTasks, 'Failed to load pending tasks (approval requests)'),
      fetchEndpoint('http://localhost:3001/progress/task-completion-rate', setOverallCompletion, 'Failed to load overall completion rate'),
      fetchEndpoint(prioritySummaryUrl, setPrioritySummary, 'Failed to load priority summary'),
    ]);

    if (fetchErrors.length > 0) {
      setError(`Some dashboard data could not be loaded: ${fetchErrors.join('; ')}. Please ensure your backend is running and all endpoints are accessible.`);
    }
    setIsLoadingData(false);
  }, [
    reportStartDate,
    reportEndDate,
    recentTasksProjectId,
    pendingTasksFilterProjectId,
    pendingTasksFilterProjectName,
    workloadFilterUsername,
    workloadFilterUserId,
    workloadDateRange,
    hoursFilterUsername,
    hoursFilterUserId,
    hoursDateRange,
    priorityFilterProjectId
  ]);

useEffect(() => {
    if (!loading && user && user.role?.name?.toUpperCase() === 'MANAGER') {
   
      if (workloadDateRange.startDate && !workloadDateRange.endDate) {
        return;
      }
      if (hoursDateRange.startDate && !hoursDateRange.endDate) {
        return;
      }
      fetchData();
    }
  }, [loading, user, fetchData, workloadDateRange, hoursDateRange]); 
  const priorityChartData = {
    labels: prioritySummary.map(p => p.priority),
    datasets: [{
      data: prioritySummary.map(p => p.count),
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
        text: 'Task Priority Breakdown',
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

  const workloadChartData = {
    labels: workloadDistribution.map(d => d.username),
    datasets: [
      {
        label: 'Pending',
        data: workloadDistribution.map(d => d.statusBreakdown.PENDING || 0),
        backgroundColor: 'rgba(251, 191, 36, 0.7)',
      },
      {
        label: 'Approved',
        data: workloadDistribution.map(d => d.statusBreakdown.APPROVED || 0),
        backgroundColor: 'rgba(59, 130, 246, 0.7)',
      },
      {
        label: 'Completed',
        data: workloadDistribution.map(d => d.statusBreakdown.COMPLETED || 0),
        backgroundColor: 'rgba(16, 185, 129, 0.7)',
      },
      {
        label: 'Rejected',
        data: workloadDistribution.map(d => d.statusBreakdown.REJECTED || 0),
        backgroundColor: 'rgba(239, 68, 68, 0.7)',
      },
    ],
  };

  const workloadChartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' as const },
      title: { display: true, text: 'Workload Distribution by Status' },
    },
    scales: {
      x: { stacked: true },
      y: { stacked: true, beginAtZero: true },
    },
  };

  const totalHoursChartData = {
    labels: totalHoursPerUser.map(u => u.username),
    datasets: [
      {
        label: 'Total Hours Logged',
        data: totalHoursPerUser.map(u => u.totalHours),
        backgroundColor: 'rgba(139, 92, 246, 0.6)',
        borderColor: 'rgba(139, 92, 246, 1)',
        borderWidth: 1,
      },
    ],
  };

  const totalHoursChartOptions = {
    indexAxis: "y" as const,
    responsive: true,
    plugins: {
      legend: { display: false },
      title: { display: true, text: 'Total Hours Logged Per User' },
    },
    scales: {
      x: { beginAtZero: true },
    },
  };

 const handleDownloadPdf = async () => {
  if (!reportStartDate || !reportEndDate) {
    setModal({
      isOpen: true,
      type: 'error',
      message: 'Please select a valid date range.',
    });
    return;
  }

  const startDateStr = reportStartDate.toISOString().split('T')[0];
  const endDateStr = reportEndDate.toISOString().split('T')[0];
  const downloadUrl = `http://localhost:3001/progress/download-custom-report-pdf?startDate=${startDateStr}&endDate=${endDateStr}`;

  try {
    const response = await axios.get(downloadUrl, {
      withCredentials: true,
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `report_${startDateStr}_to_${endDateStr}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url); // Clean up the URL object
    setModal({
      isOpen: true,
      type: 'success',
      message: 'PDF report generated and download initiated.',
    });
  } catch (err: any) {
    console.error('Failed to generate PDF:', err);
    setModal({
      isOpen: true,
      type: 'error',
      message: err.response?.data?.message || 'Failed to generate report PDF. Please try again.',
    });
  }
};

  const handleNewTaskChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewTask(prev => ({
      ...prev,
      [name]: name === 'assignedToId' || name === 'projectId' ? (value ? parseInt(value, 10) : undefined) : value,
    }));
  };

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
      setNewTask({
        title: '',
        description: '',
        deadline: '',
        priority: 'MEDIUM',
        assignedToId: undefined,
        projectId: 0,
      });
      await fetchData();
      setModal({
        isOpen: true,
        type: 'success',
        message: 'Task created successfully!',
      });
    } catch (err: any) {
      console.error('Failed to create task:', err);
      setCreateTaskError(err.response?.data?.message || 'Failed to create task. Please try again.');
    }
  };

  const handleApproveTask = async (taskId: number) => {
    try {
      await axios.patch(`http://localhost:3001/tasks/${taskId}/status`, { status: 'COMPLETED' }, { withCredentials: true });
      await fetchData();
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
        <p className="text-gray-600 dark:text-gray-300 mt-2">This dashboard is exclusively for users with manager privileges.</p>
        <div className="mt-8 flex flex-col sm:flex-row gap-4">
          <a href="/profile" className="btn btn-primary btn-lg rounded-full shadow-lg hover:shadow-xl transition-all duration-300">
            View Profile
          </a>
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

  const chartData = {
    labels: currentReport?.weeklyGraphData.map(d => new Date(d.date).toLocaleDateString()) || [],
    datasets: [
      {
        label: `Completed Tasks (${reportDatePreset === 'last7' ? 'Last 7 Days' : reportDatePreset === 'last30' ? 'Last 30 Days' : reportDatePreset === 'thisMonth' ? 'This Month' : reportDatePreset === 'lastMonth' ? 'Last Month' : reportDatePreset === 'thisQuarter' ? 'This Quarter' : 'Custom Range'})`,
        data: currentReport?.weeklyGraphData?.map(d => d.completed) || [],
        backgroundColor: 'rgba(79, 70, 229, 0.6)',
        borderColor: 'rgba(79, 70, 229, 1)',
        borderWidth: 2,
        borderRadius: 4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' as const, labels: { font: { size: 14, family: 'Inter, sans-serif' } } },
      title: { display: true, text: `${reportDatePreset === 'last7' ? 'Last 7 Days' : reportDatePreset === 'last30' ? 'Last 30 Days' : reportDatePreset === 'thisMonth' ? 'This Month' : reportDatePreset === 'lastMonth' ? 'Last Month' : reportDatePreset === 'thisQuarter' ? 'This Quarter' : 'Custom Range'} Task Completion Trend`, font: { size: 20, family: 'Inter, sans-serif' } },
      tooltip: { backgroundColor: 'rgba(55, 48, 163, 0.9)', titleFont: { size: 14 }, bodyFont: { size: 12 } },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: { display: true, text: 'Number of Tasks', font: { size: 14 } },
        grid: { color: 'rgba(0, 0, 0, 0.05)' },
      },
      x: {
        title: { display: true, text: 'Date', font: { size: 14 } },
        grid: { display: false },
      },
    },
    animation: {
      duration: 1000,
      easing: "easeOutQuart" as const,
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-700 p-6 md:p-10 font-sans antialiased">
      <TopBar />

      {(feedback || tokenStatus === 'refreshed') && (
        <div role="alert" className={`alert alert-success mb-6 rounded-xl shadow-md animate-fade-in ${feedback ? '' : 'animate-bounce'}`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-green-800 dark:text-green-100 font-medium">{feedback || 'Your session was automatically refreshed.'}</span>
        </div>
      )}

      {error && (
        <div role="alert" className="alert alert-error mb-6 rounded-xl shadow-md animate-fade-in">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-red-800 dark:text-red-100 font-medium">Error: {error}</span>
        </div>
      )}

      {isLoadingData ? (
        <div className="flex flex-col items-center justify-center p-10 bg-white dark:bg-gray-800 rounded-2xl shadow-xl min-h-[400px]">
          <span className="loading loading-dots loading-lg text-indigo-600 dark:text-indigo-400"></span>
          <p className="mt-6 text-gray-600 dark:text-gray-100 text-lg font-medium">Fetching dashboard insights...</p>
        </div>
      ) : (
        <div className="space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="card bg-gradient-to-br from-indigo-600 to-indigo-800 text-white dark:text-gray-100 shadow-2xl rounded-2xl hover:shadow-3xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="card-body p-6">
                <h2 className="card-title text-2xl font-extrabold">Task Overview</h2>
                <p className="text-xl">Total Tasks: <span className="font-extrabold text-3xl">{overview?.totalTasks || 0}</span></p>
                <div className="flex flex-col gap-3 mt-4">
                  {overview?.statusSummary.map(s => (
                    <div key={s.status} className="flex justify-between items-center bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg">
                      <span className="font-medium">{s.status}</span>
                      <span className="font-bold text-lg">{s.count}</span>
                    </div>
                  ))}
                </div>
                <div className="card-actions justify-end mt-6">
                  <a href="/tasks/search" className="btn btn-outline btn-primary text-white dark:text-gray-100 border-white/80 hover:bg-white hover:text-indigo-600 dark:hover:text-indigo-600 rounded-full">
                    Search Tasks
                  </a>
                </div>
              </div>
            </div>

            <div className="card bg-gradient-to-br from-emerald-600 to-emerald-800 text-white dark:text-gray-100 shadow-2xl rounded-2xl hover:shadow-3xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="card-body p-6">
                <h2 className="card-title text-2xl font-extrabold">Overall Progress</h2>
                <div className="flex items-center justify-center my-6">
                  <div
                    className="radial-progress text-white dark:text-gray-100"
                    style={{ "--value": overallCompletion?.completionRate || 0, "--size": "10rem", "--thickness": "1.2rem" } as React.CSSProperties}
                    role="progressbar"
                  >
                    <span className="text-4xl">{overallCompletion?.completionRate || 0}%</span>
                  </div>
                </div>
                <p className="text-center text-lg">
                  Completed: <span className="font-extrabold">{overallCompletion?.completedTasks || 0}</span> /{' '}
                  <span className="font-extrabold">{overallCompletion?.totalTasks || 0}</span> Tasks
                </p>
                <h3 className="text-xl font-bold mt-4">Current Report</h3>
                <p className="text-lg">Completed: <span className="font-extrabold">{currentReport?.completedTasks || 0}</span></p>
                <p className="text-lg">Pending: <span className="font-extrabold">{currentReport?.pendingTasks || 0}</span></p>
                
                <div className="flex flex-col gap-4 mt-4">
                  <select
                    className="select select-bordered w-full rounded-lg text-gray-900 dark:text-gray-900"
                    value={reportDatePreset}
                    onChange={(e) => setReportDatePreset(e.target.value)}
                  >
                    <option value="last7">Last 7 Days</option>
                    <option value="last30">Last 30 Days</option>
                    <option value="thisMonth">This Month</option>
                    <option value="lastMonth">Last Month</option>
                    <option value="thisQuarter">This Quarter</option>
                    <option value="custom">Custom Range</option>
                  </select>
{reportDatePreset === 'custom' && (
  <DatePicker
    selectsRange={true}
    startDate={customReportRange[0]}
    endDate={customReportRange[1]}
    onChange={(update) => setCustomReportRange(update)}
    isClearable={true}
    maxDate={new Date()}
    popperClassName="z-index-fix-for-datepicker" // Added custom class
    className="input input-bordered w-full rounded-lg text-gray-900 dark:text-gray-100"
    placeholderText="Select a custom date range"
  />
)}
                </div>

                <div className="card-actions justify-end mt-6">
                  <button
                    onClick={handleDownloadPdf}
                    className="btn btn-outline btn-primary text-white dark:text-gray-100 border-white/80 hover:bg-white hover:text-emerald-600 dark:hover:text-emerald-600 rounded-full"
                  >
                    Download PDF
                  </button>
                </div>
              </div>
            </div>

            <div className="card bg-gradient-to-br from-rose-600 to-rose-800 text-white dark:text-gray-100 shadow-2xl rounded-2xl hover:shadow-3xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="card-body p-6">
                <h2 className="card-title text-2xl font-extrabold">Overdue Tasks</h2>
                {overdueTasks.length === 0 ? (
                  <p className="text-lg italic mt-4">No overdue tasks. Keep it up!</p>
                ) : (
                  <ul className="list-disc list-inside mt-4 space-y-3">
                    {overdueTasks.slice(0, 5).map(task => (
                      <li key={task.id} className="text-lg">
                        <span className="font-semibold">{task.title}</span> (Assigned: {task.assigneeUsername}, Due:{' '}
                        {new Date(task.dueDate).toLocaleDateString()})
                      </li>
                    ))}
                    {overdueTasks.length > 5 && (
                      <li className="text-lg italic">And {overdueTasks.length - 5} more...</li>
                    )}
                  </ul>
                )}
                <div className="card-actions justify-end mt-6">
                  <a
                    href="/tasks/overdue"
                    className="btn btn-outline btn-primary text-white dark:text-gray-100 border-white/80 hover:bg-white hover:text-rose-600 dark:hover:text-rose-600 rounded-full"
                  >
                    View Overdue
                  </a>
                </div>
              </div>
            </div>

            <div className="card bg-white dark:bg-gray-800 shadow-2xl rounded-2xl hover:shadow-3xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="card-body p-6">
                <h2 className="card-title text-2xl font-extrabold text-gray-900 dark:text-gray-100">Recent Tasks</h2>
                <div className="form-control mb-4">
                  <label className="label">
                    <span className="label-text text-gray-700 dark:text-gray-300">Filter by Project</span>
                  </label>
                  <select
                    className="select select-bordered w-full rounded-lg"
                    value={recentTasksProjectId || ''}
                    onChange={(e) => setRecentTasksProjectId(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                  >
                    <option value="">All Projects</option>
                    {projects.map(project => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>
                {recentTasks.length === 0 ? (
                  <p className="text-lg italic text-gray-500 dark:text-gray-400 mt-4">No recent tasks.</p>
                ) : (
                  <ul className="list-disc list-inside mt-4 space-y-3 text-gray-700 dark:text-gray-100">
                    {recentTasks.slice(0, 5).map(task => (
                      <li key={task.id} className="text-lg">
                        <span className="font-semibold">{task.title}</span> (Status: {task.status}, Assigned:{' '}
                        {task.assignedToUsername || 'N/A'})
                        <span className="text-sm block text-gray-400 dark:text-gray-500">Updated: {new Date(task.updatedAt).toLocaleDateString()}</span>
                      </li>
                    ))}
                    {recentTasks.length > 5 && (
                      <li className="text-lg italic">And {recentTasks.length - 5} more...</li>
                    )}
                  </ul>
                )}
                <div className="card-actions justify-end mt-6">
                  <a href="/tasks/recent" className="btn btn-primary rounded-full shadow-md hover:shadow-lg">
                    View Recent Tasks
                  </a>
                </div>
              </div>
            </div>

         <div className="card bg-gradient-to-br from-amber-600 to-amber-800 text-white dark:text-gray-100 shadow-2xl rounded-2xl hover:shadow-3xl transition-all duration-300 transform hover:-translate-y-1">
  <div className="card-body p-6">
    <h2 className="card-title text-2xl font-extrabold">Approval Requests</h2>
    <div className="form-control mb-4">
      <label className="label">
        <span className="label-text text-white dark:text-gray-100">Filter by Project</span>
      </label>
      <select
        className="select select-bordered w-full rounded-lg text-gray-900 dark:text-gray-900"
        value={pendingTasksFilterProjectId || ''}
        onChange={(e) => setPendingTasksFilterProjectId(e.target.value ? parseInt(e.target.value, 10) : undefined)}
      >
        <option value="">All Projects</option>
        {projects.map(project => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </select>
    </div>
    {pendingApprovalTasks.length === 0 ? (
      <p className="text-lg italic mt-4">No tasks pending approval.</p>
    ) : (
      <ul className="list-disc list-inside mt-4 space-y-3">
        {pendingApprovalTasks.slice(0, 5).map(task => (
          <li key={task.id} className="text-lg flex justify-between items-center">
            <div>
              <span className="font-semibold">{task.title}</span> (Assigned: {task.assignedToUsername || 'N/A'})
              <span className="block text-sm text-gray-200 dark:text-gray-400">Project: {task.projectName || 'N/A'}</span>
            </div>
            <button
              onClick={() => handleApproveTask(task.id)}
              className="btn btn-sm btn-success text-white rounded-full ml-4"
            >
              Approve
            </button>
          </li>
        ))}
        {pendingApprovalTasks.length > 5 && (
          <li className="text-lg italic">And {pendingApprovalTasks.length - 5} more...</li>
        )}
      </ul>
    )}
    <div className="card-actions justify-end mt-6">
      <a
        href="/tasks/pending"
        className="btn btn-outline btn-primary text-white dark:text-gray-100 border-white/80 hover:bg-white hover:text-amber-600 dark:hover:text-amber-600 rounded-full"
      >
        View Pending
      </a>
    </div>
  </div>
</div>
            <div className="card bg-white dark:bg-gray-800 shadow-2xl rounded-2xl hover:shadow-3xl transition-all duration-300 transform hover:-translate-y-1 col-span-1 md:col-span-2 lg:col-span-3">
              <div className="card-body p-6">
                <h2 className="card-title text-2xl font-extrabold text-gray-900 dark:text-gray-100">Your Projects</h2>
                {projects.length === 0 ? (
                  <p className="text-lg italic text-gray-500 dark:text-gray-400">No projects available. Create one to get started!</p>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {projects.map(project => (
                      <div key={project.id} className="card bg-gray-50 dark:bg-gray-700 shadow-md rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200">
                        <div className="card-body p-4">
                          <h3 className="card-title text-lg font-bold text-gray-800 dark:text-gray-100">{project.name}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-300">Owner: {project.ownerUsername}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            Team Members: <span className="font-semibold">{project.teamMembers.length}</span>
                          </p>
                          <div className="card-actions justify-end mt-4">
                            <a href={`/projects/${project.id}/tasks`} className="btn btn-sm btn-primary rounded-full">
                              View Tasks
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-center mt-10">
            <button
              onClick={() => setIsCreateTaskModalOpen(true)}
              className="btn btn-lg btn-accent bg-gradient-to-r from-purple-500 to-pink-500 text-white dark:text-gray-100 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 rounded-full"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6 mr-2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Create New Task
            </button>
          </div>

          <div className="card bg-white dark:bg-gray-800 shadow-2xl rounded-2xl p-6 hover:shadow-3xl transition-all duration-300">
            <h2 className="card-title text-2xl font-extrabold text-gray-900 dark:text-gray-100 mb-4">
              {reportDatePreset === 'last7' ? 'Last 7 Days' : reportDatePreset === 'last30' ? 'Last 30 Days' : reportDatePreset === 'thisMonth' ? 'This Month' : reportDatePreset === 'lastMonth' ? 'Last Month' : reportDatePreset === 'thisQuarter' ? 'This Quarter' : 'Custom Range'} Task Completion Trend
            </h2>
            <div className="h-96 w-full">
              <Bar data={chartData} options={chartOptions} />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card bg-white dark:bg-gray-800 shadow-2xl rounded-2xl p-6 hover:shadow-3xl transition-all duration-300">
              <h2 className="card-title text-2xl font-extrabold text-gray-900 dark:text-gray-100 mb-4">Workload Distribution</h2>
              <div className="form-control mb-4">
           
               <div className="form-control mb-4">
  <label className="label">
    <span className="label-text text-gray-700 dark:text-gray-300">Filter by Collaborator</span>
  </label>
  <select
    className="select select-bordered w-full rounded-lg"
    value={workloadFilterUserId || ''}
    onChange={(e) => setWorkloadFilterUserId(e.target.value ? parseInt(e.target.value, 10) : undefined)}
  >
    <option value="">All Collaborators</option>
    {collaborators.map(c => (
      <option key={c.id} value={c.id}>
        {c.username} (ID: {c.id})
      </option>
    ))}
  </select>
</div>
              </div>
              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text text-gray-700 dark:text-gray-300">Date Range</span>
                </label>
           <DatePicker
  selectsRange={true}
  startDate={workloadDateRange.startDate}
  endDate={workloadDateRange.endDate}
  onChange={(update: [Date | null, Date | null]) => {
    setWorkloadDateRange({ startDate: update[0], endDate: update[1] });
  }}
  isClearable={true}
  maxDate={new Date()} // Add this line
  className="input input-bordered w-full rounded-lg text-gray-900 dark:text-gray-100"
  placeholderText="Select date range"
/>
              </div>
              {workloadDistribution.length === 0 ? (
                <p className="text-lg italic text-gray-500 dark:text-gray-400">No workload data available for these filters.</p>
              ) : (
                <>
                  <div className="overflow-x-auto mb-6">
                    <table className="table w-full table-zebra rounded-lg">
                      <thead>
                        <tr className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-100">
                          <th className="text-left">Username</th>
                          <th className="text-left">Total Tasks</th>
                          <th className="text-left">Pending</th>
                          <th className="text-left">Approved</th>
                          <th className="text-left">Completed</th>
                          <th className="text-left">Rejected</th>
                        </tr>
                      </thead>
                      <tbody>
                        {workloadDistribution.map((data, idx) => (
                          <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-600">
                            <td className="font-medium text-gray-900 dark:text-gray-100">{data.username}</td>
                            <td className="text-gray-900 dark:text-gray-100">{data.taskCount}</td>
                            <td><span className="badge badge-warning badge-lg">{data.statusBreakdown.PENDING || 0}</span></td>
                            <td><span className="badge badge-info badge-lg">{data.statusBreakdown.APPROVED || 0}</span></td>
                            <td><span className="badge badge-success badge-lg">{data.statusBreakdown.COMPLETED || 0}</span></td>
                            <td><span className="badge badge-error badge-lg">{data.statusBreakdown.REJECTED || 0}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="h-96 w-full">
                    <Bar data={workloadChartData} options={workloadChartOptions} />
                  </div>
                </>
              )}
            </div>

            <div className="card bg-white dark:bg-gray-800 shadow-2xl rounded-2xl p-6 hover:shadow-3xl transition-all duration-300">
              <h2 className="card-title text-2xl font-extrabold text-gray-900 dark:text-gray-100 mb-4">Total Hours Logged</h2>
              <div className="form-control mb-2">
                <div className="form-control mb-2">
  <label className="label">
    <span className="label-text text-gray-700 dark:text-gray-300">Filter by Collaborator</span>
  </label>
  <select
    className="select select-bordered w-full rounded-lg"
    value={hoursFilterUserId || ''}
    onChange={(e) => setHoursFilterUserId(e.target.value ? parseInt(e.target.value, 10) : undefined)}
  >
    <option value="">All Collaborators</option>
    {collaborators.map(c => (
      <option key={c.id} value={c.id}>
        {c.username} (ID: {c.id})
      </option>
    ))}
  </select>
</div>
              </div>
              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text text-gray-700 dark:text-gray-300">Date Range</span>
                </label>
             <DatePicker
  selectsRange={true}
  startDate={hoursDateRange.startDate}
  endDate={hoursDateRange.endDate}
  onChange={(update: [Date | null, Date | null]) => {
    setHoursDateRange({ startDate: update[0], endDate: update[1] });
  }}
  isClearable={true}
  maxDate={new Date()} 
  className="input input-bordered w-full rounded-lg text-gray-900 dark:text-gray-100"
  placeholderText="Select date range"
/>
              </div>
              {totalHoursPerUser.length === 0 ? (
                <p className="text-lg italic text-gray-500 dark:text-gray-400">No time logs available for these filters.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table w-full table-zebra rounded-lg">
                    <thead>
                      <tr className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-100">
                        <th className="text-left">Username</th>
                        <th className="text-left">Total Hours</th>
                      </tr>
                    </thead>
                    <tbody>
                      {totalHoursPerUser.map((data, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-600">
                          <td className="font-medium text-gray-900 dark:text-gray-100">{data.username}</td>
                          <td className="text-gray-900 dark:text-gray-100"><span className="font-semibold">{data.totalHours}</span> hours</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="card bg-white dark:bg-gray-800 shadow-2xl rounded-2xl p-6 hover:shadow-3xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="card-body">
              <h2 className="card-title text-2xl font-extrabold text-gray-900 dark:text-gray-100 mb-4">Task Priority Breakdown</h2>
              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text text-gray-700 dark:text-gray-300">Filter by Project</span>
                </label>
                <select
                  className="select select-bordered w-full rounded-lg"
                  value={priorityFilterProjectId || ''}
                  onChange={(e) => setPriorityFilterProjectId(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                >
                  <option value="">All Projects</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
              {prioritySummary.length === 0 ? (
                <p className="text-lg italic text-gray-500 dark:text-gray-400 mt-4">No priority data available for these filters.</p>
              ) : (
                <div className="h-64 w-full flex justify-center">
                  <Pie data={priorityChartData} options={priorityChartOptions} />
                </div>
              )}
            </div>
          </div>

          {isCreateTaskModalOpen && (
            <dialog id="create_task_modal" className="modal modal-open">
              <div className="modal-box bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-lg">
                <h3 className="font-extrabold text-3xl text-gray-900 dark:text-gray-100 mb-6">Create New Task</h3>
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
                      <span className="label-text font-medium text-gray-700 dark:text-gray-300">Assign To (User ID - Optional)</span>
                    </label>
                    <input
                      type="number"
                      name="assignedToId"
                      placeholder="Collaborator User ID"
                      className="input input-bordered w-full rounded-lg focus:ring-2 focus:ring-indigo-500"
                      value={newTask.assignedToId || ''}
                      onChange={handleNewTaskChange}
                    />
                  </div>
                  <div>
                    <label className="label">
                      <span className="label-text font-medium text-gray-700 dark:text-gray-300">Project (Required)</span>
                    </label>
                    <select
                      name="projectId"
                      className="select select-bordered w-full rounded-lg focus:ring-2 focus:ring-indigo-500"
                      value={newTask.projectId}
                      onChange={handleNewTaskChange}
                      required
                    >
                      <option value={0} disabled>
                        Select a project
                      </option>
                      {projects.map(project => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </div>

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
                        setNewTask({
                          title: '',
                          description: '',
                          deadline: '',
                          priority: 'MEDIUM',
                          assignedToId: undefined,
                          projectId: 0,
                        });
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
      )}
    </div>
  );
}