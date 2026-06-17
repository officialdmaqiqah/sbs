import { FolderKanban, ShieldCheck } from 'lucide-react';

export default function ProjectAccess() {
  const allocations = [
    { id: '1', user: 'Finance Staff', role: 'FINANCE', project: 'Global (All Projects)' },
    { id: '2', user: 'Budi (Worker)', role: 'WORKER', project: 'PRJ-2024-001 (Kandang A)' },
    { id: '3', user: 'Investor A', role: 'INVESTOR', project: 'PRJ-2024-001 (Kandang A)' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Project Access
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage which users have access to specific projects.
          </p>
        </div>
        <div>
          <button
            className="inline-flex items-center gap-x-2 rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            <FolderKanban className="-ml-0.5 h-5 w-5" aria-hidden="true" />
            Assign Project
          </button>
        </div>
      </div>

      <div className="bg-white shadow-sm ring-1 ring-gray-300 sm:rounded-lg">
        <table className="min-w-full divide-y divide-gray-300">
          <thead>
            <tr>
              <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">User</th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Assigned Role</th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Project Context</th>
              <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {allocations.map((alloc) => (
              <tr key={alloc.id}>
                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                  {alloc.user}
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                  <span className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-200">
                    <ShieldCheck className="h-3 w-3" />
                    {alloc.role}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{alloc.project}</td>
                <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                  <button className="text-red-600 hover:text-red-900">Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
