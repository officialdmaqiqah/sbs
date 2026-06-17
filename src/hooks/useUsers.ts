import { useState, useEffect, useCallback } from 'react';
import { userManagementService } from '../services/userManagementService';

export function useUsers() {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      const users = await userManagementService.listUsers();
      setData(users);
      setError(null);
    } catch (err: any) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return { data, isLoading, error, refetch: fetchUsers };
}

export function useCreateUser(onSuccess?: () => void) {
  const [isPending, setIsPending] = useState(false);

  const mutateAsync = async (input: any) => {
    setIsPending(true);
    try {
      const res = await userManagementService.createUser(input);
      if (onSuccess) onSuccess();
      return res;
    } finally {
      setIsPending(false);
    }
  };

  return { mutateAsync, isPending };
}

export function useUpdateUserRole(onSuccess?: () => void) {
  const [isPending, setIsPending] = useState(false);

  const mutate = async ({ userId, roleCode }: { userId: string; roleCode: string }) => {
    setIsPending(true);
    try {
      await userManagementService.updateUserRole(userId, roleCode);
      if (onSuccess) onSuccess();
    } finally {
      setIsPending(false);
    }
  };

  return { mutate, isPending };
}

export function useUpdateUserStatus(onSuccess?: () => void) {
  const [isPending, setIsPending] = useState(false);

  const mutate = async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
    setIsPending(true);
    try {
      await userManagementService.updateUserStatus(userId, isActive);
      if (onSuccess) onSuccess();
    } finally {
      setIsPending(false);
    }
  };

  return { mutate, isPending };
}
