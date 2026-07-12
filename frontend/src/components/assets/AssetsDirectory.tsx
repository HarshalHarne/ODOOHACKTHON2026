"use client";

import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";

import DataTable from "@/components/workspace/DataTable";
import FilterSelect from "@/components/workspace/FilterSelect";
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
import { deleteAsset, upsertAsset } from "@/lib/workspace/storage";
import type { Asset, AssetStatus } from "@/lib/workspace/types";
import { ASSET_STATUSES } from "@/lib/workspace/types";

type AssetFormState = {
  id?: string;
  tag: string;
  name: string;
  categoryId: string;
  status: AssetStatus;
  location: string;
  departmentId: string;
  serial: string;
  qrCode: string;
};

const emptyAssetForm: AssetFormState = {
  tag: "",
  name: "",
  categoryId: "",
  status: "available",
  location: "",
  departmentId: "",
  serial: "",
  qrCode: "",
};

function assetStatusTone(status: AssetStatus) {
  if (status === "available") {
    return "success" as const;
  }

  if (status === "maintenance") {
    return "warning" as const;
  }

  return "info" as const;
}

export default function AssetsDirectory() {
  const { data, refresh } = useWorkspaceData();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [assetForm, setAssetForm] = useState<AssetFormState>(emptyAssetForm);

  const categoryNameById = useMemo(
    () => new Map(data.categories.map((item) => [item.id, item.name])),
    [data.categories]
  );

  const departmentNameById = useMemo(
    () => new Map(data.departments.map((item) => [item.id, item.name])),
    [data.departments]
  );

  const filteredAssets = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return data.assets.filter((asset) => {
      const matchesSearch =
        query.length === 0 ||
        asset.tag.toLowerCase().includes(query) ||
        asset.serial.toLowerCase().includes(query) ||
        asset.qrCode.toLowerCase().includes(query);

      const matchesCategory =
        categoryFilter === "all" || asset.categoryId === categoryFilter;

      const matchesStatus =
        statusFilter === "all" || asset.status === statusFilter;

      const matchesDepartment =
        departmentFilter === "all" || asset.departmentId === departmentFilter;

      return (
        matchesSearch && matchesCategory && matchesStatus && matchesDepartment
      );
    });
  }, [
    categoryFilter,
    data.assets,
    departmentFilter,
    searchQuery,
    statusFilter,
  ]);

  const openCreateForm = () => {
    setAssetForm(emptyAssetForm);
    setSheetOpen(true);
  };

  const openAssetEdit = (asset: Asset) => {
    setAssetForm({
      id: asset.id,
      tag: asset.tag,
      name: asset.name,
      categoryId: asset.categoryId,
      status: asset.status,
      location: asset.location,
      departmentId: asset.departmentId,
      serial: asset.serial,
      qrCode: asset.qrCode,
    });
    setSheetOpen(true);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (
      !assetForm.tag.trim() ||
      !assetForm.name.trim() ||
      !assetForm.categoryId ||
      !assetForm.departmentId
    ) {
      return;
    }

    upsertAsset({
      id: assetForm.id,
      tag: assetForm.tag.trim(),
      name: assetForm.name.trim(),
      categoryId: assetForm.categoryId,
      status: assetForm.status,
      location: assetForm.location.trim(),
      departmentId: assetForm.departmentId,
      serial: assetForm.serial.trim(),
      qrCode: assetForm.qrCode.trim(),
    });

    notifyWorkspaceUpdated();
    refresh();
    setSheetOpen(false);
    setAssetForm(emptyAssetForm);
  };

  const handleDelete = () => {
    if (!assetForm.id) {
      return;
    }

    deleteAsset(assetForm.id);
    notifyWorkspaceUpdated();
    refresh();
    setSheetOpen(false);
    setAssetForm(emptyAssetForm);
  };

  return (
    <section>
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400">
          Asset directory
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
          Asset registrations and directory
        </h1>
      </div>

      <ScreenPanel>
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center">
          <label className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by tag, serial, or QR code.."
              className="screen-search h-12 w-full rounded-full border-2 border-white/20 bg-transparent pr-4 pl-11 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-emerald-400/70"
            />
          </label>

          <button
            type="button"
            onClick={openCreateForm}
            className="screen-action inline-flex items-center justify-center gap-2 rounded-full border-2 px-5 py-3 text-sm font-semibold transition hover:bg-emerald-500/10"
          >
            <Plus className="size-4" />
            Register Asset
          </button>
        </div>

        <div className="mb-5 flex flex-wrap gap-4">
          <FilterSelect
            label="Category"
            value={categoryFilter}
            onChange={setCategoryFilter}
            options={[
              { label: "All categories", value: "all" },
              ...data.categories.map((category) => ({
                label: category.name,
                value: category.id,
              })),
            ]}
          />
          <FilterSelect
            label="Status"
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { label: "All statuses", value: "all" },
              ...ASSET_STATUSES.map((status) => ({
                label: status,
                value: status,
              })),
            ]}
          />
          <FilterSelect
            label="Department"
            value={departmentFilter}
            onChange={setDepartmentFilter}
            options={[
              { label: "All departments", value: "all" },
              ...data.departments.map((department) => ({
                label: department.name,
                value: department.id,
              })),
            ]}
          />
        </div>

        <DataTable
          columns={["Tag", "Name", "Category", "Status", "Location"]}
          isEmpty={filteredAssets.length === 0}
          emptyMessage={
            data.assets.length === 0
              ? "No assets registered yet. Use + Register Asset to add your first asset."
              : "No assets match the current search or filters."
          }
        >
          {filteredAssets.map((asset) => (
            <tr
              key={asset.id}
              className="cursor-pointer border-b border-white/10 transition hover:bg-white/5"
              onClick={() => openAssetEdit(asset)}
            >
              <td className="px-4 py-4 font-medium text-white">{asset.tag}</td>
              <td className="px-4 py-4 text-slate-300">{asset.name}</td>
              <td className="px-4 py-4 text-slate-300">
                {categoryNameById.get(asset.categoryId) ?? "—"}
              </td>
              <td className="px-4 py-4">
                <StatusBadge
                  label={asset.status}
                  tone={assetStatusTone(asset.status)}
                />
              </td>
              <td className="px-4 py-4 text-slate-300">
                {asset.location || "—"}
              </td>
            </tr>
          ))}
        </DataTable>
      </ScreenPanel>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full border-white/10 bg-[#0b1018] text-slate-100 sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="text-white">
              {assetForm.id ? "Edit asset" : "Register asset"}
            </SheetTitle>
            <SheetDescription className="text-slate-400">
              Register assets with tag, category, department, and tracking
              identifiers.
            </SheetDescription>
          </SheetHeader>

          <form className="flex flex-col gap-4 px-4" onSubmit={handleSubmit}>
            <FormField label="Tag">
              <input
                className={formControlClass}
                value={assetForm.tag}
                onChange={(event) =>
                  setAssetForm((current) => ({
                    ...current,
                    tag: event.target.value,
                  }))
                }
                required
              />
            </FormField>
            <FormField label="Name">
              <input
                className={formControlClass}
                value={assetForm.name}
                onChange={(event) =>
                  setAssetForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                required
              />
            </FormField>
            <FormField label="Category">
              <select
                className={formControlClass}
                value={assetForm.categoryId}
                onChange={(event) =>
                  setAssetForm((current) => ({
                    ...current,
                    categoryId: event.target.value,
                  }))
                }
                required
              >
                <option value="">Select category</option>
                {data.categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Status">
              <select
                className={formControlClass}
                value={assetForm.status}
                onChange={(event) =>
                  setAssetForm((current) => ({
                    ...current,
                    status: event.target.value as AssetStatus,
                  }))
                }
              >
                {ASSET_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Location">
              <input
                className={formControlClass}
                value={assetForm.location}
                onChange={(event) =>
                  setAssetForm((current) => ({
                    ...current,
                    location: event.target.value,
                  }))
                }
              />
            </FormField>
            <FormField label="Department">
              <select
                className={formControlClass}
                value={assetForm.departmentId}
                onChange={(event) =>
                  setAssetForm((current) => ({
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
            <FormField label="Serial">
              <input
                className={formControlClass}
                value={assetForm.serial}
                onChange={(event) =>
                  setAssetForm((current) => ({
                    ...current,
                    serial: event.target.value,
                  }))
                }
              />
            </FormField>
            <FormField label="QR code">
              <input
                className={formControlClass}
                value={assetForm.qrCode}
                onChange={(event) =>
                  setAssetForm((current) => ({
                    ...current,
                    qrCode: event.target.value,
                  }))
                }
              />
            </FormField>

            <SheetFooter className="px-0">
              {assetForm.id ? (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                >
                  Delete
                </Button>
              ) : null}
              <Button type="submit">
                {assetForm.id ? "Save asset" : "Register asset"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </section>
  );
}
