import request from "../request";

export interface DictType {
	ID: number;
	CreatedAt: string;
	UpdatedAt: string;
	name: string;
	type: string;
	status: number;
	remark: string;
}

export interface DictData {
	ID: number;
	CreatedAt: string;
	UpdatedAt: string;
	dict_type: string;
	label: string;
	value: string;
	sort: number;
	status: number;
	remark: string;
}

export interface ListParams {
	page: number;
	pageSize: number;
}

export interface DictTypeListResponse {
	list: DictType[];
	total: number;
}

export interface DictDataListResponse {
	list: DictData[];
	total: number;
}

// ---- Dict Type ----
export const getDictTypeList = (params: ListParams) => {
	return request.get<DictTypeListResponse>("/system/dict/type/list", { params });
};

export const createDictType = (data: Partial<DictType>) => {
	return request.post("/system/dict/type/create", data);
};

export const updateDictType = (data: Partial<DictType>) => {
	return request.put("/system/dict/type/update", data);
};

export const deleteDictType = (id: number) => {
	return request.delete(`/system/dict/type/delete/${id}`);
};

// ---- Dict Data ----
export const getDictDataList = (params: ListParams) => {
	return request.get<DictDataListResponse>("/system/dict/data/list", { params });
};

export const createDictData = (data: Partial<DictData>) => {
	return request.post("/system/dict/data/create", data);
};

export const updateDictData = (data: Partial<DictData>) => {
	return request.put("/system/dict/data/update", data);
};

export const deleteDictData = (id: number) => {
	return request.delete(`/system/dict/data/delete/${id}`);
};
