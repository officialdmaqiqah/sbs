
import { useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

export default function Unauthorized() {
  const navigate = useNavigate();

  return (
    <div className="flex h-screen items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="flex justify-center">
          <ShieldAlert className="h-16 w-16 text-red-500" />
        </div>
        <div>
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">
            Access Denied
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            You don't have permission to access this page. Please contact your administrator if you believe this is a mistake.
          </p>
        </div>
        <div>
          <button
            onClick={() => navigate('/')}
            className="group relative flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
