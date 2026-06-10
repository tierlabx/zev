import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@zev/ui/components/button";
import { Card } from "@zev/ui/components/card";
import { Edit, Plus, Trash2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import {
	type DictData,
	type DictType,
	deleteDictData,
	deleteDictType,
	getDictDataList,
	getDictTypeList,
} from "@/api/system/dict";
import { ZevTable } from "@/components/zev-table";
import { DictDataFormDialog } from "./components/DictDataFormDialog";
import { DictTypeFormDialog } from "./components/DictTypeFormDialog";

export default function DictManagement() {
	const queryClient = useQueryClient();

	// Selection state
	const [selectedDictType, setSelectedDictType] = useState<DictType | null>(null);

	// Dialog states
	const [isTypeDialogOpen, setIsTypeDialogOpen] = useState(false);
	const [editingDictType, setEditingDictType] = useState<DictType | null>(null);

	const [isDataDialogOpen, setIsDataDialogOpen] = useState(false);
	const [editingDictData, setEditingDictData] = useState<DictData | null>(null);

	// Queries
	const { data: typeData, isLoading: isTypeLoading } = useQuery({
		queryKey: ["dictTypes"],
		queryFn: () => getDictTypeList({ page: 1, pageSize: 1000 }),
	});

	const { data: dataData, isLoading: isDataLoading } = useQuery({
		queryKey: ["dictData"],
		queryFn: () => getDictDataList({ page: 1, pageSize: 1000 }),
	});

	// Mutations
	const deleteTypeMutation = useMutation({
		mutationFn: deleteDictType,
		onSuccess: () => {
			toast.success("字典类型删除成功");
			queryClient.invalidateQueries({ queryKey: ["dictTypes"] });
			if (selectedDictType) {
				setSelectedDictType(null);
			}
		},
		onError: (error: Error) => {
			toast.error(error.message || "删除字典类型失败");
		},
	});

	const deleteDataMutation = useMutation({
		mutationFn: deleteDictData,
		onSuccess: () => {
			toast.success("字典数据删除成功");
			queryClient.invalidateQueries({ queryKey: ["dictData"] });
		},
		onError: (error: Error) => {
			toast.error(error.message || "删除字典数据失败");
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
			if (window.confirm("确定要删除此字典类型吗？同时也会删除关联的字典数据")) {
				deleteTypeMutation.mutate(id);
			}
		},
		[deleteTypeMutation],
	);

	// Handlers for Data
	const handleAddData = useCallback(() => {
		if (!selectedDictType) {
			toast.error("请先选择一个字典类型");
			return;
		}
		setEditingDictData(null);
		setIsDataDialogOpen(true);
	}, [selectedDictType]);

	const handleEditData = useCallback((data: DictData) => {
		setEditingDictData(data);
		setIsDataDialogOpen(true);
	}, []);

	const handleDeleteData = useCallback(
		(id: number) => {
			if (window.confirm("确定要删除此字典数据吗？")) {
				deleteDataMutation.mutate(id);
			}
		},
		[deleteDataMutation],
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
				header: "字典名称",
			},
			{
				accessorKey: "type",
				header: "字典类型",
			},
			{
				id: "actions",
				header: () => <div className="text-right">操作</div>,
				cell: ({ row }) => (
					<div className="flex justify-end space-x-2">
						<Button variant="outline" size="icon" onClick={(e) => handleEditType(e, row.original)} title="编辑">
							<Edit className="h-4 w-4" />
						</Button>
						<Button
							variant="destructive"
							size="icon"
							onClick={(e) => handleDeleteType(e, row.original.ID)}
							title="删除"
						>
							<Trash2 className="h-4 w-4" />
						</Button>
					</div>
				),
			},
		],
		[handleEditType, handleDeleteType],
	);

	const dataColumns = useMemo<ColumnDef<DictData>[]>(
		() => [
			{
				accessorKey: "label",
				header: "数据标签",
			},
			{
				accessorKey: "value",
				header: "数据键值",
			},
			{
				accessorKey: "sort",
				header: "排序",
			},
			{
				accessorKey: "status",
				header: "状态",
				cell: ({ row }) => (
					<span className={row.original.status === 0 ? "text-green-600" : "text-red-600"}>
						{row.original.status === 0 ? "正常" : "停用"}
					</span>
				),
			},
			{
				id: "actions",
				header: () => <div className="text-right">操作</div>,
				cell: ({ row }) => (
					<div className="flex justify-end space-x-2">
						<Button variant="outline" size="icon" onClick={() => handleEditData(row.original)} title="编辑">
							<Edit className="h-4 w-4" />
						</Button>
						<Button variant="destructive" size="icon" onClick={() => handleDeleteData(row.original.ID)} title="删除">
							<Trash2 className="h-4 w-4" />
						</Button>
					</div>
				),
			},
		],
		[handleEditData, handleDeleteData],
	);

	return (
		<div className="flex flex-col h-full space-y-4">
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
				{/* Left Panel: Dict Types */}
				<Card className="col-span-1 rounded-md shadow-sm border p-4 flex flex-col">
					<div className="flex items-center justify-between mb-4">
						<h2 className="text-lg font-semibold">字典类型</h2>
						<Button onClick={handleAddType} size="sm">
							<Plus className="mr-2 h-4 w-4" />
							添加类型
						</Button>
					</div>
					<div className="flex-1 min-h-0">
						<ZevTable
							columns={typeColumns}
							data={dictTypes}
							isLoading={isTypeLoading}
							containerHeight="calc(100vh - 200px)"
							onRowClick={(row) => setSelectedDictType(row)}
							className="border-gray-200"
						/>
					</div>
				</Card>

				{/* Right Panel: Dict Data */}
				<Card className="col-span-1 md:col-span-2 rounded-md shadow-sm border p-4 flex flex-col">
					<div className="flex items-center justify-between mb-4">
						<h2 className="text-lg font-semibold">
							字典数据{" "}
							{selectedDictType && <span className="text-[#1677FF] text-sm ml-2">({selectedDictType.name})</span>}
						</h2>
						<Button onClick={handleAddData} size="sm" disabled={!selectedDictType}>
							<Plus className="mr-2 h-4 w-4" />
							添加数据
						</Button>
					</div>
					<div className="flex-1 min-h-0">
						{selectedDictType ? (
							<ZevTable
								columns={dataColumns}
								data={dictDataList}
								isLoading={isDataLoading}
								containerHeight="calc(100vh - 200px)"
								className="border-gray-200"
							/>
						) : (
							<div className="h-[calc(100vh-200px)] flex items-center justify-center border border-dashed rounded-md text-gray-400">
								请在左侧选择一个字典类型
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
		</div>
	);
}
