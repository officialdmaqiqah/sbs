import { Check } from 'lucide-react';

export default function Permissions() {
  const permissionModules = [
    {
      name: 'Projects',
      perms: ['projects.create', 'projects.read', 'projects.update', 'projects.delete']
    },
    {
      name: 'Inventory',
      perms: ['inventory.read', 'inventory.receive', 'inventory.dispatch', 'inventory.adjust']
    },
    {
      name: 'Accounting',
      perms: ['accounting.read', 'accounting.post', 'accounting.close_period']
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            System Permissions
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Available system-level permissions that can be mapped to roles.
          </p>
        </div>
      </div>

      <div className="bg-white shadow-sm ring-1 ring-gray-300 sm:rounded-lg overflow-hidden">
        <ul role="list" className="divide-y divide-gray-200">
          {permissionModules.map((mod) => (
            <li key={mod.name} className="px-6 py-5">
              <h3 className="text-sm font-medium text-gray-900 mb-3 uppercase tracking-wider">{mod.name}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {mod.perms.map((perm) => (
                  <div key={perm} className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-2 rounded border border-gray-100">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="font-mono">{perm}</span>
                  </div>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
