import Link from 'next/link';

export default function PendingApprovalPage() {
  const message = 'Account created. Please wait for an admin to assign your role to log in with Google.';

  return (
    <div className="min-h-screen hero bg-base-200">
      <div className="w-full max-w-md hero-content">
        <div className="w-full shadow-2xl card bg-base-100">
          <div className="card-body">
            <h1 className="mb-4 text-2xl font-bold text-center">Account Created Successfully!</h1>
            
            {/* Success Message */}
            <div role="alert" className="alert alert-success">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 stroke-current shrink-0" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span>{message}</span>
            </div>

            <div className="mt-6 text-center">
              <Link href="/login" className="btn btn-primary">
                Return to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}