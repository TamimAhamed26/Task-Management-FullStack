'use client';

import { useRouter } from 'next/navigation';
import { useAuthGuard } from '@/hooks/useAuthGuard';

export default function TopBar() {
  const { user } = useAuthGuard();
  const router = useRouter();

  // Don't render TopBar until user is loaded
  if (!user) return null;

  return (
    <div className="navbar bg-white/80 backdrop-blur-md shadow-2xl rounded-2xl mb-10 p-4 sticky top-4 z-50">
      <div className="flex-1">
        <a
          href="/"
          className="btn btn-ghost text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600"
        >
          TaskManager Pro
        </a>
        <span className="ml-4 text-xl font-semibold text-gray-700 capitalize">
  {user.role.name.toLowerCase()} Dashboard
        </span>
      </div>
      <div className="flex-none">
        <div className="dropdown dropdown-end">
          
      <label tabIndex={0} className="btn btn-ghost btn-circle avatar">

  <div className="w-12 rounded-full ring-2 ring-indigo-500">
    <img
      src={
        user.avatarUrl?.startsWith('http')
          ? user.avatarUrl
          : `https://placehold.co/48x48/4F46E5/FFFFFF?text=${user.username.charAt(0).toUpperCase()}`
      }
      alt="User Avatar"
    />
  </div>
</label>

          <ul
            tabIndex={0}
            className="menu menu-md dropdown-content mt-3 z-[1] p-2 shadow-lg bg-white rounded-2xl w-64 border border-gray-100"
          >
            <li>
              <a
                href="/profile"
                className="text-gray-700 font-medium hover:bg-indigo-50 hover:text-indigo-600 rounded-lg"
              >
                Profile
                <span className="badge badge-primary badge-sm ml-2">New</span>
              </a>
            </li>
            <li>
              <button
                className="text-gray-700 font-medium hover:bg-indigo-50 hover:text-indigo-600 rounded-lg"
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
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}