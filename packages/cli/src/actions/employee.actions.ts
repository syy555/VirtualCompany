import { getContext, type ActionResult } from './context.js';
import type { Employee } from '@vc/core';

export const employeeActions = {
  list(): ActionResult<Employee[]> {
    try {
      const { em } = getContext();
      return { ok: true, data: em.listActive() };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  },

  listRoles(): ActionResult<string[]> {
    try {
      const { em } = getContext();
      return { ok: true, data: em.listRoles() };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  },

  hire(role: string, name?: string): ActionResult<Employee> {
    try {
      const { em } = getContext();
      const roles = em.listRoles();
      if (!roles.includes(role)) {
        return { ok: false, error: `角色 "${role}" 不存在，可用角色：${roles.join(', ')}` };
      }
      const emp = em.hire(role, name);
      return { ok: true, data: emp };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  },

  fire(employeeId: string): ActionResult<{ id: string }> {
    try {
      const { em } = getContext();
      const emp = em.get(employeeId);
      if (!emp) return { ok: false, error: `员工 "${employeeId}" 不存在` };
      if (emp.status === 'terminated') return { ok: false, error: `员工 "${employeeId}" 已离职` };
      em.fire(employeeId);
      return { ok: true, data: { id: employeeId } };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  },
};
