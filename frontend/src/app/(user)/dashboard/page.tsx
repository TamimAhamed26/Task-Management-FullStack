'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthGuard } from '@/hooks/useAuthGuard';
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

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

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

export default function DashboardPage() {
  const router = useRouter();
  const { user, tokenStatus, loading } = useAuthGuard();
  const [overview, setOverview] = useState<ManagerOverviewDto | null>(null);
  const [overdueTasks, setOverdueTasks] = useState<OverdueTaskDto[]>([]);
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [weeklyReport, setWeeklyReport] = useState<ProgressReportDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {

    const fetchData = async () => {
      try {
        setIsLoadingData(true);
        const [overviewRes, overdueRes, projectsRes, weeklyReportRes] = await Promise.all([
          axios.get('http://localhost:3001/tasks/overview', { withCredentials: true }),
          axios.get('http://localhost:3001/tasks/reports/overdue', { withCredentials: true }),
          axios.get('http://localhost:3001/tasks/projects', { withCredentials: true }),
          axios.get('http://localhost:3001/progress/weekly-report', { withCredentials: true }),
        ]);

        setOverview(overviewRes.data);
        setOverdueTasks(overdueRes.data);
        setProjects(projectsRes.data);
        setWeeklyReport(weeklyReportRes.data);
      } catch (err) {
        setError('Failed to load dashboard data. Please try again.');
        console.error(err);
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchData();
  }, [user]);

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (user.role == 'MANAGER') {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold">Access Denied</h1>
        <p className="mt-2 text-lg">This dashboard is only accessible to managers.</p>
        <Link href="/profile">
          <button className="btn btn-primary mt-6 mr-4">View/Edit Profile</button>
        </Link>
        <button
          className="btn btn-error mt-6"
          onClick={async () => {
            await fetch('http://localhost:3001/auth/logout', {
              method: 'POST',
              credentials: 'include',
            });
            router.push('/login');
          }}
        >
          Logout
        </button>
      </div>
    );
  }

  const chartData = {
    labels: weeklyReport?.weeklyGraphData.map(d => d.date) || [],
    datasets: [
      {
        label: 'Completed Tasks',
        data: weeklyReport?.weeklyGraphData.map(d => d.completed) || [],
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' as const },
      title: { display: true, text: 'Weekly Task Completion' },
    },
  };

  return (
    <div className="p-6 bg-base-100 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Manager Dashboard</h1>
            <p className="mt-2 text-lg">Welcome, {user.username}!</p>
            <p className="mt-2 text-lg">Your email is {user.email}</p>
          </div>
          <div className="flex gap-4">
            <Link href="/profile">
              <button className="btn btn-primary mt-6 mr-4">View/Edit Profile</button>
            </Link>
            <button
              className="btn btn-error mt-6"
              onClick={async () => {
                await fetch('http://localhost:3001/auth/logout', {
                  method: 'POST',
                  credentials: 'include',
                });
                router.push('/login');
              }}
            >
              Logout
            </button>
          </div>
        </div>

        {tokenStatus === 'refreshed' && (
          <p className="text-green-600 mb-4">Your session was automatically refreshed.</p>
        )}
        {error && <div className="alert alert-error mb-4">{error}</div>}

        {isLoadingData ? (
          <div className="flex items-center justify-center h-64">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Task Overview Card */}
            <div className="card bg-base-200 shadow-xl">
              <div className="card-body">
                <h2 className="card-title">Task Overview</h2>
                <p>Total Tasks: {overview?.totalTasks || 0}</p>
                {overview?.statusSummary.map(s => (
                  <p key={s.status}>
                    {s.status}: {s.count}
                  </p>
                ))}
                <Link href="/tasks/search" className="mt-4">
                  <button className="btn btn-outline btn-sm">Search Tasks</button>
                </Link>
              </div>
            </div>

            {/* Overdue Tasks Card */}
            <div className="card bg-base-200 shadow-xl">
              <div className="card-body">
                <h2 className="card-title">Overdue Tasks</h2>
                {overdueTasks.length === 0 ? (
                  <p>No overdue tasks.</p>
                ) : (
                  <ul className="list-disc pl-5">
                    {overdueTasks.slice(0, 3).map(task => (
                      <li key={task.id}>
                        {task.title} ({task.assigneeUsername}, Due: {new Date(task.dueDate).toLocaleDateString()})
                      </li>
                    ))}
                  </ul>
                )}
                <Link href="/tasks/reports/overdue" className="mt-4">
                  <button className="btn btn-outline btn-sm">View All Overdue Tasks</button>
                </Link>
              </div>
            </div>

            {/* Weekly Report Card */}
            <div className="card bg-base-200 shadow-xl">
              <div className="card-body">
                <h2 className="card-title">Weekly Report</h2>
                <p>Completed: {weeklyReport?.completedTasks || 0}</p>
                <p>Pending: {weeklyReport?.pendingTasks || 0}</p>
                <p>Completion: {weeklyReport?.completionPercentage || 0}%</p>
                <a
                  href="http://localhost:3001/progress/download-weekly-report-pdf"
                  className="mt-4"
                >
                  <button className="btn btn-outline btn-sm">Download PDF</button>
                </a>
              </div>
            </div>

            {/* Weekly Report Chart */}
            <div className="card bg-base-200 shadow-xl col-span-1 md:col-span-2 lg:col-span-3">
              <div className="card-body">
                <h2 className="card-title">Weekly Task Completion Trend</h2>
                <Bar data={chartData} options={chartOptions} />
              </div>
            </div>

            {/* Workload Distribution Table */}
            <div className="card bg-base-200 shadow-xl col-span-1 md:col-span-2">
              <div className="card-body">
                <h2 className="card-title">Workload Distribution</h2>
                <div className="overflow-x-auto">
                  <table className="table w-full">
                    <thead>
                      <tr>
                        <th>Username</th>
                        <th>Task Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overview?.assigneeSummary.map((assignee, idx) => (
                        <tr key={idx}>
                          <td>{assignee.username}</td>
                          <td>{assignee.taskCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Projects List */}
            <div className="card bg-base-200 shadow-xl">
              <div className="card-body">
                <h2 className="card-title">Your Projects</h2>
                {projects.length === 0 ? (
                  <p>No projects available.</p>
                ) : (
                  <ul className="list-disc pl-5">
                    {projects.map(project => (
                      <li key={project.id}>
                        <Link href={`/projects/${project.id}/tasks`} className="link link-hover">
                          {project.name} ({project.teamMembers.length} members)
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                <Link href="/projects" className="mt-4">
                  <button className="btn btn-outline btn-sm">View All Projects</button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}