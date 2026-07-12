"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";

import DataTable from "@/components/workspace/DataTable";
import FormField, { formControlClass } from "@/components/workspace/FormField";
import ScreenPanel from "@/components/workspace/ScreenPanel";
import StatusBadge from "@/components/workspace/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  notifyWorkspaceUpdated,
  useWorkspaceData,
} from "@/hooks/use-workspace-data";
import {
  deleteCategory,
  deleteDepartment,
  deleteEmployee,
  upsertCategory,
  upsertDepartment,
  upsertEmployee,
} from "@/lib/workspace/storage";
import type {
  Category,
  Department,
  Employee,
  EntityStatus,
  OrganizationTab,
} from "@/lib/workspace/types";
import { ENTITY_STATUSES } from "@/lib/workspace/types";
import { cn } from "@/lib/utils";

const tabs: { id: OrganizationTab; label: string }[] = [
  { id: "departments", label: "Departments" },
  { id: "categories", label: "Categories" },
  { id: "employee", label: "Employee" },
];

type DepartmentFormState = {
  id?: string;
  name: string;
  head: string;
  parentDept: string;
  status: EntityStatus;
};

type CategoryFormState = {
  id?: string;
  name: string;
  description: string;
  status: EntityStatus;
};

type EmployeeFormState = {
  id?: string;
  name: string;
  departmentId: string;
  role: string;
  status: EntityStatus;
};

const emptyDepartmentForm: DepartmentFormState = {
  name: "",
  head: "",
  parentDept: "",
  status: "active",
};

const emptyCategoryForm: CategoryFormState = {
  name: "",
  description: "",
  status: "active",
};

const emptyEmployeeForm: EmployeeFormState = {
  name: "",
  departmentId: "",
  role: "",
  status: "active",
};

export default function OrganizationSetup() {
  const { data, refresh } = useWorkspaceData();
  const [activeTab, setActiveTab] = useState<OrganizationTab>("departments");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [departmentForm, setDepartmentForm] =
    useState<DepartmentFormState>(emptyDepartmentForm);
  const [categoryForm, setCategoryForm] =
    useState<CategoryFormState>(emptyCategoryForm);
  const [employeeForm, setEmployeeForm] =
    useState<EmployeeFormState>(emptyEmployeeForm);

  const departmentNameById = useMemo(() => {
    return new Map(data.departments.map((item) => [item.id, item.name]));
  }, [data.departments]);

  const openCreateForm = () => {
    if (activeTab === "departments") {
      setDepartmentForm(emptyDepartmentForm);
    } else if (activeTab === "categories") {
      setCategoryForm(emptyCategoryForm);
    } else {
      setEmployeeForm(emptyEmployeeForm);
    }

    setSheetOpen(true);
  };

  const openDepartmentEdit = (department: Department) => {
    setDepartmentForm({
      id: department.id,
      name: department.name,
      head: department.head,
      parentDept: department.parentDept,
      status: department.status,
    });
    setSheetOpen(true);
  };

  const openCategoryEdit = (category: Category) => {
    setCategoryForm({
      id: category.id,
      name: category.name,
      description: category.description,
      status: category.status,
    });
    setSheetOpen(true);
  };

  const openEmployeeEdit = (employee: Employee) => {
    setEmployeeForm({
      id: employee.id,
      name: employee.name,
      departmentId: employee.departmentId,
      role: employee.role,
      status: employee.status,
    });
    setSheetOpen(true);
  };

  const handleDepartmentSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!departmentForm.name.trim() || !departmentForm.head.trim()) {
      return;
    }

    upsertDepartment({
      id: departmentForm.id,
      name: departmentForm.name.trim(),
      head: departmentForm.head.trim(),
      parentDept: departmentForm.parentDept.trim(),
      status: departmentForm.status,
    });

    notifyWorkspaceUpdated();
    refresh();
    setSheetOpen(false);
    setDepartmentForm(emptyDepartmentForm);
  };

  const handleCategorySubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!categoryForm.name.trim()) {
      return;
    }

    upsertCategory({
      id: categoryForm.id,
      name: categoryForm.name.trim(),
      description: categoryForm.description.trim(),
      status: categoryForm.status,
    });

    notifyWorkspaceUpdated();
    refresh();
    setSheetOpen(false);
    setCategoryForm(emptyCategoryForm);
  };

  const handleEmployeeSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!employeeForm.name.trim() || !employeeForm.departmentId) {
      return;
    }

    upsertEmployee({
      id: employeeForm.id,
      name: employeeForm.name.trim(),
      departmentId: employeeForm.departmentId,
      role: employeeForm.role.trim(),
      status: employeeForm.status,
    });

    notifyWorkspaceUpdated();
    refresh();
    setSheetOpen(false);
    setEmployeeForm(emptyEmployeeForm);
  };

  const handleDelete = () => {
    if (activeTab === "departments" && departmentForm.id) {
      deleteDepartment(departmentForm.id);
    } else if (activeTab === "categories" && categoryForm.id) {
      deleteCategory(categoryForm.id);
    } else if (activeTab === "employee" && employeeForm.id) {
      deleteEmployee(employeeForm.id);
    } else {
      return;
    }

    notifyWorkspaceUpdated();
    refresh();
    setSheetOpen(false);
  };

  const sheetTitle =
    activeTab === "departments"
      ? departmentForm.id
        ? "Edit department"
        : "Add department"
      : activeTab === "categories"
        ? categoryForm.id
          ? "Edit category"
          : "Add category"
        : employeeForm.id
          ? "Edit employee"
          : "Add employee";

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400">
            Admin only
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
            Organization setup
          </h1>
        </div>
      </div>

      <ScreenPanel>
        <div className="mb-5 flex flex-wrap items-center gap-3">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "screen-tab rounded-full border-2 px-5 py-2.5 text-sm font-medium transition",
                activeTab === tab.id
                  ? "border-white/80 bg-white/5 text-white"
                  : "border-transparent text-slate-400 hover:border-white/20 hover:text-white"
              )}
            >
              {tab.label}
            </button>
          ))}

          <button
            type="button"
            onClick={openCreateForm}
            className="screen-action ml-auto inline-flex items-center gap-2 rounded-full border-2 px-5 py-2.5 text-sm font-semibold transition hover:bg-emerald-500/10"
          >
            <Plus className="size-4" />
            Add
          </button>
        </div>

        {activeTab === "departments" && (
          <DataTable
            columns={["Department", "Head", "Parent Dept", "Status"]}
            isEmpty={data.departments.length === 0}
            emptyMessage="No departments yet. Use + Add to create your first department."
          >
            {data.departments.map((department) => (
              <tr
                key={department.id}
                className="cursor-pointer border-b border-white/10 transition hover:bg-white/5"
                onClick={() => openDepartmentEdit(department)}
              >
                <td className="px-4 py-4 font-medium text-white">
                  {department.name}
                </td>
                <td className="px-4 py-4 text-slate-300">{department.head}</td>
                <td className="px-4 py-4 text-slate-300">
                  {department.parentDept || "—"}
                </td>
                <td className="px-4 py-4">
                  <StatusBadge
                    label={department.status}
                    tone={
                      department.status === "active" ? "success" : "neutral"
                    }
                  />
                </td>
              </tr>
            ))}
          </DataTable>
        )}

        {activeTab === "categories" && (
          <DataTable
            columns={["Category", "Description", "Status"]}
            isEmpty={data.categories.length === 0}
            emptyMessage="No categories yet. Use + Add to create your first category."
          >
            {data.categories.map((category) => (
              <tr
                key={category.id}
                className="cursor-pointer border-b border-white/10 transition hover:bg-white/5"
                onClick={() => openCategoryEdit(category)}
              >
                <td className="px-4 py-4 font-medium text-white">
                  {category.name}
                </td>
                <td className="px-4 py-4 text-slate-300">
                  {category.description || "—"}
                </td>
                <td className="px-4 py-4">
                  <StatusBadge
                    label={category.status}
                    tone={category.status === "active" ? "success" : "neutral"}
                  />
                </td>
              </tr>
            ))}
          </DataTable>
        )}

        {activeTab === "employee" && (
          <DataTable
            columns={["Employee", "Department", "Role", "Status"]}
            isEmpty={data.employees.length === 0}
            emptyMessage="No employees yet. Use + Add to create your first employee."
          >
            {data.employees.map((employee) => (
              <tr
                key={employee.id}
                className="cursor-pointer border-b border-white/10 transition hover:bg-white/5"
                onClick={() => openEmployeeEdit(employee)}
              >
                <td className="px-4 py-4 font-medium text-white">
                  {employee.name}
                </td>
                <td className="px-4 py-4 text-slate-300">
                  {departmentNameById.get(employee.departmentId) ?? "—"}
                </td>
                <td className="px-4 py-4 text-slate-300">
                  {employee.role || "—"}
                </td>
                <td className="px-4 py-4">
                  <StatusBadge
                    label={employee.status}
                    tone={employee.status === "active" ? "success" : "neutral"}
                  />
                </td>
              </tr>
            ))}
          </DataTable>
        )}

        {activeTab === "departments" && (
          <p className="mt-5 text-sm text-slate-400">
            Editing a department here also drives the picklist in Screen 4 &amp;
            5.
          </p>
        )}
      </ScreenPanel>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full border-white/10 bg-[#0b1018] text-slate-100 sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="text-white">{sheetTitle}</SheetTitle>
            <SheetDescription className="text-slate-400">
              {activeTab === "departments"
                ? "Create or update departments used across asset workflows."
                : activeTab === "categories"
                  ? "Manage asset categories for registration and filtering."
                  : "Maintain employee records linked to departments."}
            </SheetDescription>
          </SheetHeader>

          {activeTab === "departments" && (
            <form
              className="flex flex-col gap-4 px-4"
              onSubmit={handleDepartmentSubmit}
            >
              <FormField label="Department">
                <input
                  className={formControlClass}
                  value={departmentForm.name}
                  onChange={(event) =>
                    setDepartmentForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  required
                />
              </FormField>
              <FormField label="Head">
                <input
                  className={formControlClass}
                  value={departmentForm.head}
                  onChange={(event) =>
                    setDepartmentForm((current) => ({
                      ...current,
                      head: event.target.value,
                    }))
                  }
                  required
                />
              </FormField>
              <FormField label="Parent Dept">
                <select
                  className={formControlClass}
                  value={departmentForm.parentDept}
                  onChange={(event) =>
                    setDepartmentForm((current) => ({
                      ...current,
                      parentDept: event.target.value,
                    }))
                  }
                >
                  <option value="">—</option>
                  {data.departments
                    .filter((item) => item.id !== departmentForm.id)
                    .map((department) => (
                      <option key={department.id} value={department.name}>
                        {department.name}
                      </option>
                    ))}
                </select>
              </FormField>
              <FormField label="Status">
                <select
                  className={formControlClass}
                  value={departmentForm.status}
                  onChange={(event) =>
                    setDepartmentForm((current) => ({
                      ...current,
                      status: event.target.value as EntityStatus,
                    }))
                  }
                >
                  {ENTITY_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </FormField>
              <SheetFooter className="px-0">
                {departmentForm.id ? (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDelete}
                  >
                    Delete
                  </Button>
                ) : null}
                <Button type="submit">Save department</Button>
              </SheetFooter>
            </form>
          )}

          {activeTab === "categories" && (
            <form
              className="flex flex-col gap-4 px-4"
              onSubmit={handleCategorySubmit}
            >
              <FormField label="Category">
                <input
                  className={formControlClass}
                  value={categoryForm.name}
                  onChange={(event) =>
                    setCategoryForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  required
                />
              </FormField>
              <FormField label="Description">
                <input
                  className={formControlClass}
                  value={categoryForm.description}
                  onChange={(event) =>
                    setCategoryForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                />
              </FormField>
              <FormField label="Status">
                <select
                  className={formControlClass}
                  value={categoryForm.status}
                  onChange={(event) =>
                    setCategoryForm((current) => ({
                      ...current,
                      status: event.target.value as EntityStatus,
                    }))
                  }
                >
                  {ENTITY_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </FormField>
              <SheetFooter className="px-0">
                {categoryForm.id ? (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDelete}
                  >
                    Delete
                  </Button>
                ) : null}
                <Button type="submit">Save category</Button>
              </SheetFooter>
            </form>
          )}

          {activeTab === "employee" && (
            <form
              className="flex flex-col gap-4 px-4"
              onSubmit={handleEmployeeSubmit}
            >
              <FormField label="Employee">
                <input
                  className={formControlClass}
                  value={employeeForm.name}
                  onChange={(event) =>
                    setEmployeeForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  required
                />
              </FormField>
              <FormField label="Department">
                <select
                  className={formControlClass}
                  value={employeeForm.departmentId}
                  onChange={(event) =>
                    setEmployeeForm((current) => ({
                      ...current,
                      departmentId: event.target.value,
                    }))
                  }
                  required
                >
                  <option value="">Select department</option>
                  {data.departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Role">
                <input
                  className={formControlClass}
                  value={employeeForm.role}
                  onChange={(event) =>
                    setEmployeeForm((current) => ({
                      ...current,
                      role: event.target.value,
                    }))
                  }
                />
              </FormField>
              <FormField label="Status">
                <select
                  className={formControlClass}
                  value={employeeForm.status}
                  onChange={(event) =>
                    setEmployeeForm((current) => ({
                      ...current,
                      status: event.target.value as EntityStatus,
                    }))
                  }
                >
                  {ENTITY_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </FormField>
              <SheetFooter className="px-0">
                {employeeForm.id ? (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDelete}
                  >
                    Delete
                  </Button>
                ) : null}
                <Button type="submit">Save employee</Button>
              </SheetFooter>
            </form>
          )}
        </SheetContent>
      </Sheet>
    </section>
  );
}
