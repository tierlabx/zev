import request from "../request";

export interface SysNotice {
  id: number;
  CreatedAt: string;
  UpdatedAt: string;
  title: string;
  content: string;
  type: number;
  sender: string;
  receiver: string;
  status: number;
}

export const getNoticeList = () => {
  return request.get<SysNotice[]>("/system/notice/list");
};

export const markNoticeAsRead = (id: number) => {
  return request.put(`/system/notice/read/${id}`);
};
