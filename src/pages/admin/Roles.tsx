import { Shield } from 'lucide-react';

export default function Roles() {
  const roles = [
    { name: 'CEO_ADMIN', description: 'Full system access and configuration.', usersCount: 1 },
    { name: 'FINANCE', description: 'Access to accounting, payments, and financial reports.', usersCount: 1 },
    { name: 'PRODUCTION', description: 'Manage cage production and feed formulation.', usersCount: 0 },
    { name: 'WORKER', description: 'Daily operations and task execution.', usersCount: 1 },
    { name: 'INVESTOR', description: 'Read-only access to investments and specific projects.', usersCount: 0 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Roles
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            System roles mapped to permissions within the organization.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {roles.map((role) => (
          <div key={role.name} className="divide-y divide-gray-200 rounded-lg bg-white shadow-sm ring-1 ring-gray-300">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-indigo-700">
                  <Shield className="h-5 w-5" />
                  <h3 className="text-lg font-medium">{role.name}</h3>
                </div>
                <span className="inline-flex items-center rounded-full bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
                  {role.usersCount} users
                </span>
              </div>
              <p className="mt-4 text-sm text-gray-500">{role.description}</p>
            </div>
            <div className="px-6 py-4">
              <button className="text-sm font-medium text-indigo-600 hover:text-indigo-900">View Permissions</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
