'use client';
import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import TopBar from '@/components/TopBar';
import { useAuthGuard } from '@/hooks/useAuthGuard'; // This line is changed to import the actual hook 

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// Define interfaces for data structures based on your backend services
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
  projectId?: number; // Added as it's present in getPendingTasks and getRecentTasks
  projectName?: string;
  // Added as it's present in getPendingTasks
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
  // Renamed to graphData for generic use
}

interface WorkloadDistributionDto {
  username: string;
  taskCount: number;
  statusBreakdown: {
    [key: string]: number; // e.g., { PENDING: 5, APPROVED: 2, COMPLETED: 8, REJECTED: 1 }
  };
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


export default function DashboardPage() {
  const { user, tokenStatus, loading, feedback } = useAuthGuard();
  const [overview, setOverview] = useState<ManagerOverviewDto | null>(null);
  const [overdueTasks, setOverdueTasks] = useState<OverdueTaskDto[]>([]);
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [reportPeriod, setReportPeriod] = useState<'weekly' | 'monthly'>('weekly'); // State for report period
  const [currentReport, setCurrentReport] = useState<ProgressReportDto | null>(null);
  // To hold either weekly or monthly report
  const [workloadDistribution, setWorkloadDistribution] = useState<WorkloadDistributionDto[]>([]);
  const [totalHoursPerUser, setTotalHoursPerUser] = useState<TotalHoursPerUserDto[]>([]);
  const [recentTasks, setRecentTasks] = useState<TaskDto[]>([]);
  const [pendingApprovalTasks, setPendingApprovalTasks] = useState<TaskDto[]>([]);
  const [overallCompletion, setOverallCompletion] = useState<TaskCompletionRateDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
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
  // Filter states for optional parameters
  const [recentTasksProjectId, setRecentTasksProjectId] = useState<number | undefined>(undefined);
  const [pendingTasksFilterProjectId, setPendingTasksFilterProjectId] = useState<number | undefined>(undefined);
  const [pendingTasksFilterProjectName, setPendingTasksFilterProjectName] = useState<string | undefined>(undefined);
  const [workloadFilterUsername, setWorkloadFilterUsername] = useState<string | undefined>(undefined);
  const [workloadFilterUserId, setWorkloadFilterUserId] = useState<number | undefined>(undefined);
  const [hoursFilterUsername, setHoursFilterUsername] = useState<string | undefined>(undefined);
  const [hoursFilterUserId, setHoursFilterUserId] = useState<number | undefined>(undefined);
  const [hoursFilterStartDate, setHoursFilterStartDate] = useState<string | undefined>(undefined);
  const [hoursFilterEndDate, setHoursFilterEndDate] = useState<string | undefined>(undefined);
  // Function to fetch all dashboard data, with independent error handling

useEffect(() => {
    console.log("User object in DashboardPage:", user);
    console.log("User role type:", typeof user?.role);
    if (user && typeof user.role === 'object' && user.role !== null) {
        console.log("User role name:", user.role.name);
    }
}, [user]); // Log whenever the user object changes

  const fetchData = useCallback(async () => {
    setIsLoadingData(true);
    setError(null); // Clear previous errors
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

    // Construct URL for recent tasks based on selected project
    const recentTasksUrl = recentTasksProjectId
      ? `http://localhost:3001/tasks/recent?projectId=${recentTasksProjectId}`
      : 'http://localhost:3001/tasks/recent';

    // Construct URL for pending tasks based on selected project/name
    let pendingTasksUrl = 'http://localhost:3001/tasks/pending';
    if (pendingTasksFilterProjectId) {
      pendingTasksUrl += `?projectId=${pendingTasksFilterProjectId}`;
    } else if (pendingTasksFilterProjectName) {
      pendingTasksUrl += `?projectName=${encodeURIComponent(pendingTasksFilterProjectName)}`;
    }

    // Construct URL for workload distribution
    let workloadUrl = 'http://localhost:3001/progress/workload-distribution';
    if (workloadFilterUsername) {
        workloadUrl += `?username=${encodeURIComponent(workloadFilterUsername)}`;
    } else if (workloadFilterUserId) {
        workloadUrl += `?userId=${workloadFilterUserId}`;
    }

    // Construct URL for total hours per user
    let totalHoursUrl = 'http://localhost:3001/progress/total-hours/user';
    const totalHoursParams = new URLSearchParams();
    if (hoursFilterUsername) totalHoursParams.append('username', hoursFilterUsername);
    if (hoursFilterUserId) totalHoursParams.append('userId', hoursFilterUserId.toString());
    if (hoursFilterStartDate) totalHoursParams.append('startDate', hoursFilterStartDate);
    if (hoursFilterEndDate) totalHoursParams.append('endDate', hoursFilterEndDate);
    if (totalHoursParams.toString()) {
        totalHoursUrl += `?${totalHoursParams.toString()}`;
    }

    // Determine which report to fetch (weekly or monthly)
    const reportUrl = reportPeriod === 'weekly'
      ?
'http://localhost:3001/progress/weekly-report'
      : 'http://localhost:3001/progress/monthly-report';


    await Promise.all([
      fetchEndpoint('http://localhost:3001/tasks/overview', setOverview, 'Failed to load task overview'),
      fetchEndpoint('http://localhost:3001/tasks/reports/overdue', setOverdueTasks, 'Failed to load overdue tasks'),
      fetchEndpoint('http://localhost:3001/tasks/projects', setProjects, 'Failed to load projects'),
      fetchEndpoint(reportUrl, setCurrentReport, `Failed to load ${reportPeriod} report`), // Dynamic report fetch
      fetchEndpoint(workloadUrl, setWorkloadDistribution, 'Failed to load workload distribution'),
      fetchEndpoint(totalHoursUrl, setTotalHoursPerUser, 'Failed to load total hours per user'),
      fetchEndpoint(recentTasksUrl, setRecentTasks, 'Failed to load recent tasks'), //
      fetchEndpoint(pendingTasksUrl, setPendingApprovalTasks, 'Failed to load pending tasks (approval requests)'), // Dynamic pending tasks fetch
      fetchEndpoint('http://localhost:3001/progress/task-completion-rate', setOverallCompletion, 'Failed to load overall completion rate'),
    ]);
    if (fetchErrors.length > 0) {
      setError(`Some dashboard data could not be loaded: ${fetchErrors.join('; ')}. Please ensure your backend is running and all endpoints are accessible.`);
    }
    setIsLoadingData(false);
  }, [
      reportPeriod,
      recentTasksProjectId,
      pendingTasksFilterProjectId,
      pendingTasksFilterProjectName,
      workloadFilterUsername,
      workloadFilterUserId,
      hoursFilterUsername,
      hoursFilterUserId,
      hoursFilterStartDate,
      hoursFilterEndDate
    ]);
  useEffect(() => {
if (!loading && user && user.role?.name?.toUpperCase() === 'MANAGER') { 
       fetchData();
    }
  }, [loading, user, fetchData]);


  const handleDownloadPdf = async () => {
    const downloadUrl = reportPeriod === 'weekly'
      ?
'http://localhost:3001/progress/download-weekly-report-pdf'
      : 'http://localhost:3001/progress/download-monthly-report-pdf'; // Assuming monthly PDF endpoint

    try {
      const response = await axios.get(downloadUrl, {
        withCredentials: true,
        responseType: 'blob', // Important for downloading files
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${reportPeriod}_report.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      const messageBox = document.createElement('div');
      messageBox.className = 'fixed inset-0 flex items-center justify-center z-50';
      messageBox.innerHTML = `
        <div class="modal-box bg-white p-6 rounded-lg shadow-xl text-center">
          <h3 class="font-bold text-lg text-green-600">Success!</h3>
          <p class="py-4">${reportPeriod} report downloaded successfully!</p>
          <div class="modal-action flex justify-center">
            <button class="btn btn-success" onclick="this.closest('.fixed').remove()">OK</button>
          </div>
        </div>
      `;
      document.body.appendChild(messageBox);
    } catch (err: any) {
      console.error('Failed to download PDF:', err);
      const messageBox = document.createElement('div');
      messageBox.className = 'fixed inset-0 flex items-center justify-center z-50';
      messageBox.innerHTML = `
        <div class="modal-box bg-white p-6 rounded-lg shadow-xl text-center">
          <h3 class="font-bold text-lg text-red-600">Error!</h3>
          <p class="py-4">${err.response?.data?.message ||
`Failed to download ${reportPeriod} report PDF. Please try again.`}</p>
          <div class="modal-action flex justify-center">
            <button class="btn btn-error" onclick="this.closest('.fixed').remove()">OK</button>
          </div>
        </div>
      `;
      document.body.appendChild(messageBox);
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
      fetchData(); // Refresh dashboard data
    } catch (err: any) {
      console.error('Failed to create task:', err);
      setCreateTaskError(err.response?.data?.message || 'Failed to create task. Please try again.');
    }
  };
  // Handle approval of a pending task
  const handleApproveTask = async (taskId: number) => {
    try {
      // Assuming 'COMPLETED' after approval based on updateTaskStatus in backend
      await axios.patch(`http://localhost:3001/tasks/${taskId}/status`, { status: 'COMPLETED' }, { withCredentials: true });
      const messageBox = document.createElement('div');
      messageBox.className = 'fixed inset-0 flex items-center justify-center z-50';
      messageBox.innerHTML = `
        <div class="modal-box bg-white p-6 rounded-lg shadow-xl text-center">
          <h3 class="font-bold text-lg text-green-600">Success!</h3>
          <p class="py-4">Task approved and marked as completed!</p>
          <div class="modal-action flex justify-center">
            <button class="btn btn-success" onclick="this.closest('.fixed').remove()">OK</button>
          </div>
        </div>
      `;
      document.body.appendChild(messageBox);
      fetchData(); // Refresh data
    } catch (err: any) {
      console.error('Failed to approve task:', err);
      const messageBox = document.createElement('div');
      messageBox.className = 'fixed inset-0 flex items-center justify-center z-50';
      messageBox.innerHTML = `
        <div class="modal-box bg-white p-6 rounded-lg shadow-xl text-center">
          <h3 class="font-bold text-lg text-red-600">Error!</h3>
          <p class="py-4">${err.response?.data?.message ||
'Failed to approve task. Please try again.'}</p>
          <div class="modal-action flex justify-center">
            <button class="btn btn-error" onclick="this.closest('.fixed').remove()">OK</button>
          </div>
        </div>
      `;
      document.body.appendChild(messageBox);
    }
  };


  // Render loading state
  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
        <span className="loading loading-spinner loading-lg text-indigo-600"></span>
        <p className="ml-4 text-gray-800 text-lg font-medium">Authenticating...</p>
      </div>
    );
  }

if (user.role?.name.toUpperCase() !== 'MANAGER') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-red-50 to-red-100 p-6">
        <div className="alert alert-error shadow-2xl w-full max-w-lg rounded-xl">
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current flex-shrink-0 h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="ml-2 text-lg font-bold text-red-800">Access Denied</span>
          </div>
        </div>
        <h2 className="text-3xl font-extrabold text-gray-900 mt-6">Manager Dashboard Access Only</h2>
        <p className="text-gray-600 mt-2">This dashboard is exclusively for users with manager privileges.</p>
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

  // Chart data for weekly task completion (now dynamic based on reportPeriod)
  const chartData = {
    labels: currentReport?.weeklyGraphData.map(d => new Date(d.date).toLocaleDateString()) ||
[],
    datasets: [
      {
        label: `Completed Tasks (${reportPeriod === 'weekly' ? 'Last 7 Days' : 'Last 30 Days'})`,
        data: currentReport?.weeklyGraphData.map(d => d.completed) ||
[],
        backgroundColor: 'rgba(79, 70, 229, 0.6)', // Indigo shade
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
      title: { display: true, text: `${reportPeriod === 'weekly' ?
'Weekly' : 'Monthly'} Task Completion Trend`, font: { size: 20, family: 'Inter, sans-serif' } },
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
    
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6 md:p-10 font-sans antialiased">
      {/* Navbar / Header */}
      <TopBar />

      {/* Main Dashboard Content */}


      {/* Feedback Alerts */}
      {(feedback || tokenStatus === 'refreshed') && (
        <div role="alert" className={`alert alert-success mb-6 rounded-xl shadow-md animate-fade-in ${feedback ? '' : 'animate-bounce'}`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6
w-6 text-green-600" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-green-800 font-medium">{feedback || 'Your session was automatically refreshed.'}</span>
        </div>
      )}

      {error && (
        <div role="alert" className="alert alert-error mb-6 rounded-xl
shadow-md animate-fade-in">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-red-800 font-medium">Error: {error}</span>
        </div>
      )}


      {isLoadingData ? (
        <div className="flex flex-col items-center justify-center p-10 bg-white rounded-2xl shadow-2xl min-h-[400px]">
          <span className="loading loading-dots loading-lg text-indigo-600"></span>
          <p className="mt-6 text-gray-600 text-lg font-medium">Fetching dashboard insights...</p>
        </div>
      ) : (
        <div className="space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

            {/* Task Overview Card */}
            <div className="card bg-gradient-to-br from-indigo-600 to-indigo-800 text-white shadow-2xl rounded-2xl hover:shadow-3xl transition-all duration-300 transform hover:-translate-y-1">
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
                  <a href="/tasks/search" className="btn btn-outline btn-primary text-white border-white/80 hover:bg-white hover:text-indigo-600 rounded-full">
                    Search Tasks
                  </a>
                </div>
              </div>
            </div>


            {/* Overall Progress Card & Progress Ring */}
            <div className="card bg-gradient-to-br from-emerald-600 to-emerald-800 text-white shadow-2xl rounded-2xl hover:shadow-3xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="card-body p-6">
                <h2 className="card-title text-2xl font-extrabold">Overall Progress</h2>
                <div className="flex items-center justify-center my-6">

                  <div
                    className="radial-progress text-white"
                    style={{ "--value": overallCompletion?.completionRate ||
0, "--size": "10rem", "--thickness": "1.2rem" } as React.CSSProperties}
                    role="progressbar"
                  >
                    <span className="text-4xl">{overallCompletion?.completionRate ||
0}%</span>
                  </div>
                </div>
                <p className="text-center text-lg">
                  Completed: <span className="font-extrabold">{overallCompletion?.completedTasks ||
0}</span> /{' '}
                  <span className="font-extrabold">{overallCompletion?.totalTasks ||
0}</span> Tasks
                </p>
                <h3 className="text-xl font-bold mt-4">Current Report: {reportPeriod === 'weekly' ?
'Weekly' : 'Monthly'}</h3>
                <p className="text-lg">Completed: <span className="font-extrabold">{currentReport?.completedTasks ||
0}</span></p>
                <p className="text-lg">Pending: <span className="font-extrabold">{currentReport?.pendingTasks ||
0}</span></p>
                <div className="flex justify-center gap-4 mt-6">
                  <div className="form-control">
                    <label className="label cursor-pointer gap-2">
                      <span className="label-text text-white">Weekly</span>

                      <input
                        type="radio"
                        name="reportPeriod"
                        className="radio checked:bg-blue-500"

                        checked={reportPeriod === 'weekly'}
                        onChange={() => setReportPeriod('weekly')}
                      />
                    </label>
                  </div>

                  <div className="form-control">
                    <label className="label cursor-pointer gap-2">
                      <span className="label-text text-white">Monthly</span>
                      <input

                        type="radio"
                        name="reportPeriod"
                        className="radio checked:bg-blue-500"
                        checked={reportPeriod === 'monthly'}

                        onChange={() => setReportPeriod('monthly')}
                      />
                    </label>
                  </div>
                </div>
                <div className="card-actions
justify-end mt-6">
                  <button
                    onClick={handleDownloadPdf}
                    className="btn btn-outline btn-primary text-white border-white/80 hover:bg-white hover:text-emerald-600 rounded-full"
                  >

                    Download PDF
                  </button>
                </div>
              </div>
            </div>

            {/* Overdue Tasks Card */}
            <div className="card bg-gradient-to-br from-rose-600 to-rose-800 text-white shadow-2xl
rounded-2xl hover:shadow-3xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="card-body p-6">
                <h2 className="card-title text-2xl font-extrabold">Overdue Tasks</h2>
                {overdueTasks.length === 0 ?
(
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
                    className="btn btn-outline btn-primary text-white border-white/80 hover:bg-white hover:text-rose-600 rounded-full"

                  >
                    View Overdue
                  </a>
                </div>
              </div>
            </div>


            {/* Recent Tasks Card */}
            <div className="card bg-white shadow-2xl rounded-2xl hover:shadow-3xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="card-body p-6">
                <h2 className="card-title text-2xl font-extrabold text-gray-900">Recent Tasks</h2>
                <div className="form-control mb-4">

                  <label className="label">
                    <span className="label-text">Filter by Project</span>
                  </label>
                  <select
                    className="select select-bordered w-full rounded-lg"

                    value={recentTasksProjectId ||
''}
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
                {recentTasks.length === 0 ?
(
                  <p className="text-lg italic text-gray-500 mt-4">No recent tasks.</p>
                ) : (
                  <ul className="list-disc list-inside mt-4 space-y-3 text-gray-700">
                    {recentTasks.slice(0, 5).map(task => (

                      <li key={task.id} className="text-lg">
                        <span className="font-semibold">{task.title}</span> (Status: {task.status}, Assigned:{' '}
                        {task.assignedToUsername || 'N/A'})
                        <span className="text-sm block text-gray-400">Updated: {new Date(task.updatedAt).toLocaleDateString()}</span>

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

            {/* Approval Requests Card */}
            <div
className="card bg-gradient-to-br from-amber-600 to-amber-800 text-white shadow-2xl rounded-2xl hover:shadow-3xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="card-body p-6">
                <h2 className="card-title text-2xl font-extrabold">Approval Requests</h2>
                <div className="form-control mb-2">
                  <label className="label">

                    <span className="label-text text-white">Filter by Project ID</span>
                  </label>
                  <input
                    type="number"
                    placeholder="Project ID"

                    className="input input-bordered w-full rounded-lg"
                    value={pendingTasksFilterProjectId ||
''}
                    onChange={(e) => setPendingTasksFilterProjectId(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                  />
                </div>
                <div className="form-control mb-4">
                  <label className="label">

                    <span className="label-text text-white">Filter by Project Name</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Project
Name"
                    className="input input-bordered w-full rounded-lg"
                    value={pendingTasksFilterProjectName ||
''}
                    onChange={(e) => setPendingTasksFilterProjectName(e.target.value || undefined)}
                  />
                </div>
                {pendingApprovalTasks.length === 0 ?
(
                  <p className="text-lg italic mt-4">No tasks pending approval.</p>
                ) : (
                  <ul className="list-disc list-inside mt-4 space-y-3">
                    {pendingApprovalTasks.slice(0, 5).map(task => (

                      <li key={task.id} className="text-lg flex justify-between items-center">
                        <div>
                          <span className="font-semibold">{task.title}</span> (Assigned: {task.assignedToUsername || 'N/A'})
                          <span className="block text-sm text-gray-200">Project: {task.projectName
|| 'N/A'}</span>
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

                    className="btn btn-outline btn-primary text-white border-white/80 hover:bg-white hover:text-amber-600 rounded-full"
                  >
                    View Pending
                  </a>
                </div>

              </div>
            </div>

            {/* Project Stats Card */}
            <div className="card bg-white shadow-2xl rounded-2xl p-6 hover:shadow-3xl transition-all duration-300 transform hover:-translate-y-1 col-span-1 md:col-span-2 lg:col-span-1">
              <h2 className="card-title text-2xl font-extrabold text-gray-900 mb-4">Your Projects</h2>
              {projects.length === 0 ?
(
                <p className="text-lg italic text-gray-500">No projects available. Create one to get started!</p>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {projects.map(project => (

                    <div key={project.id} className="card bg-gray-50 shadow-md rounded-xl hover:bg-gray-100 transition-colors duration-200">
                      <div className="card-body p-4">
                        <h3 className="card-title text-lg font-bold text-gray-800">{project.name}</h3>
                        <p className="text-sm text-gray-600">Owner: {project.ownerUsername}</p>

                        <p className="text-sm text-gray-600">
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

          {/* Action Buttons */}
          <div className="flex justify-center mt-10">
            <button
              onClick={() => setIsCreateTaskModalOpen(true)}
              className="btn btn-lg btn-accent bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 rounded-full"

            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6 mr-2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Create New Task
            </button>

          </div>

          {/* Weekly/Monthly Report Chart */}
          <div className="card bg-white shadow-2xl rounded-2xl p-6 hover:shadow-3xl transition-all duration-300">
            <h2 className="card-title text-2xl font-extrabold text-gray-900 mb-4">
              {reportPeriod === 'weekly' ?
'Weekly' : 'Monthly'} Task Completion Trend
            </h2>
            <div className="h-96 w-full">
              <Bar data={chartData} options={chartOptions} />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Workload Distribution Table
*/}
            <div className="card bg-white shadow-2xl rounded-2xl p-6 hover:shadow-3xl transition-all duration-300">
              <h2 className="card-title text-2xl font-extrabold text-gray-900 mb-4">Workload Distribution</h2>
                <div className="form-control mb-4">
                  <label className="label">
                    <span className="label-text">Filter by
Username</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Username"
                    className="input input-bordered w-full rounded-lg"

                    value={workloadFilterUsername ||
''}
                    onChange={(e) => setWorkloadFilterUsername(e.target.value || undefined)}
                  />
                </div>
                <div className="form-control mb-4">
                  <label className="label">

                    <span className="label-text">Filter by User ID</span>
                  </label>
                  <input
                    type="number"
                    placeholder="User ID"

                    className="input input-bordered w-full rounded-lg"
                    value={workloadFilterUserId ||
''}
                    onChange={(e) => setWorkloadFilterUserId(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                  />
                </div>
              {workloadDistribution.length === 0 ?
(
                <p className="text-lg italic text-gray-500">No workload data available for these filters.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table w-full table-zebra rounded-lg">

                    <thead>
                      <tr className="bg-gray-100 text-gray-700">
                        <th className="text-left">Username</th>
                        <th className="text-left">Total Tasks</th>
                        <th
className="text-left">Pending</th>
                        <th className="text-left">Approved</th>
                        <th className="text-left">Completed</th>
                        <th className="text-left">Rejected</th>
                      </tr>

                    </thead>
                    <tbody>
                      {workloadDistribution.map((data, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">

                          <td className="font-medium">{data.username}</td>
                          <td>{data.taskCount}</td>
                          <td><span className="badge badge-warning badge-lg">{data.statusBreakdown.PENDING ||
0}</span></td>
                          <td><span className="badge badge-info badge-lg">{data.statusBreakdown.APPROVED ||
0}</span></td>
                          <td><span className="badge badge-success badge-lg">{data.statusBreakdown.COMPLETED ||
0}</span></td>
                          <td><span className="badge badge-error badge-lg">{data.statusBreakdown.REJECTED ||
0}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                </div>
              )}
            </div>

            {/* Total Hours Per User Table */}
            <div className="card bg-white shadow-2xl rounded-2xl p-6 hover:shadow-3xl transition-all duration-300">
              <h2 className="card-title text-2xl font-extrabold text-gray-900 mb-4">Total Hours Logged</h2>

                <div className="form-control mb-2">
                  <label className="label">
                    <span className="label-text">Filter by Username</span>
                  </label>
                  <input

                    type="text"
                    placeholder="Username"
                    className="input input-bordered w-full rounded-lg"
                    value={hoursFilterUsername ||
''}
                    onChange={(e) => setHoursFilterUsername(e.target.value || undefined)}
                  />
                </div>
                <div className="form-control mb-2">
                  <label className="label">

                    <span className="label-text">Filter by User ID</span>
                  </label>
                  <input
                    type="number"
                    placeholder="User ID"

                    className="input input-bordered w-full rounded-lg"
                    value={hoursFilterUserId ||
''}
                    onChange={(e) => setHoursFilterUserId(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                  />
                </div>
                <div className="form-control mb-2">
                  <label className="label">

                    <span className="label-text">Start Date</span>
                  </label>
                  <input
                    type="date"
                    className="input input-bordered w-full rounded-lg"

                    value={hoursFilterStartDate ||
''}
                    onChange={(e) => setHoursFilterStartDate(e.target.value || undefined)}
                  />
                </div>
                <div className="form-control mb-4">
                  <label className="label">

                    <span className="label-text">End Date</span>
                  </label>
                  <input
                    type="date"
                    className="input input-bordered w-full rounded-lg"

                    value={hoursFilterEndDate ||
''}
                    onChange={(e) => setHoursFilterEndDate(e.target.value || undefined)}
                  />
                </div>
              {totalHoursPerUser.length === 0 ?
(
                <p className="text-lg italic text-gray-500">No time logs available for these filters.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table w-full table-zebra rounded-lg">

                    <thead>
                      <tr className="bg-gray-100 text-gray-700">
                        <th className="text-left">Username</th>
                        <th className="text-left">Total Hours</th>
                      </tr>

                    </thead>
                    <tbody>
                      {totalHoursPerUser.map((data, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">

                          <td className="font-medium">{data.username}</td>
                          <td><span className="font-semibold">{data.totalHours}</span> hours</td>
                        </tr>
                      ))}

                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/*
Create Task Modal */}
      {isCreateTaskModalOpen && (
        <dialog id="create_task_modal" className="modal modal-open">
          <div className="modal-box bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg">
            <h3 className="font-extrabold text-3xl text-gray-900 mb-6">Create New Task</h3>
            <form onSubmit={handleCreateTask} className="space-y-6">
              <div>

                <label className="label">
                  <span className="label-text font-medium text-gray-700">Title</span>
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
                  <span className="label-text font-medium text-gray-700">Description (Optional)</span>
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
                  <span className="label-text font-medium text-gray-700">Deadline (Optional)</span>
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
                  <span className="label-text font-medium text-gray-700">Priority (Optional)</span>

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
                  <span className="label-text font-medium text-gray-700">Assign To (User ID - Optional)</span>
                </label>

                <input
                  type="number"
                  name="assignedToId"
                  placeholder="Collaborator User ID"
                  className="input input-bordered w-full rounded-lg focus:ring-2 focus:ring-indigo-500"

                  value={newTask.assignedToId ||
''}
                  onChange={handleNewTaskChange}
                />
              </div>
              <div>
                <label className="label">
                  <span className="label-text font-medium
text-gray-700">Project (Required)</span>
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
                  <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6 text-red-600" fill="none" viewBox="0 0
24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-red-800">{createTaskError}</span>
                </div>

              )}
              {createTaskSuccess && (
                <div role="alert" className="alert alert-success rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6
2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-green-800">{createTaskSuccess}</span>
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
    </div>
  );
}