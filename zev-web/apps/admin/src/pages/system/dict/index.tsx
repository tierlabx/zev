import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@zev/ui/components/button";
import { Card } from "@zev/ui/components/card";
import { Input } from "@zev/ui/components/input";
import { Edit, Plus, Trash2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { useDebounce } from "use-debounce";
import {
	type DictData,
	type DictType,
	deleteDictData,
	deleteDictType,
	getDictDataList,
	getDictTypeList,
} from "@/api/system/dict";
import { ZevTable } from "@/components/zev-table";
import { useConfirm } from "@/hooks/use-confirm";
import { usePermission } from "@/hooks/use-permission";
import { useI18n } from "@/i18n";
import { DictDataFormDialog } from "./components/DictDataFormDialog";
import { DictTypeFormDialog } from "./components/DictTypeFormDialog";

export default function DictManagement() {
	const { t } = useI18n();
	const queryClient = useQueryClient();
	const { confirm, ConfirmDialog } = useConfirm();
	const { hasPermission } = usePermission();

	const [searchKeyword, setSearchKeyword] = useState("");
	const [debouncedKeyword] = useDebounce(searchKeyword, 300);

	// Selection state
	const [selectedDictType, setSelectedDictType] = useState<DictType | null>(null);

	// Dialog states
	const [isTypeDialogOpen, setIsTypeDialogOpen] = useState(false);
	const [editingDictType, setEditingDictType] = useState<DictType | null>(null);

	const [isDataDialogOpen, setIsDataDialogOpen] = useState(false);
	const [editingDictData, setEditingDictData] = useState<DictData | null>(null);

	// Queries
	const { data: typeData, isLoading: isTypeLoading } = useQuery({
		queryKey: ["dictTypes", debouncedKeyword],
		queryFn: () => getDictTypeList({ page: 1, pageSize: 1000, keyword: debouncedKeyword }),
	});

	const { data: dataData, isLoading: isDataLoading } = useQuery({
		queryKey: ["dictData"],
		queryFn: () => getDictDataList({ page: 1, pageSize: 1000 }),
	});

	// Mutations
	const deleteTypeMutation = useMutation({
		mutationFn: deleteDictType,
		onSuccess: () => {
			toast.success(t("dict.deleteTypeSuccess"));
			queryClient.invalidateQueries({ queryKey: ["dictTypes"] });
			if (selectedDictType) {
				setSelectedDictType(null);
			}
		},
		onError: (error: Error) => {
			toast.error(error.message || t("dict.deleteTypeFailed"));
		},
	});

	const deleteDataMutation = useMutation({
		mutationFn: deleteDictData,
		onSuccess: () => {
			toast.success(t("dict.deleteDataSuccess"));
			queryClient.invalidateQueries({ queryKey: ["dictData"] });
		},
		onError: (error: Error) => {
			toast.error(error.message || t("dict.deleteDataFailed"));
		},
	});

	// Handlers for Type
	const handleAddType = useCallback(() => {
		setEditingDictType(null);
		setIsTypeDialogOpen(true);
	}, []);

	const handleEditType = useCallback((e: React.MouseEvent, type: DictType) => {
		e.stopPropagation();
		setEditingDictType(type);
		setIsTypeDialogOpen(true);
	}, []);

	const handleDeleteType = useCallback(
		(e: React.MouseEvent, id: number) => {
			e.stopPropagation();
			confirm(t("dict.deleteTypeConfirm"), () => {
				deleteTypeMutation.mutate(id);
			});
		},
		[deleteTypeMutation, confirm, t],
	);

	// Handlers for Data
	const handleAddData = useCallback(() => {
		if (!selectedDictType) {
			toast.error(t("dict.selectTypeFirst"));
			return;
		}
		setEditingDictData(null);
		setIsDataDialogOpen(true);
	}, [selectedDictType, t]);

	const handleEditData = useCallback((data: DictData) => {
		setEditingDictData(data);
		setIsDataDialogOpen(true);
	}, []);

	const handleDeleteData = useCallback(
		(id: number) => {
			confirm(t("dict.deleteDataConfirm"), () => {
				deleteDataMutation.mutate(id);
			});
		},
		[deleteDataMutation, confirm, t],
	);

	const dictTypes = typeData?.list || [];
	// Filter dict data by selected dict type
	const dictDataList = useMemo(() => {
		if (!selectedDictType || !dataData?.list) return [];
		return dataData.list.filter((d) => d.dict_type === selectedDictType.type);
	}, [selectedDictType, dataData]);

	// Columns
	const typeColumns = useMemo<ColumnDef<DictType>[]>(
		() => [
			{
				accessorKey: "name",
				header: t("dict.name"),
			},
			{
				accessorKey: "type",
				header: t("dict.type"),
			},
			{
				id: "actions",
				header: () => <div className="text-right">{t("common.actions")}</div>,
				cell: ({ row }) => (
					<div className="flex justify-end space-x-2">
						{hasPermission("system:dict:update") && (
							<Button
								variant="outline"
								size="icon"
								onClick={(e) => handleEditType(e, row.original)}
								title={t("common.edit")}
							>
								<Edit className="h-4 w-4" />
							</Button>
						)}
						{hasPermission("system:dict:delete") && (
							<Button
								variant="destructive"
								size="icon"
								onClick={(e) => handleDeleteType(e, row.original.ID)}
								title={t("common.delete")}
							>
								<Trash2 className="h-4 w-4" />
							</Button>
						)}
					</div>
				),
			},
		],
		[handleEditType, handleDeleteType, hasPermission, t],
	);

	const dataColumns = useMemo<ColumnDef<DictData>[]>(
		() => [
			{
				accessorKey: "label",
				header: t("dict.label"),
			},
			{
				accessorKey: "value",
				header: t("dict.value"),
			},
			{
				accessorKey: "sort",
				header: t("common.sort"),
			},
			{
				accessorKey: "status",
				header: t("common.status"),
				cell: ({ row }) => (
					<span
						className={
							row.original.status === 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
						}
					>
						{row.original.status === 0 ? t("common.normal") : t("common.stopped")}
					</span>
				),
			},
			{
				id: "actions",
				header: () => <div className="text-right">{t("common.actions")}</div>,
				cell: ({ row }) => (
					<div className="flex justify-end space-x-2">
						{hasPermission("system:dict:update") && (
							<Button
								variant="outline"
								size="icon"
								onClick={() => handleEditData(row.original)}
								title={t("common.edit")}
							>
								<Edit className="h-4 w-4" />
							</Button>
						)}
						{hasPermission("system:dict:delete") && (
							<Button
								variant="destructive"
								size="icon"
								onClick={() => handleDeleteData(row.original.ID)}
								title={t("common.delete")}
							>
								<Trash2 className="h-4 w-4" />
							</Button>
						)}
					</div>
				),
			},
		],
		[handleEditData, handleDeleteData, hasPermission, t],
	);

	return (
		<div className="flex flex-col h-full space-y-4">
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
				{/* Left Panel: Dict Types */}
				<Card className="col-span-1 rounded-md shadow-sm border p-4 flex flex-col">
					<div className="flex items-center justify-between mb-4">
						<h2 className="text-lg font-semibold">{t("dict.typeTitle")}</h2>
						{hasPermission("system:dict:create") && (
							<Button onClick={handleAddType} size="sm">
								<Plus className="mr-2 h-4 w-4" />
								{t("dict.addType")}
							</Button>
						)}
					</div>
					<div className="mb-4">
						<Input
							placeholder={t("dict.searchTypePlaceholder")}
							value={searchKeyword}
							onChange={(e) => setSearchKeyword(e.target.value)}
						/>
					</div>
					<div className="flex-1 min-h-0">
						<ZevTable
							columns={typeColumns}
							data={dictTypes}
							isLoading={isTypeLoading}
							containerHeight="calc(100vh - 330px)"
							onRowClick={(row) => setSelectedDictType(row)}
							className="border-border"
							pagination={false}
							showToolbar={false}
						/>
					</div>
				</Card>

				{/* Right Panel: Dict Data */}
				<Card className="col-span-1 md:col-span-2 rounded-md shadow-sm border p-4 flex flex-col">
					<div className="flex items-center justify-between mb-4">
						<h2 className="text-lg font-semibold">
							{t("dict.dataTitle")}{" "}
							{selectedDictType && <span className="text-primary text-sm ml-2">({selectedDictType.name})</span>}
						</h2>
						{hasPermission("system:dict:create") && (
							<Button onClick={handleAddData} size="sm" disabled={!selectedDictType}>
								<Plus className="mr-2 h-4 w-4" />
								{t("dict.addData")}
							</Button>
						)}
					</div>
					<div className="flex-1 min-h-0">
						{selectedDictType ? (
							<ZevTable
								columns={dataColumns}
								data={dictDataList}
								isLoading={isDataLoading}
								containerHeight="calc(100vh - 280px)"
								className="border-border"
								pagination={false}
								showToolbar={false}
							/>
						) : (
							<div className="h-[calc(100vh-280px)] flex items-center justify-center border border-dashed border-border rounded-md text-muted-foreground">
								{t("dict.selectTypePrompt")}
							</div>
						)}
					</div>
				</Card>
			</div>

			<DictTypeFormDialog
				open={isTypeDialogOpen}
				onOpenChange={setIsTypeDialogOpen}
				editingDictType={editingDictType}
				onSuccess={() => queryClient.invalidateQueries({ queryKey: ["dictTypes"] })}
			/>

			{selectedDictType && (
				<DictDataFormDialog
					open={isDataDialogOpen}
					onOpenChange={setIsDataDialogOpen}
					editingDictData={editingDictData}
					dictType={selectedDictType.type}
					onSuccess={() => queryClient.invalidateQueries({ queryKey: ["dictData"] })}
				/>
			)}
			<ConfirmDialog />
		</div>
	);
}
